import argparse
import os
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit
from azure_config import load_azure_config

ROOT = Path(__file__).resolve().parents[4]
RUNTIME = ROOT / ".runtime"
SERVER_MARKER = "ieee.main:create_app"


def read_env() -> dict:
    env = dict(os.environ)
    path = ROOT / ".env"
    if not path.exists():
        raise RuntimeError("Run ./create-env.sh --profile sample-app-02 first.")
    for line in path.read_text().splitlines():
        if line.strip() and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip("\"'")
    origin = urlsplit(env.get("APP_ORIGIN", ""))
    if (env.get("APP_PROFILE") != "sample-app-02" or env.get("SERVER_PORT") != "8300"
            or origin.scheme not in {"http", "https"} or not origin.hostname
            or not (origin.port == 5300 or (env.get("APP_ACCESS_MODE") == "external"
                    and origin.scheme == "https" and origin.port == 8443 and origin.hostname.endswith(".ts.net")))
            or origin.username or origin.password or origin.path or origin.query or origin.fragment):
        raise RuntimeError("This script requires the sample-app-02 profile with server port 8300 and UI port 5300.")
    load_azure_config(env)
    return env


def public_process_env(env: dict) -> dict:
    secrets = {"AZURE_OPENAI_API_KEY", "OIDC_CLIENT_SECRET", "DATABASE_PASSWORD"}
    return {key: value for key, value in env.items() if key not in secrets}


def server_command() -> list:
    # "--project" keeps the current directory, so ".runtime/" resolves at the repository root.
    # "--locked --no-sync" uses the environment from setup and never changes it.
    return ["uv", "run", "--locked", "--no-sync", "--project", str(ROOT / "server"), "uvicorn", SERVER_MARKER, "--factory",
            "--host", "0.0.0.0", "--port", "8300"]


def server_env(env: dict) -> dict:
    result = dict(env)
    result.setdefault("DATABASE_URL", f"sqlite:///{RUNTIME / 'ieee.db'}")
    return result


def start(name: str, command: list, env: dict, cwd: Path) -> None:
    with (RUNTIME / f"{name}.log").open("a") as log:
        process = subprocess.Popen(command, cwd=cwd, env=env, stdout=log, stderr=log, start_new_session=True)
    (RUNTIME / f"{name}.pid").write_text(str(process.pid))


def stop(name: str) -> None:
    path = RUNTIME / f"{name}.pid"
    if not path.exists():
        return
    pid = int(path.read_text())
    try:
        command = subprocess.run(["ps", "-p", str(pid), "-o", "command="], capture_output=True, text=True, check=False).stdout
        marker = {"server": SERVER_MARKER, "ui": "npm run dev", "authentik": "authentik_forwarder.py"}[name]
        if command.strip():
            if marker not in command:
                raise RuntimeError(f"Refuse to stop process {pid}: it does not match this application.")
            process_cwd = Path(f"/proc/{pid}/cwd")
            if process_cwd.exists():
                actual_cwd = str(process_cwd.resolve())
            else:
                output = subprocess.run(["lsof", "-a", "-p", str(pid), "-d", "cwd", "-Fn"],
                                        capture_output=True, text=True, check=False).stdout
                actual_cwd = next((line[1:] for line in output.splitlines() if line.startswith("n")), "")
            expected_cwd = ROOT / "ui" if name == "ui" else ROOT
            if actual_cwd != str(expected_cwd):
                raise RuntimeError(f"Refuse to stop process {pid}: its directory does not match this application.")
        os.killpg(pid, signal.SIGTERM)
        for _ in range(40):
            try:
                os.kill(pid, 0)
            except ProcessLookupError:
                break
            time.sleep(0.25)
    except ProcessLookupError:
        pass
    path.unlink(missing_ok=True)


def wait_for(url: str, accept_unauthorized: bool = False) -> None:
    for _ in range(60):
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if response.status == 200:
                    return
        except urllib.error.HTTPError as error:
            if accept_unauthorized and error.code == 401:
                return
        except (urllib.error.URLError, TimeoutError):
            pass
        time.sleep(0.5)
    raise RuntimeError(f"The service did not start. Check {RUNTIME} for logs.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Start or stop this application's processes.")
    parser.add_argument("--profile", required=True, choices=["sample-app-02"])
    parser.add_argument("--stop", action="store_true")
    args = parser.parse_args()
    RUNTIME.mkdir(exist_ok=True)
    if args.stop:
        stop("ui")
        stop("server")
        stop("authentik")
        print("Stopped the sample-app-02 processes.")
        return
    env = read_env()
    for port in (8300, 5300, 9300):
        with socket.socket() as sock:
            if sock.connect_ex(("127.0.0.1", port)) == 0:
                raise RuntimeError(f"Port {port} is occupied. Stop this application before a restart.")
    try:
        start("authentik", [sys.executable, str(ROOT / "scripts/src/main/nix/authentik_forwarder.py")],
              public_process_env(env), ROOT)
        wait_for("http://127.0.0.1:9300/application/o/sample-app-02/.well-known/openid-configuration")
        # The public issuer uses the Vite proxy. It must exist before OIDC discovery.
        external = env.get("APP_ACCESS_MODE") == "external"
        if external:
            start("ui", ["npm", "run", "dev"], public_process_env(env), ROOT / "ui")
            wait_for("http://127.0.0.1:5300")
        start("server", server_command(), server_env(env), ROOT)
        wait_for("http://127.0.0.1:8300/api/session", True)
        if not external:
            start("ui", ["npm", "run", "dev"], public_process_env(env), ROOT / "ui")
            wait_for("http://127.0.0.1:5300")
    except Exception:
        stop("ui")
        stop("server")
        stop("authentik")
        raise
    print(f"IEEE Workspace is ready at {env['APP_ORIGIN']}")
    print("Logs: .runtime/server.log and .runtime/ui.log")


if __name__ == "__main__":
    main()
