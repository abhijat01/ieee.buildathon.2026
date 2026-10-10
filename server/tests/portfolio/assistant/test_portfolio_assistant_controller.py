import json
from conftest import SignedInClient
from ieee.database import Database
from ieee.main import Application
from ieee.portfolio.assistant.portfolio_assistant_service import FAILURE_MESSAGE, NOT_AVAILABLE_MESSAGE
from ..scripted_chat_client import ScriptedModels
from ..test_portfolio_controller import ITEM
from .assistant_samples import TOOLS, context, user
from .scripted_assistant_client import ScriptedAssistantClient, Step, call, say

PATH = "/api/portfolio/assistant"


class AssistantClients:
    """The full application with a scripted model for the assistant, and one saved item of `member-a`."""

    def __init__(self, settings, *steps: Step):
        application = Application(settings, Database(settings.database_url))
        application.assistant.models = ScriptedModels(ScriptedAssistantClient(*steps))
        self.clients = SignedInClient(application)
        self.item_id = self.clients.member().post("/api/portfolio", json=ITEM).json()["id"]

    def body(self, **changes) -> dict:
        body = {"threadId": "thread-1", "runId": "run-1", "messages": [user("m1", "Improve the text.")],
                "tools": TOOLS, "state": context(self.item_id), "context": [], "forwardedProps": {}}
        return {**body, **changes}


def events(response) -> list[dict]:
    frames = [frame for frame in response.text.replace("\r\n", "\n").split("\n\n") if frame.strip()]
    assert all(frame.startswith("data: ") for frame in frames)
    return [json.loads(frame.removeprefix("data: ")) for frame in frames]


def test_streams_the_ag_ui_events_as_server_sent_events(settings):
    proposal = call("call-1", "proposeSkills", skills=["Docker"])
    assistant = AssistantClients(settings, [*say("The text names Docker."), proposal])
    response = assistant.clients.member().post(PATH, json=assistant.body(), headers={"Accept": "text/event-stream"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.headers["cache-control"] == "no-cache"
    stream = events(response)
    assert [event["type"] for event in stream] == [
        "RUN_STARTED", "TEXT_MESSAGE_START", "TEXT_MESSAGE_CONTENT", "TOOL_CALL_START", "TOOL_CALL_ARGS",
        "TOOL_CALL_END", "TEXT_MESSAGE_END", "RUN_FINISHED"]
    assert stream[3]["toolCallName"] == "proposeSkills" and json.loads(stream[4]["delta"]) == {"skills": ["Docker"]}


def test_needs_a_session_and_the_csrf_token(settings):
    assistant = AssistantClients(settings, say("Done."))
    assert assistant.clients.anonymous().post(PATH, json=assistant.body()).status_code == 401
    response = assistant.clients.member(with_csrf=False).post(PATH, json=assistant.body())
    assert response.status_code == 403 and response.json() == {"message": "Invalid CSRF token."}
    assert assistant.clients.application.assistant.models.client.requests == []


def test_uses_the_signed_in_member_as_the_owner(settings):
    assistant = AssistantClients(settings, say("Done."))
    stream = events(assistant.clients.member(subject="member-b").post(PATH, json=assistant.body()))
    assert [event["type"] for event in stream] == ["RUN_STARTED", "RUN_ERROR"]
    assert "cannot find this experience" in stream[1]["message"]
    assert assistant.clients.application.assistant.models.client.requests == []


def test_rejects_invalid_input_and_a_tool_that_is_not_in_the_allowlist(settings):
    assistant = AssistantClients(settings, say("Done."))
    member = assistant.clients.member()
    for body in (assistant.body(threadId="bad id"), assistant.body(tools=[{"name": "deleteItem"}]),
                 assistant.body(state=context(assistant.item_id, text="x" * 20001))):
        response = member.post(PATH, json=body)
        assert response.status_code == 400 and response.json() == {"message": "The request is invalid."}


def test_a_model_failure_gives_a_safe_run_error_in_the_stream(settings):
    assistant = AssistantClients(settings, RuntimeError("Azure key sk-secret is wrong"))
    response = assistant.clients.member().post(PATH, json=assistant.body())
    assert response.status_code == 200
    assert events(response)[-1] == {"type": "RUN_ERROR", "message": FAILURE_MESSAGE, "code": "ASSISTANT_ERROR"}
    assert "sk-secret" not in response.text


def test_missing_model_settings_give_the_not_available_message(clients):
    member = clients.member()
    item_id = member.post("/api/portfolio", json=ITEM).json()["id"]
    body = {"threadId": "thread-1", "runId": "run-1", "messages": [user("m1", "Hello")], "tools": TOOLS,
            "state": context(item_id)}
    assert events(member.post(PATH, json=body))[-1]["message"] == NOT_AVAILABLE_MESSAGE
    assert member.get("/api/session").json()["aiAvailable"] is False
