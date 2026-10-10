import pytest
from agent_framework_ag_ui import AGUIThreadSnapshot
from ieee.portfolio.assistant.assistant_request_error import AssistantRequestError
from ieee.portfolio.assistant.member_thread_store import BUSY_MESSAGE, MemberThreadStore

TOOLS = frozenset({"proposeText", "proposeSkills"})


def snapshot(*messages: dict) -> AGUIThreadSnapshot:
    return AGUIThreadSnapshot(messages=list(messages))


def tool_call(call_id: str, name: str) -> dict:
    return {"id": call_id, "type": "function", "function": {"name": name, "arguments": "{}"}}


async def test_a_thread_belongs_to_one_member():
    store = MemberThreadStore()
    await store.save(scope="member-a", thread_id="thread-1", snapshot=snapshot({"role": "user", "content": "Hello"}))
    assert (await store.get(scope="member-a", thread_id="thread-1")).messages == [{"role": "user", "content": "Hello"}]
    assert await store.get(scope="member-b", thread_id="thread-1") is None
    assert store.messages("member-b", "thread-1") == []
    await store.clear(scope="member-b")
    assert store.size() == 1
    assert await store.delete(scope="member-b", thread_id="thread-1") is False
    assert await store.delete(scope="member-a", thread_id="thread-1") is True


async def test_the_store_returns_copies():
    store = MemberThreadStore()
    await store.save(scope="member-a", thread_id="thread-1", snapshot=snapshot({"role": "user", "content": "Hello"}))
    store.messages("member-a", "thread-1")[0]["content"] = "Changed"
    (await store.get(scope="member-a", thread_id="thread-1")).messages.clear()
    assert store.messages("member-a", "thread-1") == [{"role": "user", "content": "Hello"}]


async def test_a_thread_expires_and_admit_removes_it():
    store = MemberThreadStore(expiry_seconds=-1)
    await store.save(scope="member-a", thread_id="thread-1", snapshot=snapshot({"role": "user", "content": "Hello"}))
    assert await store.get(scope="member-a", thread_id="thread-1") is None
    assert store.messages("member-a", "thread-1") == []
    assert store.pending_tool_calls("member-a", "thread-1", TOOLS) == set()
    assert store.size() == 1
    store.admit("member-a", "thread-2")
    assert store.size() == 0


async def test_a_full_store_refuses_a_new_thread_and_keeps_a_known_thread():
    store = MemberThreadStore(limit=1)
    await store.save(scope="member-a", thread_id="thread-1", snapshot=snapshot())
    store.admit("member-a", "thread-1")
    with pytest.raises(AssistantRequestError, match=BUSY_MESSAGE):
        store.admit("member-b", "thread-2")


async def test_one_member_cannot_fill_the_store_because_a_new_thread_replaces_the_oldest_thread_of_the_member():
    store = MemberThreadStore(limit=4, member_limit=2)
    await store.save(scope="member-b", thread_id="other", snapshot=snapshot())
    for number in range(1, 6):
        store.admit("member-a", f"thread-{number}")
        await store.save(scope="member-a", thread_id=f"thread-{number}", snapshot=snapshot())
    assert store.size() == 3
    assert await store.get(scope="member-a", thread_id="thread-3") is None
    assert await store.get(scope="member-a", thread_id="thread-4") is not None
    assert await store.get(scope="member-a", thread_id="thread-5") is not None
    assert await store.get(scope="member-b", thread_id="other") is not None
    store.admit("member-c", "first")


async def test_pending_tool_calls_are_the_allowlisted_calls_without_a_result():
    store = MemberThreadStore()
    await store.save(scope="member-a", thread_id="thread-1", snapshot=snapshot(
        {"role": "assistant", "tool_calls": [tool_call("call-1", "proposeText"), tool_call("call-2", "proposeSkills"),
                                             tool_call("call-3", "otherTool")]},
        {"role": "tool", "tool_call_id": "call-1", "content": "{}"}))
    assert store.pending_tool_calls("member-a", "thread-1", TOOLS) == {"call-2"}
    assert store.pending_tool_calls("member-b", "thread-1", TOOLS) == set()
