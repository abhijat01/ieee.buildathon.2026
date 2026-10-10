from typing import Any
from ieee.agent.agent_factory import AgentFactory
from ieee.agent.agent_input import AgentInput, AgentMessage, AgentTool
from ieee.agent.agent_service import CONFIGURATION_MESSAGE, AgentService
from ieee.agent.member_thread_store import MemberThreadStore
from ieee.agent.web.browser_web_service import BrowserWebService
from ieee.agent.web.web_fetch_service import WebFetchService
from ieee.agent.web.web_tools import WebTools
from ieee.config import Settings
from ag_ui_events import AgUiEvents
from fake_url_policy import FakeUrlPolicy
from scripted_chat_client import ScriptedChatClient

THEME_RESULT = '{"status":"success","theme":"dark"}'
SET_THEME = AgentTool(name="setTheme", description="Change the interface theme to light or dark.",
                      parameters={"type": "object", "properties": {"theme": {"type": "string", "enum": ["light", "dark"]}},
                                  "required": ["theme"]})


class FakeWorkspace:
    def __init__(self):
        self.owners: list[str] = []

    def list_notes(self, owner: str) -> list[Any]:
        self.owners.append(owner)
        return []


class FakeModels:
    def __init__(self, client: ScriptedChatClient):
        self.client = client

    def configured(self) -> bool:
        return True

    def create(self) -> ScriptedChatClient:
        return self.client


def configured_settings() -> Settings:
    return Settings(azure_openai_endpoint="http://localhost/v1/", azure_openai_deployment="test-model",
                    azure_openai_api_key="test-key")


def service(*tools: str, workspace: FakeWorkspace | None = None, settings: Settings | None = None,
            threads: MemberThreadStore | None = None) -> AgentService:
    workspace = workspace or FakeWorkspace()
    urls = FakeUrlPolicy()
    factory = AgentFactory(workspace, WebTools(WebFetchService(urls), BrowserWebService(urls)))
    return AgentService(settings or configured_settings(), workspace, FakeModels(ScriptedChatClient(*tools)), factory,
                        threads)


def message(id: str, role: str, content: str, tool_call_id: str | None = None) -> AgentMessage:
    return AgentMessage(id=id, role=role, content=content, tool_call_id=tool_call_id)


def agent_input(run: str, *messages: AgentMessage, thread: str = "thread-1") -> AgentInput:
    return AgentInput(thread_id=thread, run_id=run, messages=list(messages), tools=[SET_THEME])


async def run(agent: AgentService, owner: str, input: AgentInput) -> list[dict[str, Any]]:
    events = []
    async for event in agent.events(owner, input):
        data = event.model_dump(mode="json", by_alias=True, exclude_none=True)
        AgUiEvents.check(data)
        events.append(data)
    return events


def types(events: list[dict[str, Any]]) -> list[str]:
    return [event["type"] for event in events]


def of_type(events: list[dict[str, Any]], event_type: str) -> list[dict[str, Any]]:
    return [event for event in events if event["type"] == event_type]


def text(events: list[dict[str, Any]]) -> str:
    return "".join(event["delta"] for event in of_type(events, "TEXT_MESSAGE_CONTENT"))


def error(events: list[dict[str, Any]]) -> str:
    return of_type(events, "RUN_ERROR")[0]["message"]


USE_DARK = message("m1", "user", "Use dark theme")
DARK_RESULT = message("m2", "tool", THEME_RESULT, "call-1")


async def test_agent_pauses_for_the_browser_and_resumes_with_its_result():
    agent = service("setTheme")
    first = await run(agent, "member-a", agent_input("run-1", USE_DARK))
    assert types(first)[0] == "RUN_STARTED" and types(first)[-1] == "RUN_FINISHED"
    start = of_type(first, "TOOL_CALL_START")[0]
    assert (start["toolCallId"], start["toolCallName"]) == ("call-1", "setTheme")
    assert of_type(first, "TOOL_CALL_ARGS")[0]["delta"].replace(" ", "") == '{"theme":"dark"}'
    assert of_type(first, "TOOL_CALL_END") and not of_type(first, "TOOL_CALL_RESULT") and not text(first)
    resumed = await run(agent, "member-a", agent_input("run-2", DARK_RESULT))
    assert text(resumed) == "The action is complete."
    assert not of_type(resumed, "TOOL_CALL_START")
    assert resumed[-1]["type"] == "RUN_FINISHED" and resumed[-1]["runId"] == "run-2"


async def test_the_model_sees_the_stored_history_and_the_browser_result():
    agent = service("setTheme")
    await run(agent, "member-a", agent_input("run-1", USE_DARK))
    await run(agent, "member-a", agent_input("run-2", DARK_RESULT))
    last_request = agent.client.requests[-1]
    contents = [(content.type, content.call_id) for item in last_request for content in item.contents
                if content.type in ("function_call", "function_result")]
    assert contents == [("function_call", "call-1"), ("function_result", "call-1")]
    assert any(content.text == "Use dark theme" for item in last_request for content in item.contents)


