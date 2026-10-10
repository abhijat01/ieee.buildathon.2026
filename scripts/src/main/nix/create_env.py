import argparse
import os
import subprocess
from pathlib import Path
from provision_authentik import provision

ROOT = Path(__file__).resolve().parents[4]


def server_commands() -> list:
    # uv builds the exact locked environment. A stale uv.lock stops setup.
    project = str(ROOT / "server")
    return [["uv", "sync", "--locked", "--python", "3.12", "--project", project]]


def main() -> None:
    parser = argparse.ArgumentParser(description="Set up the IEEE Workspace environment.")
    parser.add_argument("--profile", required=True, choices=["sample-app-02"])
    args = parser.parse_args()
    runtime = ROOT / ".runtime"
    runtime.mkdir(exist_ok=True)
    env_path = ROOT / ".env"
    if env_path.exists():
        values = dict(line.split("=", 1) for line in env_path.read_text().splitlines()
                      if line.strip() and not line.lstrip().startswith("#"))
        if values.get("APP_PROFILE") != args.profile:
            raise RuntimeError("The existing environment belongs to another profile.")
        provision(values.get("APP_ORIGIN", "http://localhost:5300").strip().strip("\"'"))
        print("Keep the existing .env file.")
    else:
        config = provision()
        text = (ROOT / ".env.example").read_text().replace("OIDC_CLIENT_SECRET=\n", "OIDC_CLIENT_SECRET=" + config["client_secret"] + "\n")
        descriptor = os.open(env_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w") as output:
            output.write(text)
        print("Created the dedicated authentik client and the private .env file.")
    subprocess.run(["npm", "ci"], cwd=ROOT / "ui", check=True)
    for command in server_commands():
        subprocess.run(command, cwd=ROOT, check=True)
    print(f"Environment ready for {args.profile}. Azure model settings come from ~/.agent.config/deployment.ini at startup.")


if __name__ == "__main__":
    main()
