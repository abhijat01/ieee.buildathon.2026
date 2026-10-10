from typing import Any
from playwright.async_api import Page

CAPTCHA_MESSAGE = "This site blocks agents using CAPTCHA."
LOGIN_MESSAGE = "This site requires login to access the content."
SHORT_PAGE_LIMIT = 3000
CHALLENGE_PHRASES = ("verify you are human", "verify that you are human", "complete the captcha",
                     "prove you are not a robot", "captcha required")
LOGIN_PHRASES = ("sign in to continue", "log in to continue", "login required", "sign in to access",
                 "log in to access", "you must be logged in")
CAPTCHA_SELECTOR = ("iframe[src*='recaptcha'][src*='anchor'], iframe[src*='hcaptcha'], "
                    "iframe[src*='challenges.cloudflare.com'], .g-recaptcha, .h-captcha")
PASSWORD_SELECTOR = "input[type='password']"


class WebsiteAccess:
    """Finds a CAPTCHA or a login wall on a loaded page. The agent stops at these restrictions."""

    async def restriction(self, page: Page, status: int, text: str) -> dict[str, Any]:
        lower = text.lower()
        short_page = len(lower) < SHORT_PAGE_LIMIT
        challenge_text = short_page and any(phrase in lower for phrase in CHALLENGE_PHRASES)
        if challenge_text or await self._visible(page, CAPTCHA_SELECTOR):
            return {"status": "captcha_required", "message": CAPTCHA_MESSAGE, "url": page.url}
        login_text = any(phrase in lower for phrase in LOGIN_PHRASES)
        if status == 401 or await self._visible(page, PASSWORD_SELECTOR) or (short_page and login_text):
            return {"status": "login_required", "message": LOGIN_MESSAGE, "url": page.url}
        return {}

    @staticmethod
    async def _visible(page: Page, selector: str) -> bool:
        for element in await page.locator(selector).all():
            if await element.is_visible():
                return True
        return False