async def test_server_tool_uses_the_signed_in_owner_and_streams_in_order():
    workspace = FakeWorkspace()
    agent = service("listNotes", workspace=workspace)
    events = await run(agent, "member-a", agent_input("run-1", message("m1", "user", "Read my notes")))
    assert workspace.owners == ["member-a"]
    result = of_type(events, "TOOL_CALL_RESULT")[0]
    assert result["toolCallId"] == "call-1" and "notes" in result["content"]
    assert [event["delta"] for event in of_type(events, "TEXT_MESSAGE_CONTENT")] == ["The action ", "is complete."]
    order = [kind for kind in types(events) if kind.startswith(("RUN_", "TOOL_CALL_START", "TOOL_CALL_RESULT"))]
    assert order == ["RUN_STARTED", "TOOL_CALL_START", "TOOL_CALL_RESULT", "RUN_FINISHED"]
    assert types(events).index("TOOL_CALL_RESULT") < types(events).index("TEXT_MESSAGE_CONTENT")
    assert "MESSAGES_SNAPSHOT" not in types(events)


async def test_a_second_turn_keeps_the_history_without_duplicates():
    agent = service()
    await run(agent, "member-a", agent_input("run-1", message("m1", "user", "First")))
    await run(agent, "member-a", agent_input("run-2", message("m1", "user", "First"), message("m2", "user", "Second")))
    users = [content.text for item in agent.client.requests[-1] if item.role == "user" for content in item.contents]
    assert users == ["First", "Second"]


async def test_completed_browser_results_cannot_be_replayed():
    agent = service("setTheme")
    await run(agent, "member-a", agent_input("run-1", USE_DARK))
    await run(agent, "member-a", agent_input("run-2", DARK_RESULT))
    replay = await run(agent, "member-a", agent_input("run-3", DARK_RESULT))
    assert of_type(replay, "RUN_ERROR")[0] == {"type": "RUN_ERROR", "message": "Unknown or already completed browser tool call.",
                                               "code": "AGENT_ERROR"}


async def test_threads_are_isolated_between_members():
    agent = service("setTheme")
    await run(agent, "member-a", agent_input("run-1", USE_DARK))
    other = await run(agent, "member-b", agent_input("run-2", DARK_RESULT))
    assert error(other) == "Unknown or already completed browser tool call."
    fresh = await run(agent, "member-b", agent_input("run-3", message("m9", "user", "Hello")))
    history = [content.text for item in agent.client.requests[-1] for content in item.contents if content.text]
    assert "Use dark theme" not in history and not of_type(fresh, "RUN_ERROR")


async def test_duplicate_browser_results_are_rejected():
    agent = service("setTheme")
    await run(agent, "member-a", agent_input("run-1", USE_DARK))
    duplicate = await run(agent, "member-a", agent_input("run-2", DARK_RESULT, DARK_RESULT))
    assert error(duplicate) == "Duplicate browser tool result."


async def test_all_pending_browser_results_must_return_together():
    agent = service("setTheme", "setTheme")
    first = await run(agent, "member-a", agent_input("run-1", USE_DARK))
    assert [event["toolCallId"] for event in of_type(first, "TOOL_CALL_START")] == ["call-1", "call-2"]
    assert [event["toolCallId"] for event in of_type(first, "TOOL_CALL_END")] == ["call-1", "call-2"]
    partial = await run(agent, "member-a", agent_input("run-2", DARK_RESULT))
    assert error(partial) == "Return all pending browser tool results together."
    complete = await run(agent, "member-a", agent_input("run-3", DARK_RESULT, message("m3", "tool", THEME_RESULT, "call-2")))
    assert text(complete) == "The action is complete."


async def test_pending_browser_action_blocks_a_new_request():
    agent = service("setTheme")
    await run(agent, "member-a", agent_input("run-1", USE_DARK))
    blocked = await run(agent, "member-a", agent_input("run-2", message("m2", "user", "Hello")))
    assert types(blocked) == ["RUN_STARTED", "RUN_ERROR"]
    assert error(blocked) == "Complete the pending browser action before a new request."


async def test_latest_message_must_be_from_the_member_or_a_tool():
    events = await run(service("setTheme"), "member-a", agent_input("run-1", message("m1", "assistant", "Hi")))
    assert error(events) == "The latest message must be from the member or a tool."


async def test_invalid_browser_result_reports_a_general_error():
    agent = service("setTheme")
    await run(agent, "member-a", agent_input("run-1", USE_DARK))
    events = await run(agent, "member-a", agent_input("run-2", message("m2", "tool", "not json", "call-1")))
    assert error(events).startswith("IEEEAgent could not complete this request.")


async def test_missing_model_settings_report_the_configuration_message():
    agent = service("setTheme", settings=Settings(azure_openai_endpoint="", azure_openai_deployment="",
                                                  azure_openai_api_key=""))
    assert not agent.available()
    events = await run(agent, "member-a", agent_input("run-1", USE_DARK))
    assert types(events) == ["RUN_STARTED", "RUN_ERROR"]
    assert error(events) == CONFIGURATION_MESSAGE


async def test_thread_limit_reports_a_busy_agent():
    agent = service("listNotes", threads=MemberThreadStore(limit=1))
    await run(agent, "member-a", agent_input("run-1", message("m1", "user", "Read my notes")))
    busy = await run(agent, "member-b", agent_input("run-2", message("m1", "user", "Read my notes")))
    assert error(busy) == "The agent is busy. Please try again later."


async def test_expired_threads_are_forgotten():
    agent = service("setTheme", threads=MemberThreadStore(expiry_seconds=-1))
    await run(agent, "member-a", agent_input("run-1", USE_DARK))
    events = await run(agent, "member-a", agent_input("run-2", DARK_RESULT))
    assert error(events) == "Unknown or already completed browser tool call."
