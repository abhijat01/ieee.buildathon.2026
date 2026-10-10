from collections.abc import AsyncIterator
from ag_ui.encoder import EventEncoder
from fastapi import APIRouter, Depends
from sse_starlette.event import ServerSentEvent
from sse_starlette.sse import EventSourceResponse
from ieee.portfolio.assistant.assistant_input import AssistantInput
from ieee.portfolio.assistant.portfolio_assistant_service import PortfolioAssistantService
from ieee.security.authenticated_user import AuthenticatedUser, current_user

KEEPALIVE_SECONDS = 15


class PortfolioAssistantController:
    """The AG-UI endpoint of the portfolio assistant. It streams the events of one run as server-sent events.

    The signed-in member is the owner. CsrfMiddleware checks the CSRF token before this route runs.
    A keepalive comment keeps the connection open while the model works. The browser ignores comments.
    """

    def __init__(self, assistant: PortfolioAssistantService):
        self.assistant = assistant
        self.router = APIRouter()
        self.router.add_api_route("/api/portfolio/assistant", self.run, methods=["POST"],
                                  response_class=EventSourceResponse)

    async def run(self, input: AssistantInput, user: AuthenticatedUser = Depends(current_user)) -> EventSourceResponse:
        return EventSourceResponse(self._frames(user.subject, input), ping=KEEPALIVE_SECONDS,
                                   ping_message_factory=lambda: ServerSentEvent(comment="keepalive"),
                                   headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    async def _frames(self, owner: str, input: AssistantInput) -> AsyncIterator[bytes]:
        encoder = EventEncoder()
        async for event in self.assistant.events(owner, input):
            yield encoder.encode(event).encode("utf-8")
