import asyncio
import contextlib
import time
from typing import Any
import httpx
from playwright.async_api import BrowserContext, Error as PlaywrightError, Page, Response, Route, WebSocketRoute
from playwright.async_api import async_playwright
from ieee.agent.web.public_web_url_policy import PublicWebUrlPolicy
from ieee.agent.web.website_access import WebsiteAccess

TEXT_LIMIT = 16_000
BROWSER_SLOTS = 2
VISIT_SECONDS = 30.0
RENDER_SECONDS = 8.0
REDIRECT_LIMIT = 5
REQUEST_LIMIT = 150
STABLE_CHECKS = 4
CHECK_INTERVAL_MS = 500
BLOCKED_RESOURCES = ("image", "media", "font")
LOADING_TEXTS = ("loading", "loading...", "loading…", "please wait")
LINKS_SCRIPT = ("elements => elements.filter(a => a.getClientRects().length && /^https?:/.test(a.href))"
                ".slice(0, 20).map(a => ({text: a.innerText, url: a.href}))")
BLANK_PAGE = "<html><body></body></html>"
LOAD_ERROR = "The browser could not load the website. It may be blocked, unavailable, or timed out."


class BrowserVisit:
    """Holds the time limit, the request count, and the pending redirect of one browser visit."""

    def __init__(self):
        self.deadline = time.monotonic() + VISIT_SECONDS
        self.requests = 0
        self.redirect: str | None = None

    def remaining_ms(self) -> float:
        return max(0.0, (self.deadline - time.monotonic()) * 1000)

    def take_redirect(self) -> str | None:
        redirect, self.redirect = self.redirect, None
        return redirect


class BrowserWebService:
    """Reads a public website in headless Chromium with JavaScript.

    Each visit uses a new browser without cookies. The service validates every request and every redirect.
    It stops at a CAPTCHA or a login wall. Two visits can run at the same time.
    """

    def __init__(self, urls: PublicWebUrlPolicy):
        self.urls = urls
        self.access = WebsiteAccess()
        self.active = 0

    async def browse(self, address: str) -> dict[str, Any]:
        try:
            await self._validate(address)
        except ValueError as exception:
            return self._error(str(exception))
        if self.active >= BROWSER_SLOTS:
            return self._error("The website browser is busy. Try again shortly.")
        self.active += 1
        try:
            return await self._visit(address)
        except ValueError as exception:
            return self._error(str(exception))
        except PlaywrightError:
            return self._error(LOAD_ERROR)
        finally:
            self.active -= 1

    async def _visit(self, address: str) -> dict[str, Any]:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True, timeout=15_000)
            try:
                context = await browser.new_context(service_workers="block", accept_downloads=False, locale="en-US")
                return await self._read(context, address)
            finally:
                await browser.close()

    async def _read(self, context: BrowserContext, address: str) -> dict[str, Any]:
        visit = BrowserVisit()
        context.set_default_timeout(3_000)
        await context.route_web_socket("**/*", self._close_socket)
        await context.route("**/*", lambda route: self._route(route, visit))
        page = await context.new_page()
        response = await self._navigate(page, address, visit)
        status = response.status if response else 0
        previous = ""
        stable = 0
        render_deadline = min(visit.deadline, time.monotonic() + RENDER_SECONDS)
        while time.monotonic() < render_deadline:
            redirect = visit.take_redirect()
            if redirect is not None:
                response = await self._navigate(page, redirect, visit)
                status = response.status if response else 0
                stable = 0
            text = await page.locator("body").inner_text()
            restriction = await self.access.restriction(page, status, text)
            if restriction:
                return restriction
            stable = stable + 1 if text == previous and text.strip() else 0
            if stable >= STABLE_CHECKS and not self._loading(text):
                break
            previous = text
            await page.wait_for_timeout(CHECK_INTERVAL_MS)
        await self._validate(page.url)
        text = await page.locator("body").inner_text()
        restriction = await self.access.restriction(page, status, text)
        if restriction:
            return restriction
        if self._loading(text):
            return self._error("The page did not provide readable content after JavaScript execution.")
        links = await page.locator("a[href]").evaluate_all(LINKS_SCRIPT)
        return {"status": "http_error" if status >= 400 else "success", "httpStatus": status, "url": page.url,
                "title": await page.title(), "content": text[:TEXT_LIMIT], "links": links,
                "truncated": len(text) > TEXT_LIMIT, "javascriptExecuted": True}

    async def _route(self, route: Route, visit: BrowserVisit) -> None:
        """Send an allowed request from the server side. Abort a blocked request."""
        try:
            await self._validate(route.request.url)
            if visit.remaining_ms() <= 0 or route.request.resource_type in BLOCKED_RESOURCES:
                await route.abort()
                return
            await self._forward(route, visit)
        except (ValueError, PlaywrightError):
            with contextlib.suppress(PlaywrightError):
                await route.abort()

    async def _forward(self, route: Route, visit: BrowserVisit) -> None:
        """Follow redirects one by one and validate each destination before the request."""
        destination = route.request.url
        for _ in range(REDIRECT_LIMIT + 1):
            if visit.remaining_ms() <= 0:
                raise ValueError("The website browser timed out.")
            visit.requests += 1
            if visit.requests > REQUEST_LIMIT:
                await route.abort()
                return
            await self._validate(destination)
            response = await route.fetch(url=destination, max_redirects=0,
                                         timeout=min(10_000, max(1.0, visit.remaining_ms())))
            try:
                location = response.headers.get("location")
                if 300 <= response.status <= 308 and location is not None:
                    destination = str(await self._validate(str(httpx.URL(destination).join(location))))
                    if route.request.is_navigation_request() and route.request.frame.parent_frame is None:
                        visit.redirect = destination
                        await route.fulfill(status=200, content_type="text/html", body=BLANK_PAGE)
                        return
                else:
                    await route.fulfill(response=response)
                    return
            finally:
                await response.dispose()
        await route.abort()

    async def _navigate(self, page: Page, address: str, visit: BrowserVisit) -> Response | None:
        """Open the address. Open the next address when the main page redirects."""
        for _ in range(REDIRECT_LIMIT + 1):
            if visit.remaining_ms() <= 0:
                raise ValueError("The website browser timed out.")
            await self._validate(address)
            try:
                response = await page.goto(address, wait_until="domcontentloaded",
                                           timeout=min(20_000, max(1.0, visit.remaining_ms())))
                redirect = visit.take_redirect()
                if redirect is None:
                    return response
                address = redirect
            except PlaywrightError:
                redirect = visit.take_redirect()
                if redirect is None:
                    raise
                address = redirect
        raise ValueError("The website exceeded the redirect limit.")

    async def _validate(self, address: str) -> httpx.URL:
        return await asyncio.to_thread(self.urls.validate, address)

    @staticmethod
    async def _close_socket(socket: WebSocketRoute) -> None:
        await socket.close()

    @staticmethod
    def _loading(text: str) -> bool:
        lower = text.strip().lower()
        return not lower or "enable javascript" in lower or lower in LOADING_TEXTS

    @staticmethod
    def _error(message: str) -> dict[str, Any]:
        return {"status": "error", "message": message}
