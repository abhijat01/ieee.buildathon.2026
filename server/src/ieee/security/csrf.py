import secrets
from urllib.parse import parse_qs
from starlette.requests import HTTPConnection
from starlette.responses import JSONResponse
from ieee.security.authenticated_user import USER_KEY
from starlette.types import ASGIApp, Message, Receive, Scope, Send

CSRF_HEADER = "X-CSRF-TOKEN"
CSRF_FORM_FIELD = "_csrf"
CSRF_SESSION_KEY = "csrf_token"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}


class CsrfTokens:
    """Creates and checks the session-bound CSRF token."""

    @staticmethod
    def token(session: dict) -> str:
        if CSRF_SESSION_KEY not in session:
            session[CSRF_SESSION_KEY] = secrets.token_urlsafe(32)
        return session[CSRF_SESSION_KEY]

    @staticmethod
    def matches(session: dict, candidate: str | None) -> bool:
        expected = session.get(CSRF_SESSION_KEY)
        return bool(expected and candidate and secrets.compare_digest(expected, candidate))


class CsrfMiddleware:
    """Rejects state-changing requests of a signed-in session without its CSRF token.

    Anonymous requests have no session to protect. The endpoints reject them with HTTP 401.
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["method"] in SAFE_METHODS or USER_KEY not in scope.get("session", {}):
            await self.app(scope, receive, send)
            return
        connection = HTTPConnection(scope)
        session = scope.get("session", {})
        candidate = connection.headers.get(CSRF_HEADER)
        body = b""
        if candidate is None and connection.headers.get("content-type", "").startswith("application/x-www-form-urlencoded"):
            body = await self._read(receive)
            candidate = parse_qs(body.decode("latin-1")).get(CSRF_FORM_FIELD, [None])[0]
        if not CsrfTokens.matches(session, candidate):
            await JSONResponse({"message": "Invalid CSRF token."}, status_code=403)(scope, receive, send)
            return
        await self.app(scope, self._replay(body, receive) if body else receive, send)

    @staticmethod
    async def _read(receive: Receive) -> bytes:
        chunks = []
        while True:
            message = await receive()
            chunks.append(message.get("body", b""))
            if not message.get("more_body"):
                return b"".join(chunks)

    @staticmethod
    def _replay(body: bytes, receive: Receive) -> Receive:
        sent = False

        async def replay() -> Message:
            nonlocal sent
            if not sent:
                sent = True
                return {"type": "http.request", "body": body, "more_body": False}
            return await receive()
        return replay
