import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class FakeChatServer:
    """A local OpenAI-compatible /chat/completions endpoint. It records request bodies."""

    def __init__(self):
        self.requests: list[dict] = []
        self.status = 200
        self.reply: dict = {}
        server = self

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
                server.requests.append({"path": self.path, "body": json.loads(body)})
                data = json.dumps(server.reply).encode()
                self.send_response(server.status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def log_message(self, *args):
                pass

        self.http = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.http.serve_forever, daemon=True)

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.http.server_port}/"

    def answer(self, content: str | None, finish_reason: str | None = "stop", refusal: str | None = None) -> None:
        choice: dict = {"index": 0, "message": {"role": "assistant", "content": content}}
        if finish_reason is not None:
            choice["finish_reason"] = finish_reason
        if refusal is not None:
            choice["message"]["refusal"] = refusal
        self.status = 200
        self.reply = {"id": "chat", "object": "chat.completion", "created": 1, "model": "deployment",
                      "choices": [choice]}

    def start(self) -> "FakeChatServer":
        self.thread.start()
        return self

    def stop(self) -> None:
        self.http.shutdown()
        self.http.server_close()
