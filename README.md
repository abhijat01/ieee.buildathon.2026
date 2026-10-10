# IEEE Workspace

A small authenticated workspace with a Python server and a React TypeScript UI.
The server uses FastAPI. Vite serves the UI during development.
This application is a Python port of sample.app.01. It runs beside that application on the same host.

## Start the application

Prerequisites: uv, Node.js 22.12 or later, npm, and Docker.
uv installs Python 3.12 when necessary.
The shared local authentik instance must be healthy.

```bash
./create-env.sh --profile sample-app-02
# Azure settings load from ~/.agent.config/deployment.ini.
./run-all.sh --profile sample-app-02
```

Open [IEEE Workspace](http://localhost:5300).

uv owns the Python version and the virtual environment. Never use pip directly.
Setup runs `uv sync --locked --python 3.12` for the `server` project.
Setup stops when `server/uv.lock` does not match `server/pyproject.toml`.
`server/.python-version` pins Python 3.12. Commit `server/uv.lock` and `server/.python-version`.
To change a dependency, run `uv add` in `server/` and commit the updated `uv.lock`.
Startup runs the server with `uv run --locked --no-sync`. Startup never changes the environment.

For phone access, use the server's LAN address on port 5300. Set `APP_ORIGIN`
to that URL and `OIDC_ISSUER` to the LAN authentik URL on port 9300 with
`/application/o/sample-app-02/`. Run setup and restart the profile after changes.
All devices must use the configured origin for sign-in and logout.
Sign in with your existing authentik account.
The page shows the name from your OIDC profile.
The logout button clears the application session and starts authentik logout.

For the conference demo, use one script to select access:

```bash
./access.sh external  # Public HTTPS through Tailscale Funnel
./access.sh internal  # Return to the saved LAN URL
./access.sh status
```

Use the printed URL on your laptop and phone. External access does not require Tailscale on the phone.
The script updates login callbacks and restarts this application's processes.
It preserves other Tailscale routes. No `/etc/hosts` changes are required.
See [Conference demo access](agent-ws/multi-instance-support.md#conference-demo-access) for setup and phone checks.

Stop only this application:

```bash
./run-all.sh --profile sample-app-02 --stop
```

Setup creates a dedicated confidential OIDC client in the existing authentik container.
It keeps the client secret in the ignored `.env` file with restricted permissions.
Setup keeps existing users and other applications' providers unchanged.
It registers this application's configured callback and launch URL.
The bootstrap script targets `theragenx-local-dev-authentik-server` explicitly.

## Features

- A responsive workspace with light and dark themes.
- Private notes with SQLAlchemy 2 and Alembic migrations.
- A work portfolio. The AI extracts the key fields of an experience, finds possible duplicates, and improves the text on request.
- OIDC sessions and CSRF protection for all API mutations.

OIDC tokens and the client secret stay on the server.
The browser uses an HTTP-only session cookie.
Unauthenticated API calls return HTTP 401.
The sign-in page contains no private workspace data.

## Configuration

| Variable | Purpose |
| --- | --- |
| `APP_PROFILE` | `sample-app-02` |
| `APP_ORIGIN` | UI origin; default `http://localhost:5300` |
| `SERVER_PORT` | Server port; default `8300` |
| `OIDC_ISSUER` | Dedicated authentik issuer |
| `OIDC_CLIENT_ID` | Dedicated OIDC client identifier |
| `OIDC_CLIENT_SECRET` | Private OIDC client secret |
| `AGENT_DEPLOYMENT_FILE` | INI path; default `~/.agent.config/deployment.ini` |
| `AZURE_OPENAI_ENDPOINT` | Optional Azure v1 endpoint override |
| `AZURE_OPENAI_DEPLOYMENT` | Optional Azure deployment name override |
| `AZURE_OPENAI_API_KEY` | Optional private Azure API key override |
| `DATABASE_URL` | Optional SQLAlchemy URL; default SQLite file `.runtime/ieee.db` |
| `COOKIE_SECURE` | Set `true` for HTTPS deployments |

The start script uses the fixed local ports to protect other application instances.
For another deployment, update the origin, callback registration, proxy, and profile together.
Read [Separate application instances](agent-ws/multi-instance-support.md) before setup or startup.

Logs and the local database reside in `.runtime/`.
Notes persist after a restart.
The portfolio uses the Azure model settings for analysis and improvement.
Without them, the workspace and notes work, and **Analyze** in the portfolio is not available.

Startup reads three fields from the INI file's `_secrets` section:
`azure_openai_endpoint`, `default_openai_model`, and `azure_openai_api_key`.
Explicit `AZURE_OPENAI_*` values take precedence over the INI defaults.
The key enters only the server process environment. Setup does not copy it into the repository.
The supplied `/openai/v1/` endpoint uses Azure's v1 API.
The INI file's legacy `azure_api_version` setting does not apply to this endpoint.
See [Microsoft's endpoint guide](https://learn.microsoft.com/en-us/azure/foundry-classic/openai/how-to/switching-endpoints?view=foundry-classic).

## Tests

```bash
(cd server && uv run --locked pytest)
uv run --python 3.12 -m unittest discover -s scripts/src/main/nix -p 'test_*.py'
npm test --prefix ui
npm run build --prefix ui
cd ui
npx playwright install chromium
npm run test:e2e
```

Server tests cover OIDC identity, CSRF checks, note privacy, validation, migrations, and missing-key errors.
Portfolio tests use a scripted model to verify extraction, improvement, duplicate search, and owner boundaries.
UI tests cover the API client and authentication errors.
Browser tests cover desktop and mobile layouts, themes, notes, the portfolio flow, and logout.
Browser fixtures simulate the API and do not require an Azure key.

## Project structure

- `server/src/ieee`: FastAPI endpoints and domain services.
- `server/src/ieee/migrations`: Alembic schema migrations.
- `server/tests`: Server tests, run with pytest.
- `ui/src/components`: React class components.
- `ui/src/services`: TypeScript transport and theme classes.
- `scripts/src/main/nix`: Python setup and lifecycle utilities, run with uv.

See [Architecture conventions](docs/development/architecture-conventions.md) for the application boundaries.

Implementation references: [FastAPI](https://fastapi.tiangolo.com/)
and [authentik OAuth2/OIDC](https://docs.goauthentik.io/add-secure-apps/providers/oauth2/).
