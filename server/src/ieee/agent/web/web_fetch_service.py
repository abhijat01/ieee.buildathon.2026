import asyncio
import codecs
import time
from typing import Any
from urllib.parse import urljoin
import httpx
from bs4 import BeautifulSoup
from ieee.agent.web.public_web_url_policy import PublicWebUrlPolicy

CHROME_USER_AGENT = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                     "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36")
CHROME_HEADERS = {
    "User-Agent": CHROME_USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-CH-UA": "\"Google Chrome\";v=\"155\", \"Chromium\";v=\"155\", \"Not_A Brand\";v=\"99\"",
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": "\"macOS\"",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
}
REDIRECT_CODES = (301, 302, 303, 307, 308)
REDIRECT_LIMIT = 5
BODY_LIMIT = 2 * 1024 * 1024
TEXT_LIMIT = 16_000
LINK_LIMIT = 20
TOTAL_SECONDS = 30.0
REQUEST_SECONDS = 15.0
REMOVED_TAGS = ["script", "style", "noscript", "template"]
BLOCK_TAGS = ["address", "article", "aside", "blockquote", "br", "dd", "div", "dl", "dt", "figcaption", "figure",
              "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li", "main", "nav", "ol", "p",
              "pre", "section", "table", "td", "th", "tr", "ul"]


class WebFetchService:
    """Reads a public website with Chrome request headers. It does not execute JavaScript.

    The service validates each redirect destination before it sends the next request.
    """

    def __init__(self, urls: PublicWebUrlPolicy):
        self.urls = urls

    async def fetch(self, address: str) -> dict[str, Any]:
        try:
            url = await asyncio.to_thread(self.urls.validate, address)
            deadline = time.monotonic() + TOTAL_SECONDS
            for _ in range(REDIRECT_LIMIT + 1):
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise httpx.TimeoutException("Website timeout")
                status, headers, body, complete = await self._get(url, min(remaining, REQUEST_SECONDS))
                if status in REDIRECT_CODES:
                    location = headers.get("location")
                    if location is None:
                        return {"status": "error", "error": "The website redirect has no destination."}
                    url = await asyncio.to_thread(self.urls.validate, str(url.join(location)))
                    continue
                return self._extract(url, status, headers, body, complete)
            return {"status": "error", "error": "The website exceeded the redirect limit."}
        except ValueError as exception:
            return {"status": "error", "error": str(exception)}
        except httpx.HTTPError:
            return {"status": "error", "error": "The website request failed or timed out."}

    @staticmethod
    async def _get(url: httpx.URL, timeout: float) -> tuple[int, httpx.Headers, bytes, bool]:
        """Send one GET request without cookies or credentials. Read at most BODY_LIMIT bytes."""
        async with httpx.AsyncClient(follow_redirects=False, trust_env=False, timeout=timeout) as client:
            async with client.stream("GET", url, headers=CHROME_HEADERS) as response:
                body = bytearray()
                async for chunk in response.aiter_bytes():
                    body.extend(chunk)
                    if len(body) >= BODY_LIMIT:
                        return response.status_code, response.headers, bytes(body[:BODY_LIMIT]), False
                return response.status_code, response.headers, bytes(body), True

    def _extract(self, url: httpx.URL, status: int, headers: httpx.Headers, body: bytes,
                 complete: bool) -> dict[str, Any]:
        content_type = headers.get("content-type", "").lower()
        html = "html" in content_type
        if not html and not content_type.startswith("text/") and "json" not in content_type and "xml" not in content_type:
            return {"status": "error", "error": "The website response is not a text document."}
        charset = self._charset(content_type)
        title = ""
        links: list[dict[str, str]] = []
        if html:
            document = BeautifulSoup(body, "lxml", from_encoding=charset)
            for element in document.find_all(REMOVED_TAGS):
                element.decompose()
            title = self._normalize(document.title.get_text()) if document.title else ""
            links = self._links(document, str(url))
            content = self._text(document)
        else:
            content = body.decode(charset or "utf-8", errors="replace")
        truncated = len(content) > TEXT_LIMIT or not complete
        return {"status": "http_error" if status >= 400 else "success", "url": str(url), "httpStatus": status,
                "title": title, "content": content[:TEXT_LIMIT], "links": links, "truncated": truncated,
                "userAgent": CHROME_USER_AGENT}

    def _text(self, document: BeautifulSoup) -> str:
        """Return the visible body text. Block elements separate words, as a browser does."""
        if document.body is None:
            return ""
        for element in document.body.find_all(BLOCK_TAGS):
            element.insert_before(" ")
            element.insert_after(" ")
        return self._normalize(document.body.get_text())

    def _links(self, document: BeautifulSoup, base: str) -> list[dict[str, str]]:
        links: list[dict[str, str]] = []
        for anchor in document.find_all("a", href=True):
            try:
                target = urljoin(base, anchor["href"].strip())
            except ValueError:
                continue
            if target.startswith(("http://", "https://")):
                links.append({"text": self._normalize(anchor.get_text(" ")), "url": target})
            if len(links) >= LINK_LIMIT:
                break
        return links

    @staticmethod
    def _charset(content_type: str) -> str | None:
        for parameter in content_type.split(";")[1:]:
            name, _, value = parameter.strip().partition("=")
            if name == "charset" and value:
                try:
                    return codecs.lookup(value.strip("\"' ")).name
                except LookupError:
                    return None
        return None

    @staticmethod
    def _normalize(text: str) -> str:
        return " ".join(text.split())
