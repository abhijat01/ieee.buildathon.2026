import pytest
from playwright.async_api import Error as PlaywrightError, async_playwright
from ieee.agent.web.browser_web_service import BrowserWebService
from ieee.agent.web.public_web_url_policy import PublicWebUrlPolicy
from ieee.agent.web.website_access import CAPTCHA_MESSAGE, LOGIN_MESSAGE


@pytest.fixture(scope="module")
async def chromium_installed() -> None:
    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            await browser.close()
    except PlaywrightError:
        pytest.skip("Chromium is not installed. Run: uv run playwright install chromium")


@pytest.fixture
def browser(policy, chromium_installed) -> BrowserWebService:
    return BrowserWebService(policy)


async def test_reads_javascript_content_and_links_without_hidden_text(site, browser):
    site.html("/page", """
        <title>Dynamic page</title><main>Loading...</main><p hidden>Hidden secret</p>
        <script>setTimeout(() => {document.querySelector('main').innerHTML =
        '<h1>JavaScript jobs</h1><a href="/jobs">Open roles</a>';}, 700);</script>
        """)
    result = await browser.browse(site.origin + "/page")
    assert result["status"] == "success" and result["javascriptExecuted"] is True
    assert result["title"] == "Dynamic page"
    assert "JavaScript jobs" in result["content"] and "Open roles" in result["content"]
    assert "Hidden secret" not in result["content"] and "Loading" not in result["content"]
    assert site.origin + "/jobs" in str(result["links"])


async def test_stops_at_captcha_without_submitting_the_challenge(site, browser):
    site.html("/captcha", "<h1>Verify you are human</h1><form action='/submit'><input name='answer'>"
                          "<button>Verify</button></form>")
    site.html("/submit", "Solved")
    result = await browser.browse(site.origin + "/captcha")
    assert result["status"] == "captcha_required" and result["message"] == CAPTCHA_MESSAGE
    assert site.count("/submit") == 0


async def test_stops_at_login_and_does_not_mistake_navigation_for_a_login_wall(site, browser):
    site.html("/login", "<h1>Sign in</h1><input type='password'>")
    site.html("/public", "<nav><a href='/login'>Sign in</a></nav><main>Public article</main>")
    login = await browser.browse(site.origin + "/login")
    assert login["status"] == "login_required" and login["message"] == LOGIN_MESSAGE
    assert (await browser.browse(site.origin + "/public"))["status"] == "success"


async def test_reports_unauthorized_without_claiming_captcha_for_forbidden_responses(site, browser):
    site.html("/unauthorized", "Authentication required", status=401)
    site.html("/forbidden", "Access denied", status=403)
    assert (await browser.browse(site.origin + "/unauthorized"))["status"] == "login_required"
    forbidden = await browser.browse(site.origin + "/forbidden")
    assert forbidden["status"] == "http_error" and forbidden["httpStatus"] == 403


async def test_blocks_private_redirects_and_script_requests_before_they_reach_the_destination(site, policy, browser):
    site.html("/private", "Private")
    site.redirect("/redirect", "/private")
    site.html("/script", "<main>Public content</main><script>fetch('/private').catch(() => {});</script>")
    policy.blocked[site.origin + "/private"] = "Private address blocked"
    assert (await browser.browse(site.origin + "/redirect"))["status"] == "error"
    assert (await browser.browse(site.origin + "/script"))["status"] == "success"
    assert site.count("/private") == 0
    assert policy.calls.count(site.origin + "/private") >= 2


async def test_follows_public_redirects_and_returns_the_final_url(site, browser):
    site.redirect("/start", "/finish")
    site.html("/finish", "<title>Final page</title><main>Final content</main>")
    result = await browser.browse(site.origin + "/start")
    assert result["status"] == "success" and result["url"] == site.origin + "/finish"
    assert result["content"] == "Final content"


async def test_blocks_private_destinations_in_subresource_redirects(site, policy, browser):
    site.html("/private", "Private")
    site.redirect("/api", "/private")
    site.html("/public", "<main>Public content</main><script>fetch('/api').catch(() => {});</script>")
    policy.blocked[site.origin + "/private"] = "Private address blocked"
    assert (await browser.browse(site.origin + "/public"))["status"] == "success"
    assert site.count("/private") == 0


async def test_starts_each_visit_without_previous_cookies(site, browser):
    site.route("/cookie", lambda request: (200, {"Content-Type": "text/html", "Set-Cookie": "private=value; Path=/"},
                                           "A public page"))
    assert (await browser.browse(site.origin + "/cookie"))["status"] == "success"
    assert (await browser.browse(site.origin + "/cookie"))["status"] == "success"
    assert all("Cookie" not in request.headers for request in site.requests if request.path == "/cookie")


async def test_rejects_private_initial_urls_before_launching_a_browser():
    result = await BrowserWebService(PublicWebUrlPolicy()).browse("http://127.0.0.1/")
    assert result["status"] == "error"


async def test_reports_a_busy_browser_when_all_slots_are_in_use(policy):
    browser = BrowserWebService(policy)
    browser.active = 2
    assert await browser.browse("https://example.com") == {
        "status": "error", "message": "The website browser is busy. Try again shortly."}
