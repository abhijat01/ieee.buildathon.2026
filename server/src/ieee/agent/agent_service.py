import asyncio
import json
import logging
from collections.abc import AsyncIterator
from ag_ui.core import BaseEvent, EventType, RunErrorEvent, RunStartedEvent
from agent_framework import SupportsChatGetResponse
from agent_framework_ag_ui import AgentFrameworkAgent
# MAF reads the snapshot scope from this run input key. Its own FastAPI endpoint sets the key in the same way.
from agent_framework_ag_ui._snapshots import _SNAPSHOT_SCOPE_INPUT_KEY
from ieee.agent.agent_factory import AgentFactory
from ieee.agent.agent_input import AgentInput, AgentMessage
from ieee.agent.agent_request_error import AgentRequestError
from ieee.agent.browser_tools import BROWSER_TOOLS
from ieee.agent.member_thread_store import MemberThreadStore
from ieee.agent.tool_call_event_filter import ToolCallEventFilter
from ieee.agent.web.browser_web_service import BrowserWebService
from ieee.agent.web.public_web_url_policy import PublicWebUrlPolicy
from ieee.agent.web.web_fetch_service import WebFetchService
from ieee.agent.web.web_tools import WebTools
from ieee.azure_chat_client import AzureChatClientFactory
from ieee.config import Settings
from ieee.workspace.workspace_service import WorkspaceService

RUN_SECONDS = 90
CONFIGURATION_MESSAGE = ("IEEEAgent needs Azure model settings. Check ~/.agent.config/deployment.ini "
                         "or the AZURE_OPENAI variables and restart the server.")
FAILURE_MESSAGE = "IEEEAgent could not complete this request. Check the server logs and Azure model configuration."
ERROR_CODE = "AGENT_ERROR"
logger = logging.getLogger(__name__)


class AgentService:
    """Runs IEEEAgent through the MAF AG-UI runner and streams its events.

    MAF keeps the thread history in the MemberThreadStore. The member subject is the snapshot scope.
    The browser sends only the new turn: one member message, or the results of all pending browser calls.
    A browser tool call ends the run. The next run continues with the browser result.
    """

    def __init__(self, settings: Settings, workspace: WorkspaceService, models: AzureChatClientFactory,
                 factory: AgentFactory | None = None, threads: MemberThreadStore | None = None):
        self.settings = settings
        self.models = models
        if factory is None:
            urls = PublicWebUrlPolicy()
            factory = AgentFactory(workspace, WebTools(WebFetchService(urls), BrowserWebService(urls)))
        self.factory = factory
        self.threads = threads or MemberThreadStore()
        self.locks: dict[tuple[str, str], asyncio.Lock] = {}
        self.client: SupportsChatGetResponse | None = None

    def available(self) -> bool:
        return self.settings.agent_configured()

    async def events(self, owner: str, input: AgentInput) -> AsyncIterator[BaseEvent]:
        """Yield the AG-UI events of one run. A failure ends the run with RUN_ERROR."""
        started = False
        try:
            if not self.available():
                raise AgentRequestError(CONFIGURATION_MESSAGE)
            async with self._lock(owner, input.thread_id):
                self.threads.admit(owner, input.thread_id)
                run_input = input.run_input(self._new_turn(owner, input))
                run_input[_SNAPSHOT_SCOPE_INPUT_KEY] = owner
                runner = AgentFrameworkAgent(self.factory.create(self._client(), owner), snapshot_store=self.threads,
                                             emit_messages_snapshot=False, require_confirmation=False)
                repeated = ToolCallEventFilter()
                async with asyncio.timeout(RUN_SECONDS):
                    async for event in runner.run(run_input):
                        started = started or event.type == EventType.RUN_STARTED
                        if repeated.accepts(event):
                            yield event
        except Exception as exception:
            message = str(exception) if isinstance(exception, AgentRequestError) else FAILURE_MESSAGE
            logger.warning("Agent run failed: %s", type(exception).__name__)
            if not started:
                yield RunStartedEvent(thread_id=input.thread_id, run_id=input.run_id)
            yield RunErrorEvent(message=message, code=ERROR_CODE)

    def _new_turn(self, owner: str, input: AgentInput) -> list[AgentMessage]:
        """Return the new messages of this turn. Accept browser results only for the pending calls of this thread."""
        pending = self.threads.pending_tool_calls(owner, input.thread_id, set(BROWSER_TOOLS))
        latest = input.messages[-1]
        if latest.role == "tool":
            results: list[AgentMessage] = []
            completed: set[str] = set()
            for message in reversed(input.messages):
                if message.role != "tool" or message.tool_call_id not in pending:
                    break
                if message.tool_call_id in completed:
                    raise AgentRequestError("Duplicate browser tool result.")
                self._check_result(message.content)
                completed.add(message.tool_call_id)
                results.insert(0, message)
            if not results:
                raise AgentRequestError("Unknown or already completed browser tool call.")
            if completed != pending:
                raise AgentRequestError("Return all pending browser tool results together.")
            return results
        if latest.role != "user":
            raise AgentRequestError("The latest message must be from the member or a tool.")
        if pending:
            raise AgentRequestError("Complete the pending browser action before a new request.")
        return [latest]

    @staticmethod
    def _check_result(content: str) -> None:
        """The browser result must be a JSON object."""
        if not isinstance(json.loads(content), dict):
            raise ValueError("The browser tool result is not a JSON object.")

    def _lock(self, owner: str, thread_id: str) -> asyncio.Lock:
        """Return the lock of one thread. Runs of the same thread do not overlap."""
        if len(self.locks) > 2 * self.threads.limit:
            for key in [key for key, lock in self.locks.items() if not lock.locked()]:
                del self.locks[key]
        return self.locks.setdefault((owner, thread_id), asyncio.Lock())

    def _client(self) -> SupportsChatGetResponse:
        """Create the chat client once. All runs share it."""
        if self.client is None:
            self.client = self.models.create()
        return self.client

    async def close(self) -> None:
        """Clear the thread history at server shutdown."""
        await self.threads.clear()
        self.locks.clear()
