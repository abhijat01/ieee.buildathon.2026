import copy
import time
from typing import Any
from agent_framework_ag_ui import AGUIThreadSnapshot
from ieee.portfolio.assistant.assistant_request_error import AssistantRequestError

EXPIRY_SECONDS = 1800
THREAD_LIMIT = 200
MEMBER_THREAD_LIMIT = 5
BUSY_MESSAGE = "The assistant is busy. Try again later."


class MemberThreadStore:
    """Keeps the AG-UI thread history of each member in memory. It implements AGUIThreadSnapshotStore.

    The scope is the member subject. One member cannot read the threads of another member.
    A thread expires 30 minutes after its last use. A server restart clears all threads.
    """

    def __init__(self, expiry_seconds: float = EXPIRY_SECONDS, limit: int = THREAD_LIMIT,
                 member_limit: int = MEMBER_THREAD_LIMIT):
        self.expiry_seconds = expiry_seconds
        self.limit = limit
        self.member_limit = member_limit
        self._threads: dict[tuple[str, str], tuple[float, AGUIThreadSnapshot]] = {}

    def admit(self, scope: str, thread_id: str) -> None:
        """Remove expired threads. Keep room for a new thread of the member. Refuse it when the store is full."""
        cutoff = time.monotonic() - self.expiry_seconds
        for key in [key for key, (touched, _) in self._threads.items() if touched < cutoff]:
            del self._threads[key]
        if (scope, thread_id) in self._threads:
            return
        self._remove_oldest_of(scope)
        if len(self._threads) >= self.limit:
            raise AssistantRequestError(BUSY_MESSAGE)

    def _remove_oldest_of(self, scope: str) -> None:
        """One member cannot fill the store. A new thread replaces the oldest threads of the same member."""
        own = sorted((key for key in self._threads if key[0] == scope), key=lambda key: self._threads[key][0])
        for key in own[:max(0, len(own) - self.member_limit + 1)]:
            del self._threads[key]

    def pending_tool_calls(self, scope: str, thread_id: str, names: frozenset[str]) -> set[str]:
        """Return the identifiers of stored calls to the given tools that have no result yet."""
        called: set[str] = set()
        answered: set[str] = set()
        for message in self.messages(scope, thread_id):
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
        """Return a copy of the stored messages of one thread. An expired or unknown thread has no messages."""
        entry = self._threads.get((scope, thread_id))
        if entry is None or entry[0] < time.monotonic() - self.expiry_seconds:
            return []
        return copy.deepcopy(entry[1].messages)
