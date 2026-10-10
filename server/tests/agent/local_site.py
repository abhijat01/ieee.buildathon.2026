import threading
from collections.abc import Callable
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

SiteResponse = tuple[int, dict[str, str], str]
SiteRoute = Callable[["SiteRequest"], SiteResponse]


class SiteRequest:
    """One request that the local site received."""

    def __init__(self, method: str, path: str, headers: dict[str, str], body: str = ""):
        self.method = method
        self.path = path
        self.headers = headers
        self.body = body


class LocalSite:
    """A small HTTP server on 127.0.0.1. Tests register a route for each path."""

    def __init__(self):
        self.routes: dict[str, SiteRoute] = {}
        self.requests: list[SiteRequest] = []
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), self._handler())
        self.origin = f"http://127.0.0.1:{self.server.server_address[1]}"
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    def route(self, path: str, route: SiteRoute) -> None:
        self.routes[path] = route

    def html(self, path: str, body: str, status: int = 200) -> None:
        self.route(path, lambda request: (status, {"Content-Type": "text/html; charset=utf-8"}, body))

    def redirect(self, path: str, location: str) -> None:
        self.route(path, lambda request: (302, {"Location": location}, ""))

    def count(self, path: str) -> int:
        return sum(1 for request in self.requests if request.path == path)

    def start(self) -> None:
        self.thread.start()

    def stop(self) -> None:
        self.server.shutdown()
        self.server.server_close()

    def _handler(self) -> type[BaseHTTPRequestHandler]:
        site = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self) -> None:
                self._answer("")

            def do_POST(self) -> None:
                self._answer(self.rfile.read(int(self.headers.get("Content-Length", "0"))).decode("utf-8"))

            def _answer(self, body_text: str) -> None:
                path = self.path.split("?")[0]
                request = SiteRequest(self.command, path, dict(self.headers.items()), body_text)
                site.requests.append(request)
                route = site.routes.get(path)
                status, headers, body = route(request) if route else (404, {"Content-Type": "text/plain"}, "Missing")
                data = body.encode("utf-8")
                self.send_response(status)
                for name, value in headers.items():
                    self.send_header(name, value)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def log_message(self, format: str, *args: Any) -> None:
                pass

        return Handler
