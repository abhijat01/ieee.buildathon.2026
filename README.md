# IEEE Workspace

A small authenticated workspace with a Python server and a React TypeScript UI.
The server uses FastAPI. Vite serves the UI during development.
IEEEAgent uses Microsoft Agent Framework for Python and the AG-UI protocol.
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
- An IEEEAgent pane on desktop and an assistant view on mobile.
- Private notes with SQLAlchemy 2 and Alembic migrations.
- A Resume Builder with structured experience extraction and an editable preview before save.
- Server tools to read notes, save notes, and get the current time.
- A browser tool to change the theme and return its result to the agent.
- A website tool that sends Chrome HTTP headers and returns page text and links.
- A Chromium tool that executes JavaScript and reads the visible page.
- OIDC sessions and CSRF protection for all API mutations.

OIDC tokens and the client secret stay on the server.
The browser uses an HTTP-only session cookie.
Unauthenticated API calls return HTTP 401.
The sign-in page contains no private workspace data.

Ask IEEEAgent: `Read https://example.com and summarize the page.`
The `fetchWebsite` tool sends a Chrome User-Agent and Chrome-style request headers.
It fetches HTML and text documents. It does not execute JavaScript or use your browser cookies.
Each request validates public URLs and redirect destinations.
Responses have a 2 MB limit. Returned text has a 16,000-character limit.
The server parses HTML with [Beautiful Soup](https://www.crummy.com/software/BeautifulSoup/bs4/doc/).

The agent uses `browseWebsite` for pages that require JavaScript.
It runs headless Chromium in an isolated session and returns visible text and links.
It stops when it detects CAPTCHA or a login requirement and explains the restriction.
It does not enter credentials, solve CAPTCHA, or reuse your browser cookies.
The browser validates network destinations and blocks private addresses, service workers, and WebSockets.
Each visit allows up to 150 requests, with a 30-second page deadline and at most two simultaneous visits.
Rendered text has a 16,000-character limit. Detection uses visible page signals and may miss unusual restrictions.
Setup installs Chromium. To install it separately, run `uv run --locked --project server playwright install chromium`.
See [Playwright for Python](https://playwright.dev/python/docs/intro).

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
Notes persist after a restart. The server keeps agent threads in memory. A thread expires after 30 minutes.
The agent streams its answer and tool activity as they occur. The panel shows tool activity as one line.
Select the line to see the tools that the agent used.
A server restart clears the conversations. Start a new chat after a server restart.
Without Azure model settings, the workspace and notes work; IEEEAgent reports the missing configuration.

Startup reads three fields from the INI file's `_secrets` section:
`azure_openai_endpoint`, `default_openai_model`, and `azure_openai_api_key`.
Explicit `AZURE_OPENAI_*` values take precedence over the INI defaults.
The key enters only the server process environment. Setup does not copy it into the repository.
The supplied `/openai/v1/` endpoint uses Azure's v1 API.
The INI file's legacy `azure_api_version` setting does not apply to this endpoint.
See [Microsoft's endpoint guide](https://learn.microsoft.com/en-us/azure/foundry-classic/openai/how-to/switching-endpoints?view=foundry-classic).

## Resume Builder demonstration

Open **Resume Builder** from the left menu. Choose Project or Professional experience,
paste one description, and select **Analyze**. Review and edit the extracted fields.
Select **Accept & Save** to store the reviewed entry in the local SQLite database.
**Cancel** returns to the input without a save.

Analysis uses one Azure call with an enforced JSON schema. Missing values remain editable.
Dates support `YYYY`, `YYYY-MM`, and `YYYY-MM-DD`. Before save, provide a description
and at least one company or project name. The server assigns entries to the authenticated user.

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

Server tests cover OIDC identity, CSRF checks, note privacy, validation, and missing-key errors.
Agent tests use a scripted model to verify server tools and browser tool pause/resume behavior.
UI tests cover event decoding, browser tools, and agent error handling.
Browser tests cover desktop and mobile layouts, themes, notes, agent tools, and logout.
Browser fixtures simulate the API and do not require an Azure key.

## Project structure

- `server/src/ieee`: FastAPI endpoints, domain services, and the agent bridge.
- `server/src/ieee/migrations`: Alembic schema migrations.
- `server/tests`: Server tests, run with pytest.
- `ui/src/components`: React class components.
- `ui/src/services`: TypeScript transport, theme, and browser tool classes.
- `scripts/src/main/nix`: Python setup and lifecycle utilities, run with uv.

See [Architecture conventions](docs/development/architecture-conventions.md) for the application boundaries.

Implementation references: [Microsoft Agent Framework](https://learn.microsoft.com/en-us/agent-framework/),
[FastAPI](https://fastapi.tiangolo.com/),
[AG-UI events](https://docs.ag-ui.com/concepts/events),
and [authentik OAuth2/OIDC](https://docs.goauthentik.io/add-secure-apps/providers/oauth2/).
