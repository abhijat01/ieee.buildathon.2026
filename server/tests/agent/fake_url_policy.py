import httpx
from ieee.agent.web.public_web_url_policy import PublicWebUrlPolicy


class FakeUrlPolicy(PublicWebUrlPolicy):
    """Accepts every URL except the blocked ones. Records each validated URL."""

    def __init__(self):
        self.blocked: dict[str, str] = {}
        self.calls: list[str] = []

    def validate(self, address: str | None) -> httpx.URL:
        self.calls.append(address or "")
        if address in self.blocked:
            raise ValueError(self.blocked[address])
        return httpx.URL(address)
