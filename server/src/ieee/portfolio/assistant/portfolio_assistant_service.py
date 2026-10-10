import asyncio
import logging
from collections.abc import AsyncIterator
from typing import Any
from ag_ui.core import BaseEvent, EventType, RunErrorEvent, RunStartedEvent
from agent_framework import SupportsChatGetResponse
from agent_framework_ag_ui import AgentFrameworkAgent
# MAF reads the snapshot scope from this run input key. Its own FastAPI endpoint sets the key in the same way.
from agent_framework_ag_ui._snapshots import _SNAPSHOT_SCOPE_INPUT_KEY
from ieee.azure_chat_client import AzureChatClientFactory
from ieee.portfolio.assistant.assistant_input import AssistantInput
from ieee.portfolio.assistant.assistant_message import AssistantMessage
from ieee.portfolio.assistant.assistant_request_error import AssistantRequestError
from ieee.portfolio.assistant.assistant_thread_error import AssistantThreadError
from ieee.portfolio.assistant.assistant_tools import AssistantTools
from ieee.portfolio.assistant.member_thread_store import MemberThreadStore
from ieee.portfolio.assistant.portfolio_assistant_factory import PortfolioAssistantFactory
from ieee.portfolio.assistant.tool_call_event_filter import ToolCallEventFilter
from ieee.portfolio.portfolio_item_not_found import PortfolioItemNotFound
from ieee.portfolio.portfolio_service import PortfolioService

RUN_SECONDS = 90
NOT_AVAILABLE_MESSAGE = "The assistant is not available at this time. You can still change and save the experience."
FAILURE_MESSAGE = "The assistant could not answer. Your changes are safe."
ITEM_MESSAGE = "The assistant cannot find this experience. Open it again from your portfolio."
RESULT_MESSAGE = "The assistant did not get the result of each proposal. Try again."
TURN_MESSAGE = "The assistant waits for the result of a proposal. Try again."
ERROR_CODE = "ASSISTANT_ERROR"
# The stored thread and the new turn do not agree. The browser continues in a new thread.
THREAD_ERROR_CODE = "ASSISTANT_THREAD_ERROR"
logger = logging.getLogger(__name__)


class PortfolioAssistantService:
    """Runs the portfolio assistant through the MAF AG-UI runner and streams its events.

    MAF keeps the thread history in the MemberThreadStore. The member subject is the snapshot scope.
    The browser sends only the new turn: one member message, or the results of all pending frontend tool calls.
    A frontend tool call ends the run. The next run continues with the results.
    """

    def __init__(self, portfolio: PortfolioService, models: AzureChatClientFactory,
                 factory: PortfolioAssistantFactory, tools: AssistantTools, threads: MemberThreadStore,
                 run_seconds: float = RUN_SECONDS):
        self.portfolio = portfolio
        self.models = models
        self.factory = factory
        self.tools = tools
        self.threads = threads
        self.run_seconds = run_seconds
        self.locks: dict[tuple[str, str], asyncio.Lock] = {}
        self.client: SupportsChatGetResponse | None = None

    async def events(self, owner: str, input: AssistantInput) -> AsyncIterator[BaseEvent]:
        """Yield the AG-UI events of one run. A failure ends the run with one RUN_ERROR that has a safe message."""
        started = False
        try:
            if not self.models.configured():
                raise AssistantRequestError(NOT_AVAILABLE_MESSAGE)
            await self._check_owner(owner, input.state.item_id)
            async with self._lock(owner, input.thread_id), asyncio.timeout(self.run_seconds):
                self.threads.admit(owner, input.thread_id)
                runner = AgentFrameworkAgent(self.factory.create(self._client(), input.state),
                                             snapshot_store=self.threads, emit_messages_snapshot=False,
                                             require_confirmation=False)
                repeated = ToolCallEventFilter()
                async for event in runner.run(self._run_input(owner, input)):
                    if event.type == EventType.RUN_ERROR:
                        raise RuntimeError(f"The runner reported an error: {getattr(event, 'message', '')}")
                    started = started or event.type == EventType.RUN_STARTED
                    if repeated.accepts(event):
                        yield event
        except Exception as exception:  # The boundary to the model provider and the AG-UI runner.
            message = str(exception) if isinstance(exception, AssistantRequestError) else FAILURE_MESSAGE
            logger.warning("The assistant run failed: %s: %s", type(exception).__name__, exception)
            if not started:
                yield RunStartedEvent(thread_id=input.thread_id, run_id=input.run_id)
            code = THREAD_ERROR_CODE if isinstance(exception, AssistantThreadError) else ERROR_CODE
            yield RunErrorEvent(message=message, code=code)

    async def _check_owner(self, owner: str, item_id: str) -> None:
        """The member can get help only for an item of the member."""
        try:
            await asyncio.to_thread(self.portfolio.get_item, owner, item_id)
        except PortfolioItemNotFound:
            raise AssistantRequestError(ITEM_MESSAGE) from None

    def _run_input(self, owner: str, input: AssistantInput) -> dict[str, Any]:
        """Return the AG-UI run input for MAF: the new turn, the server tool schemas, and the member scope."""
        return {
            "thread_id": input.thread_id,
            "run_id": input.run_id,
            "messages": [message.model_dump(exclude_none=True) for message in self._new_turn(owner, input)],
            "tools": self.tools.definitions(input.tool_names()),
            "state": {},
            "context": [],
            "forwarded_props": {},
            _SNAPSHOT_SCOPE_INPUT_KEY: owner,
        }

    def _new_turn(self, owner: str, input: AssistantInput) -> list[AssistantMessage]:
        """Return the messages of this turn: one member message, or one result for each pending tool call."""
        pending = self.threads.pending_tool_calls(owner, input.thread_id, AssistantTools.NAMES)
        if all(message.role == "tool" for message in input.messages):
            answered = [message.tool_call_id for message in input.messages]
            if not pending or len(answered) != len(pending) or set(answered) != pending:
                raise AssistantThreadError(RESULT_MESSAGE)
            return input.messages
        if len(input.messages) != 1 or input.messages[0].role != "user" or pending:
            raise AssistantThreadError(TURN_MESSAGE)
        return input.messages

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
