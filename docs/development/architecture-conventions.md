# Architecture conventions

The Python server owns REST endpoints, business rules, tools, and persistence.
The server lives in `server/` as a uv project. Its package is `server/src/ieee`.
Use FastAPI for endpoints. Use SQLAlchemy 2 for data access. Use Alembic for schema changes.
The server applies Alembic migrations at startup.
Each workspace note belongs to the authenticated subject.
Never accept an owner identifier from the browser.

Use React class components and TypeScript service classes in the UI.
Keep transport, themes, and browser tools separate from the components.
Use Vite for UI development. Proxy server paths through Vite.
Keep OIDC tokens and the client secret on the server. Authlib handles the OIDC flow.
Use an HTTP-only session cookie and CSRF protection for mutations.

IEEEAgent uses Microsoft Agent Framework for model execution and server tools.
The MAF AG-UI runner (`agent-framework-ag-ui`) streams AG-UI events over server-sent events.
Do not map agent events to AG-UI events by hand.
MAF keeps the thread history on the server. The member subject is the snapshot scope.
The browser sends only the new turn: one member message or the pending browser tool results.
The browser declares and executes allowlisted tools. The server rejects other client tools.
The UI renders at most once in each animation frame. It shows tool activity as one compact line.
The UI never shows raw tool arguments or results.
The browser tool on the server uses Playwright for Python with headless Chromium.
Agent conversations expire after 30 minutes and reset after a server restart.
