"""Switch only sample-app-02 between LAN access and a public conference demo."""
import argparse
import json
import os
import subprocess
from pathlib import Path
from urllib.parse import urlsplit
from provision_authentik import provision

ROOT = Path(__file__).resolve().parents[4]
PORT = 8443
TARGET = "http://127.0.0.1:5300"


class DemoAccess:
    def command(self, *args: str, capture: bool = False) -> str:
        result = subprocess.run(list(args), cwd=ROOT, check=True, text=True,
                                stdout=subprocess.PIPE if capture else None)
        return result.stdout or ""

    def config(self) -> dict:
        return json.loads(self.command("tailscale", "serve", "status", "--json", capture=True))

    def check_route(self, config: dict, hostname: str) -> None:
        handlers = config.get("Web", {}).get(f"{hostname}:{PORT}", {}).get("Handlers", {})
        tcp = config.get("TCP", {}).get(str(PORT))
        if tcp and (tcp != {"HTTPS": True} or handlers != {"/": {"Proxy": TARGET}}):
            raise RuntimeError(f"Port {PORT} belongs to another service. No changes were made.")

    def owns_route(self, config: dict, hostname: str) -> bool:
        """Return True only when the route on PORT is this application's route."""
        handlers = config.get("Web", {}).get(f"{hostname}:{PORT}", {}).get("Handlers", {})
        return handlers == {"/": {"Proxy": TARGET}}

    def write_env(self, updates: dict) -> None:
        path = ROOT / ".env"
        lines = path.read_text().splitlines()
        remaining = dict(updates)
        for index, line in enumerate(lines):
            key = line.split("=", 1)[0].strip()
            if key in remaining:
                lines[index] = key + "=" + remaining.pop(key)
        lines.extend(key + "=" + value for key, value in remaining.items())
        temporary = path.with_name(".env.access.tmp")
        descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(descriptor, "w") as output:
            output.write("\n".join(lines) + "\n")
        temporary.replace(path)

    def switch(self, mode: str, internal_origin: str | None) -> None:
        values = dict(line.split("=", 1) for line in (ROOT / ".env").read_text().splitlines()
                      if line.strip() and not line.lstrip().startswith("#"))
        if values.get("APP_PROFILE") != "sample-app-02":
            raise RuntimeError("The environment belongs to another profile.")
        state = json.loads(self.command("tailscale", "status", "--json", capture=True))
        hostname = state["Self"]["DNSName"].rstrip(".")
        if mode == "external":
            self.check_route(self.config(), hostname)
        runtime = ROOT / ".runtime"
        runtime.mkdir(exist_ok=True)
        saved = runtime / "internal-origin.txt"
        if internal_origin:
            parsed = urlsplit(internal_origin)
            if parsed.scheme != "http" or parsed.port != 5300 or not parsed.hostname or parsed.path or parsed.query or parsed.fragment or parsed.username:
                raise RuntimeError("Internal origin must be http://HOST:5300 with no path.")
            saved.write_text(internal_origin)
        elif values.get("APP_ACCESS_MODE") != "external":
            saved.write_text(values["APP_ORIGIN"].strip("\"'"))
        origin = f"https://{hostname}:{PORT}" if mode == "external" else saved.read_text().strip()
        # Verify Funnel permission before changing the application environment.
        if mode == "external":
            self.command("tailscale", "funnel", "--bg", f"--https={PORT}", "--yes", TARGET)
        else:
            if self.owns_route(self.config(), hostname):
                self.command("tailscale", "funnel", f"--https={PORT}", "off")
        provision(origin)
        self.command(str(ROOT / "run-all.sh"), "--profile", "sample-app-02", "--stop")
        self.write_env({"APP_ORIGIN": origin, "APP_ACCESS_MODE": mode,
                        "COOKIE_SECURE": "true" if mode == "external" else "false",
                        "OIDC_ISSUER": (origin if mode == "external" else
                            f"http://{urlsplit(origin).hostname}:9300") + "/application/o/sample-app-02/"})
        self.command(str(ROOT / "run-all.sh"), "--profile", "sample-app-02")
        print(f"Access mode: {mode}. Open {origin}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["internal", "external", "status"])
    parser.add_argument("--internal-origin", help="LAN origin, for example http://10.1.1.242:5300")
    args = parser.parse_args()
    access = DemoAccess()
    if args.mode == "status":
        for line in (ROOT / ".env").read_text().splitlines():
            if line.startswith(("APP_ACCESS_MODE=", "APP_ORIGIN=")):
                print(line)
        access.command("tailscale", "funnel", "status")
    else:
        access.switch(args.mode, args.internal_origin)


if __name__ == "__main__":
    main()
