from collections.abc import AsyncIterator
from ag_ui.encoder import EventEncoder
from fastapi import APIRouter, Depends
from sse_starlette.event import ServerSentEvent
from sse_starlette.sse import EventSourceResponse
from ieee.agent.agent_input import AgentInput
from ieee.agent.agent_service import AgentService
from ieee.security.authenticated_user import AuthenticatedUser, current_user

KEEPALIVE_SECONDS = 15


class AgentController:
    """The AG-UI endpoint. It streams the events of one agent run as server-sent events.

    A keepalive comment keeps the connection open during long tool calls. The browser ignores comments.
    """

    def __init__(self, agent: AgentService):
        self.agent = agent
        self.router = APIRouter()
        self.router.add_api_route("/api/agent", self.run, methods=["POST"], response_class=EventSourceResponse)

    async def run(self, input: AgentInput, user: AuthenticatedUser = Depends(current_user)) -> EventSourceResponse:
        return EventSourceResponse(self._frames(user.subject, input), ping=KEEPALIVE_SECONDS,
                                   ping_message_factory=lambda: ServerSentEvent(comment="keepalive"),
                                   headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    async def _frames(self, owner: str, input: AgentInput) -> AsyncIterator[bytes]:
        encoder = EventEncoder()
        async for event in self.agent.events(owner, input):
            yield encoder.encode(event).encode("utf-8")
