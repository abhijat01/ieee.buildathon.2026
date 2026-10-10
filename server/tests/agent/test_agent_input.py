import pytest
from pydantic import ValidationError
from ieee.agent.agent_input import AgentInput


def payload(**changes) -> dict:
    data = {"threadId": "thread-1", "runId": "run-1", "tools": [{"name": "setTheme", "parameters": {}}],
            "messages": [{"id": "m1", "role": "user", "content": "Hello"}],
            "state": {}, "context": [], "forwardedProps": {}}
    data.update(changes)
    return data


def test_accepts_the_client_request_and_ignores_extra_fields():
    input = AgentInput.model_validate(payload(messages=[
        {"id": "m1", "role": "tool", "content": "{}", "toolCallId": "call-1"}]))
    assert input.thread_id == "thread-1" and input.messages[0].tool_call_id == "call-1"


@pytest.mark.parametrize("changes", [
    {"threadId": "thread 1"}, {"threadId": "x" * 81}, {"runId": ""}, {"runId": "run_1"},
    {"messages": []}, {"messages": [{"id": "m", "role": "user", "content": "x"}] * 101},
    {"messages": [{"id": "m", "role": "system", "content": "x"}]},
    {"messages": [{"id": "m", "role": "user", "content": "  "}]},
    {"messages": [{"id": "m", "role": "user", "content": "x" * 12001}]},
    {"messages": [{"id": " ", "role": "user", "content": "x"}]},
    {"tools": [{"name": "t"}] * 6}, {"tools": [{"name": ""}]}, {"tools": None},
])
def test_rejects_invalid_requests(changes):
    with pytest.raises(ValidationError):
        AgentInput.model_validate(payload(**changes))
