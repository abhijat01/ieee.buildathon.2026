# Internal and external demo access

This capability lets conference attendees access the demo on this laptop through Tailscale Funnel.
Vite remains the development UI server. Authentik provides login for both access modes.
Track this capability in this repository's GitHub issues.

## Select an access mode

Run these commands from the repository root:

```bash
./access.sh external
./access.sh internal
./access.sh status
```

| Mode | Browser URL | Access |
| --- | --- | --- |
| External | `https://HOSTNAME.ts.net:8443/`, where `HOSTNAME` is this laptop's Tailscale name | Public internet; no Tailscale client required |
| Internal | Saved LAN origin, for example `http://10.1.1.242:5300` | Devices that can reach the laptop's LAN address |

Use the script's printed URL on both the laptop and phone.
External access requires **HTTPS** and the explicit **`:8443`** port.
No custom DNS, separate certificate setup, or `/etc/hosts` changes are required.
Internal mode removes this demo's public Funnel route.

When the LAN address changes, specify the new internal origin:

```bash
./access.sh internal --internal-origin http://10.1.1.242:5300
```

The script saves the internal origin in `.runtime/internal-origin.txt`.
Replace the example address with the laptop's current LAN address.

## Prerequisites

- Set up the application with `./create-env.sh --profile sample-app-02`.
- Keep the shared authentik container active.
- Install Tailscale and connect this laptop to the tailnet.
- Enable Funnel for this device through the administration link that Tailscale prints.
- Keep the laptop awake and connected to the internet during the demo.
- Give attendees authentik accounts. The script does not enable public account creation.

## Request routes

External mode uses one HTTPS origin for the UI, REST requests, and authentik.

```text
Browser → Tailscale Funnel HTTPS :8443 → Vite :5300
                                         ├─ /api, /oauth2, /login → FastAPI server :8300
                                         └─ authentik routes → authentik :9010
```

Vite routes authentik requests before the general `/api` proxy.
Authentik routes include `/api/v3`, `/application`, `/flows`, `/if`, `/static`, `/media`, `/ws`, and `/outpost.goauthentik.io`.
The browser sends REST requests through relative `/api` URLs. It never needs the backend's loopback address.
Vite permits the configured public hostname and uses a secure WebSocket on the public port.
External startup starts Vite before the FastAPI server, so the public OIDC discovery endpoint is available.

Internal mode uses the Vite UI on port 5300 and the authentik forwarder on port 9300.

## Configuration and isolation

The script updates these settings in the private `.env` file:

| Setting | External mode | Internal mode |
| --- | --- | --- |
| `APP_ACCESS_MODE` | `external` | `internal` |
| `APP_ORIGIN` | Public HTTPS origin | Saved LAN origin |
| `OIDC_ISSUER` | Public origin plus `/application/o/sample-app-02/` | LAN authentik origin on port 9300 plus the same path |
| `COOKIE_SECURE` | `true` | `false` |

It registers the selected origin's login callback and logout return URL with the dedicated `sample-app-02` provider.
It preserves credentials and other environment settings.
It restarts only this application's processes with the explicit `sample-app-02` profile.
Existing sessions end after a server restart.

The script reserves Tailscale HTTPS port 8443 for this application.
It refuses to replace a different service on that port.
It preserves existing Tailscale routes on other ports and does not restart shared authentik.
Do not reset all Tailscale routes or change another application's OIDC provider.
External mode exposes the authentik web interface and this Vite development server.

See [Separate application instances](../../agent-ws/multi-instance-support.md) for service lifecycle rules.
The entry point is [access.sh](../../access.sh), with its implementation in
[access.py](../../scripts/src/main/nix/access.py).

## How to test

1. Run `./access.sh external` and copy the printed HTTPS URL.
2. Open that URL on the laptop. Sign in with an authentik account.
3. Verify Resume Builder, REST access, and the agent. Verify logout and sign in again.
4. Disable Wi-Fi and Tailscale on the phone. Enable cellular data.
5. Open the same HTTPS URL on the phone. Verify login and the demo features.
6. Run `./access.sh internal`. Verify the saved LAN URL from a device on the same LAN.
7. Run `./access.sh status`. Confirm this demo's public route is absent and other routes remain intact.
8. Run `./access.sh external` again to leave public access active for the conference.

For sample-app-01, automated checks covered the switch script, UI units, and desktop and mobile browser flows.
Server-side checks also forced requests and a browser through Funnel's public relay addresses.
Those checks verified login, logout, REST access, secure cookies, and the Vite WebSocket.
They do not replace a test from a separate network.
Repeat these checks for sample-app-02 before a public demo.

## Troubleshoot access

For `ERR_CONNECTION_CLOSED`, first verify the exact scheme and port:

```text
https://HOSTNAME.ts.net:8443/
```

The error alone does not identify a protocol mismatch.
Record the full browser URL and error, including any URL after a login redirect.
Check `./access.sh status`, `.runtime/ui.log`, and `.runtime/server.log`.
Confirm that the laptop is awake and Tailscale is connected.

Tailscale Funnel permits only HTTPS ports 443, 8443, and 10000. sample-app-01 uses 10000. If a network blocks port 8443, consider a dedicated Tailscale device hostname with HTTPS port 443.
Do not overwrite this laptop's existing port 443 routes.
