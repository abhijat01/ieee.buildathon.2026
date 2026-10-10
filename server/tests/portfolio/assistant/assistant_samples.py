from typing import Any
from ieee.database import Database
from ieee.portfolio.assistant.assistant_input import AssistantInput
from ieee.portfolio.assistant.assistant_tools import AssistantTools
from ieee.portfolio.assistant.member_thread_store import MemberThreadStore
from ieee.portfolio.assistant.portfolio_assistant_factory import PortfolioAssistantFactory
from ieee.portfolio.assistant.portfolio_assistant_instructions import PortfolioAssistantInstructions
from ieee.portfolio.assistant.portfolio_assistant_service import PortfolioAssistantService
from ieee.portfolio.portfolio_service import PortfolioService
from ..portfolio_samples import ORIGINAL, save_request
from ..scripted_chat_client import ScriptedModels
from .scripted_assistant_client import ScriptedAssistantClient, Step

TOOLS = [{"name": "proposeText"}, {"name": "proposeSkills"}, {"name": "proposeFields"}]
SHOWN = '{"status":"shown","note":"The member did not decide yet."}'


class AssistantFixture:
    """One assistant service with a scripted model and one saved item of the member `member-a`."""

    def __init__(self, database: Database, *steps: Step, threads: MemberThreadStore | None = None,
                 run_seconds: float = 30):
        self.portfolio = PortfolioService(database)
        self.item_id = self.portfolio.save_item("member-a", save_request()).id
        self.client = ScriptedAssistantClient(*steps)
        self.threads = threads or MemberThreadStore()
        self.service = PortfolioAssistantService(
            self.portfolio, ScriptedModels(self.client), PortfolioAssistantFactory(PortfolioAssistantInstructions()),
            AssistantTools(), self.threads, run_seconds)

    def payload(self, run: str, *messages: dict[str, Any], **changes: Any) -> dict[str, Any]:
        """Return the JSON body of one AG-UI run, as the browser sends it."""
        body = {"threadId": "thread-1", "runId": run, "messages": list(messages), "tools": TOOLS,
                "state": context(self.item_id), "context": [], "forwardedProps": {}}
        return {**body, **changes}

    async def run(self, run: str, *messages: dict[str, Any], owner: str = "member-a",
                  **changes: Any) -> list[dict[str, Any]]:
        input = AssistantInput.model_validate(self.payload(run, *messages, **changes))
        return [event.model_dump(mode="json", by_alias=True, exclude_none=True)
                async for event in self.service.events(owner, input)]


def context(item_id: str, **changes: Any) -> dict[str, Any]:
    values = {"itemId": item_id, "type": "PROJECT", "title": "Atlas analytics dashboard", "company": "Acme Corp",
              "startDate": "2022-03", "endDate": "2023-06", "skills": ["Python", "React"], "text": ORIGINAL,
              "unsavedChanges": False, "decisions": []}
    return {**values, **changes}


def user(id: str, content: str) -> dict[str, Any]:
    return {"id": id, "role": "user", "content": content}


def result(id: str, tool_call_id: str, content: str = SHOWN) -> dict[str, Any]:
    return {"id": id, "role": "tool", "content": content, "toolCallId": tool_call_id}


def types(events: list[dict[str, Any]]) -> list[str]:
    return [event["type"] for event in events]


def of_type(events: list[dict[str, Any]], event_type: str) -> list[dict[str, Any]]:
    return [event for event in events if event["type"] == event_type]


def text(events: list[dict[str, Any]]) -> str:
    return "".join(event["delta"] for event in of_type(events, "TEXT_MESSAGE_CONTENT"))


def error(events: list[dict[str, Any]]) -> dict[str, Any]:
    return of_type(events, "RUN_ERROR")[0]
