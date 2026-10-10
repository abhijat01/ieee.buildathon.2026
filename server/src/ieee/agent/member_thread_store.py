import copy
import time
from typing import Any
from agent_framework_ag_ui import AGUIThreadSnapshot
from ieee.agent.agent_request_error import AgentRequestError

EXPIRY_SECONDS = 1800
THREAD_LIMIT = 200
BUSY_MESSAGE = "The agent is busy. Please try again later."


class MemberThreadStore:
    """Keeps the AG-UI thread history of each member in memory. It implements AGUIThreadSnapshotStore.

    The scope is the member subject. One member cannot read the threads of another member.
    A thread expires 30 minutes after its last use. A server restart clears all threads.
    """

    def __init__(self, expiry_seconds: int = EXPIRY_SECONDS, limit: int = THREAD_LIMIT):
        self.expiry_seconds = expiry_seconds
        self.limit = limit
        self._threads: dict[tuple[str, str], tuple[float, AGUIThreadSnapshot]] = {}

    def admit(self, scope: str, thread_id: str) -> None:
        """Remove expired threads. Refuse a new thread when the store is full."""
        cutoff = time.monotonic() - self.expiry_seconds
        for key in [key for key, (touched, _) in self._threads.items() if touched < cutoff]:
            del self._threads[key]
        if (scope, thread_id) not in self._threads and len(self._threads) >= self.limit:
            raise AgentRequestError(BUSY_MESSAGE)

    def pending_tool_calls(self, scope: str, thread_id: str, names: set[str]) -> set[str]:
        """Return the identifiers of stored calls to the given tools that have no result yet."""
        entry = self._threads.get((scope, thread_id))
        if entry is None:
            return set()
        called: set[str] = set()
        answered: set[str] = set()
        for message in entry[1].messages:
            for call in message.get("toolCalls") or message.get("tool_calls") or []:
                if call.get("function", {}).get("name") in names and call.get("id"):
                    called.add(str(call["id"]))
            if message.get("role") == "tool":
                answered.add(str(message.get("toolCallId") or message.get("tool_call_id") or ""))
        return called - answered

    async def save(self, *, scope: str, thread_id: str, snapshot: AGUIThreadSnapshot) -> None:
        self._threads[(scope, thread_id)] = (time.monotonic(), copy.deepcopy(snapshot))

    async def get(self, *, scope: str, thread_id: str) -> AGUIThreadSnapshot | None:
        entry = self._threads.get((scope, thread_id))
        if entry is None or entry[0] < time.monotonic() - self.expiry_seconds:
            return None
        return copy.deepcopy(entry[1])

    async def delete(self, *, scope: str, thread_id: str) -> bool:
        return self._threads.pop((scope, thread_id), None) is not None

    async def clear(self, *, scope: str | None = None) -> None:
        for key in [key for key in self._threads if scope is None or key[0] == scope]:
            del self._threads[key]

    def size(self) -> int:
        return len(self._threads)

    def messages(self, scope: str, thread_id: str) -> list[dict[str, Any]]:
        entry = self._threads.get((scope, thread_id))
        return copy.deepcopy(entry[1].messages) if entry else []
