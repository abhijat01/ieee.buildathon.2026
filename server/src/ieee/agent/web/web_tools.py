from typing import Annotated, Any
from agent_framework import FunctionTool
from pydantic import Field
from ieee.agent.web.browser_web_service import BrowserWebService
from ieee.agent.web.web_fetch_service import WebFetchService

WebsiteUrl = Annotated[str, Field(description="Full public HTTP or HTTPS website URL")]


class WebTools:
    """Agent tools that read public websites."""

    def __init__(self, websites: WebFetchService, browser: BrowserWebService):
        self.websites = websites
        self.browser = browser

    def tools(self) -> list[FunctionTool]:
        return [
            FunctionTool(name="fetchWebsite", func=self.fetch_website,
                         description="Fetch a public website with Chrome request headers. Return page text, title, "
                                     "links, and HTTP status. JavaScript is not executed."),
            FunctionTool(name="browseWebsite", func=self.browse_website,
                         description="Read a public website in a real Chromium browser with JavaScript. Return "
                                     "visible text, title, links, and final URL. Stop and report CAPTCHA or login "
                                     "requirements."),
        ]

    async def browse_website(self, url: WebsiteUrl) -> dict[str, Any]:
        return await self.browser.browse(url)

    async def fetch_website(self, url: WebsiteUrl) -> dict[str, Any]:
        return await self.websites.fetch(url)
