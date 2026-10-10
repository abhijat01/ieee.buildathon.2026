# Separate application instances

Use the `sample-app-02` profile for this application.
The UI binds to `0.0.0.0:5300`. The server binds to `0.0.0.0:8300`.
Both services accept connections on all IPv4 network interfaces.
The UI proxy uses the server's loopback address.
For LAN access, use the laptop's LAN address, for example `http://10.1.1.242:5300`.
Authentik uses the same LAN address on port 9300 for this application's OIDC issuer.
The authentik forwarder on port 9300 sends traffic to the shared authentik service on port 9010.
Set `APP_ORIGIN` and `OIDC_ISSUER` in `.env` when the LAN address changes.
Run setup to register the new callback before restarting this profile.
Authentik is a shared service at `http://localhost:9010`.
The dedicated authentik application and client use `sample-app-02`.

Run `./create-env.sh --profile sample-app-02` for setup.
Run `./run-all.sh --profile sample-app-02` for startup.
Run `./run-all.sh --profile sample-app-02 --stop` for shutdown.

The stop command checks each process before it stops the process group.
The server command must contain `ieee.main:create_app`. The server directory must be the repository root.
The stop command refuses a process from another repository, such as sample-app-01.

## Conference demo access

Use `./access.sh external` to enable public HTTPS access through Tailscale Funnel.
Use `./access.sh internal` to remove the public route and return to the saved LAN origin.
Use `./access.sh status` to inspect Tailscale routes.
When your LAN address changes, use `./access.sh internal --internal-origin http://HOST:5300`.

The script reserves HTTPS port 8443 on this machine's `.ts.net` hostname.
It preserves existing routes on other ports. It refuses to replace another service on port 8443.
Enable Funnel in the Tailscale administration page when the command asks.
External mode uses one origin for the UI, REST calls, and authentik login.
Vite proxies authentik paths before the Python server's `/api` route.
The script updates the dedicated OIDC callback, issuer, and secure cookie setting.
It restarts only this application. Sessions end when the server restarts.
The shared authentik service and other applications remain active.

Use the printed HTTPS URL on both your laptop and phone in external mode.
Disable Tailscale and Wi-Fi on the phone to verify public cellular access.
No `/etc/hosts` changes are required. Keep the laptop awake and connected during the demo.
External mode exposes the authentik web interface as well as this Vite development server.
Attendees need authentik accounts; this script does not enable public account creation.

Keep database files, logs, and process identifiers in `.runtime/`.
Do not stop shared containers or change another application's OIDC provider.
The setup script creates only this application's provider and application.
Use different ports, cookie names, database paths, and clients for another instance.

## Ports and names of the instances on this host

| Setting | sample-app-01 | sample-app-02 (this application) |
| --- | --- | --- |
| UI port | 5181 | 5300 |
| Server port | 8181 | 8300 |
| Authentik forwarder port | 9011 | 9300 |
| Tailscale Funnel HTTPS port | 10000 | 8443 |
| OIDC client and application slug | `sample-app-01` | `sample-app-02` |
| Session cookie | Set by sample-app-01 | `IEEE02_SESSION` |

Both instances use the shared authentik service on port 9010.
Do not change the settings of sample-app-01 from this repository.
