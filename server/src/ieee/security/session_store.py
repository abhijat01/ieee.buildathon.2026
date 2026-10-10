import json
import secrets
import time
from threading import Lock
from starlette.datastructures import MutableHeaders
from starlette.requests import HTTPConnection
from starlette.types import ASGIApp, Message, Receive, Scope, Send


class SessionStore:
    """Keeps session data in server memory. The browser holds only a random identifier."""

    def __init__(self, timeout_seconds: int, limit: int = 10_000):
        self.timeout_seconds = timeout_seconds
        self.limit = limit
        self._sessions: dict[str, tuple[float, dict]] = {}
        self._lock = Lock()

    def load(self, session_id: str | None) -> dict:
        if not session_id:
            return {}
        with self._lock:
            entry = self._sessions.get(session_id)
            if entry is None or entry[0] < time.monotonic() - self.timeout_seconds:
                self._sessions.pop(session_id, None)
                return {}
            return json.loads(json.dumps(entry[1]))

    def save(self, session_id: str, data: dict) -> None:
        with self._lock:
            self._prune()
            self._sessions[session_id] = (time.monotonic(), dict(data))

    def delete(self, session_id: str | None) -> None:
        with self._lock:
            self._sessions.pop(session_id or "", None)

    def _prune(self) -> None:
        cutoff = time.monotonic() - self.timeout_seconds
        for key in [key for key, (touched, _) in self._sessions.items() if touched < cutoff]:
            del self._sessions[key]
        if len(self._sessions) >= self.limit:
            raise RuntimeError("The server has too many active sessions.")


ROTATE_KEY = "__rotate"


class ServerSessionMiddleware:
    """Exposes request.session from the SessionStore and refreshes an HTTP-only cookie."""

    def __init__(self, app: ASGIApp, store: SessionStore, cookie_name: str, secure: bool):
        self.app = app
        self.store = store
        self.cookie_name = cookie_name
        self.secure = secure

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return
        session_id = HTTPConnection(scope).cookies.get(self.cookie_name)
        scope["session"] = self.store.load(session_id)
        if not scope["session"]:
            session_id = None

        async def send_wrapper(message: Message) -> None:
            nonlocal session_id
            if message["type"] == "http.response.start":
                data: dict = scope["session"]
                headers = MutableHeaders(scope=message)
                if data.pop(ROTATE_KEY, False) and session_id:
                    self.store.delete(session_id)
                    session_id = None
                if data:
                    session_id = session_id or secrets.token_urlsafe(32)
                    self.store.save(session_id, data)
                    headers.append("Set-Cookie", self._cookie(session_id, self.store.timeout_seconds))
                elif session_id or HTTPConnection(scope).cookies.get(self.cookie_name):
                    self.store.delete(session_id)
                    headers.append("Set-Cookie", self._cookie("", 0))
            await send(message)

        await self.app(scope, receive, send_wrapper)

    def _cookie(self, value: str, max_age: int) -> str:
        cookie = f"{self.cookie_name}={value}; Path=/; Max-Age={max_age}; HttpOnly; SameSite=Lax"
        return cookie + "; Secure" if self.secure else cookie
