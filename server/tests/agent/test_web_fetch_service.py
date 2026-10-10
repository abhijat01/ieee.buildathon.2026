from ieee.agent.web.web_fetch_service import CHROME_USER_AGENT, WebFetchService


async def test_sends_chrome_headers_and_extracts_text_and_links(site, policy):
    site.html("/page", "<title>Website</title><h1>Hello</h1><script>private script</script><a href='/next'>Next</a>")
    result = await WebFetchService(policy).fetch(site.origin + "/page")
    request = site.requests[0]
    assert request.method == "GET"
    assert request.headers["User-Agent"] == CHROME_USER_AGENT
    assert "Google Chrome" in request.headers["Sec-CH-UA"]
    assert request.headers["Accept-Language"].startswith("en-US")
    assert "Authorization" not in request.headers and "Cookie" not in request.headers
    assert result["status"] == "success" and result["title"] == "Website"
    assert result["content"] == "Hello Next" and result["httpStatus"] == 200
    assert site.origin + "/next" in str(result["links"])


async def test_keeps_inline_words_together(site, policy):
    site.html("/inline", "<p>Hel<b>lo</b> world</p><p>Next</p>")
    assert (await WebFetchService(policy).fetch(site.origin + "/inline"))["content"] == "Hello world Next"


async def test_validates_redirects_before_sending_the_next_request(site, policy):
    site.redirect("/redirect", "/private")
    site.html("/private", "Private")
    policy.blocked[site.origin + "/private"] = "Private destination blocked"
    result = await WebFetchService(policy).fetch(site.origin + "/redirect")
    assert result == {"status": "error", "error": "Private destination blocked"}
    assert site.count("/private") == 0
    assert policy.calls.count(site.origin + "/private") == 1


async def test_follows_allowed_redirects_and_reports_http_errors(site, policy):
    site.redirect("/redirect", "/missing")
    site.route("/missing", lambda request: (404, {"Content-Type": "text/plain"}, "Not found"))
    result = await WebFetchService(policy).fetch(site.origin + "/redirect")
    assert result["httpStatus"] == 404 and result["status"] == "http_error"
    assert result["url"] == site.origin + "/missing"


async def test_limits_returned_text_and_rejects_binary_responses(site, policy):
    site.route("/long", lambda request: (200, {"Content-Type": "text/plain"}, "x" * 20_000))
    site.route("/binary", lambda request: (200, {"Content-Type": "application/octet-stream"}, "binary"))
    websites = WebFetchService(policy)
    result = await websites.fetch(site.origin + "/long")
    assert len(result["content"]) == 16_000 and result["truncated"] is True
    assert (await websites.fetch(site.origin + "/binary"))["status"] == "error"


async def test_returns_an_error_for_redirect_loops(site, policy):
    site.redirect("/loop", "/loop")
    result = await WebFetchService(policy).fetch(site.origin + "/loop")
    assert result == {"status": "error", "error": "The website exceeded the redirect limit."}
    assert site.count("/loop") == 6


async def test_reports_unreachable_websites(policy):
    result = await WebFetchService(policy).fetch("http://127.0.0.1:9/")
    assert result == {"status": "error", "error": "The website request failed or timed out."}
