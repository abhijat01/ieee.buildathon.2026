from typing import Any
import pytest
from pydantic import ValidationError
from ieee.portfolio.assistant.assistant_input import AssistantInput
from ieee.portfolio.assistant.decision_outcome import DecisionOutcome
from ieee.portfolio.experience_type import ExperienceType
from .assistant_samples import TOOLS, context, result, user

DECISION = {"proposal": "Skill: Docker", "outcome": "rejected"}


def payload(**changes: Any) -> dict[str, Any]:
    body = {"threadId": "thread-1", "runId": "run-1", "messages": [user("m1", "Hello")], "tools": TOOLS,
            "state": context("item-1"), "context": [], "forwardedProps": {}}
    return {**body, **changes}


def test_accepts_the_browser_request_with_the_typed_item_context():
    state = context("item-1", decisions=[DECISION], unsavedChanges=True, company="", endDate="")
    input = AssistantInput.model_validate(payload(state=state, messages=[result("m1", "call-1")]))
    assert (input.thread_id, input.messages[0].tool_call_id) == ("thread-1", "call-1")
    assert input.tool_names() == ["proposeText", "proposeSkills", "proposeFields"]
    assert (input.state.item_id, input.state.type, input.state.unsaved_changes) == ("item-1", ExperienceType.PROJECT, True)
    assert input.state.decisions[0].outcome is DecisionOutcome.REJECTED


def test_ignores_a_schema_from_the_browser_and_other_extra_fields():
    tools = [{"name": "proposeText", "description": "Other", "parameters": {"type": "object"}}]
    input = AssistantInput.model_validate(payload(tools=tools, state={**context("item-1"), "ownerId": "other"}))
    assert input.tools[0].model_dump() == {"name": "proposeText"}
    assert "owner_id" not in input.state.model_dump()


@pytest.mark.parametrize("changes", [
    {"title": "T" * 161}, {"company": "C" * 161}, {"startDate": "2022-03-011"}, {"endDate": "x" * 11},
    {"text": "x" * 4001}, {"skills": ["s" * 41]}, {"skills": ["skill"] * 101}, {"type": "HOBBY"},
    {"itemId": ""}, {"itemId": "i" * 37}, {"decisions": [DECISION] * 31},
    {"decisions": [{"proposal": "Skill: Docker", "outcome": "ignored"}]},
    {"decisions": [{"proposal": "p" * 201, "outcome": "accepted"}]},
])
def test_rejects_an_item_context_that_is_over_a_limit(changes):
    with pytest.raises(ValidationError):
        AssistantInput.model_validate(payload(state=context("item-1", **changes)))


@pytest.mark.parametrize("tools", [
    [{"name": "deleteItem"}], [{"name": ""}], [{"name": "proposeText"}] * 4, [{"description": "No name"}], None,
])
def test_rejects_an_unknown_tool_name_and_too_many_tools(tools):
    with pytest.raises(ValidationError):
        AssistantInput.model_validate(payload(tools=tools))


@pytest.mark.parametrize("messages", [
    [], [user("m", "x")] * 9, [user("m1", "  ")], [user("m1", "x" * 4001)], [user("bad id", "x")],
    [{"id": "m1", "role": "assistant", "content": "x"}], [{"id": "m1", "role": "system", "content": "x"}],
    [result("m1", "")],
])
def test_rejects_messages_over_the_limit_or_with_an_invalid_form(messages):
    with pytest.raises(ValidationError):
        AssistantInput.model_validate(payload(messages=messages))


@pytest.mark.parametrize("changes", [
    {"threadId": "thread 1"}, {"threadId": "x" * 81}, {"runId": ""}, {"runId": "run_1"}, {"state": None}, {"state": {}},
])
def test_rejects_invalid_identifiers_and_a_missing_item_context(changes):
    with pytest.raises(ValidationError):
        AssistantInput.model_validate(payload(**changes))
