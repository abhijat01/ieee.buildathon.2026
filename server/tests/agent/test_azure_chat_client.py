import json
import pytest
from ieee.agent.agent_factory import AgentFactory
from ieee.agent.agent_input import AgentInput, AgentMessage
from ieee.agent.agent_service import FAILURE_MESSAGE, AgentService
from ieee.agent.web.browser_web_service import BrowserWebService
from ieee.agent.web.web_fetch_service import WebFetchService
from ieee.agent.web.web_tools import WebTools
from ieee.azure_chat_client import AzureChatClientFactory
from ieee.config import Settings
from fake_url_policy import FakeUrlPolicy
from test_agent_bridge import FakeWorkspace

KEY = "private-test-key"
PATH = "/openai/v1/chat/completions"
CHUNK = {"id": "completion", "object": "chat.completion.chunk", "created": 1, "model": "configured-deployment"}
TOOL_CALL = [{**CHUNK, "choices": [{"index": 0, "delta": {"role": "assistant", "tool_calls": [{"index": 0, "id": "azure-call",
             "type": "function", "function": {"name": "listNotes", "arguments": "{}"}}]}, "finish_reason": None}]},
             {**CHUNK, "choices": [{"index": 0, "delta": {}, "finish_reason": "tool_calls"}]}]
ANSWER = [{**CHUNK, "choices": [{"index": 0, "delta": {"role": "assistant", "content": "You have no "}, "finish_reason": None}]},
          {**CHUNK, "choices": [{"index": 0, "delta": {"content": "saved notes."}, "finish_reason": None}]},
          {**CHUNK, "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}]}]


def stream(chunks: list[dict]) -> tuple[int, dict[str, str], str]:
    body = "".join(f"data: {json.dumps(chunk)}\n\n" for chunk in chunks) + "data: [DONE]\n\n"
    return 200, {"Content-Type": "text/event-stream"}, body


def settings(site) -> Settings:
    return Settings(azure_openai_endpoint=site.origin + "/openai/v1/", azure_openai_deployment="configured-deployment",
                    azure_openai_api_key=KEY)


def agent_service(site, workspace: FakeWorkspace) -> AgentService:
    config = settings(site)
    urls = FakeUrlPolicy()
    factory = AgentFactory(workspace, WebTools(WebFetchService(urls), BrowserWebService(urls)))
    return AgentService(config, workspace, AzureChatClientFactory(config), factory)


async def run(agent: AgentService) -> list[dict]:
    input = AgentInput(thread_id="thread", run_id="run-1", tools=[],
                       messages=[AgentMessage(id="m1", role="user", content="Read my notes")])
    return [event.model_dump(mode="json", by_alias=True, exclude_none=True) async for event in agent.events("member", input)]


def header(request, name: str) -> str | None:
    return {key.lower(): value for key, value in request.headers.items()}.get(name)


async def test_azure_transport_sends_the_deployment_and_api_key_and_keeps_tool_results(site):
    site.route(PATH, lambda request: stream(TOOL_CALL if len(site.requests) == 1 else ANSWER))
    workspace = FakeWorkspace()
    events = await run(agent_service(site, workspace))
    assert workspace.owners == ["member"]
    assert [request.path for request in site.requests] == [PATH, PATH]
    assert all(header(request, "api-key") == KEY for request in site.requests)
    first, last = site.requests[0].body, site.requests[-1].body
    assert json.loads(first)["model"] == "configured-deployment" and json.loads(first)["stream"] is True
    assert "listNotes" in first and KEY not in first
    assert '"tool_call_id":"azure-call"' in last.replace(" ", "") and "notes" in last
    assert [event["delta"] for event in events if event["type"] == "TEXT_MESSAGE_CONTENT"] == ["You have no ", "saved notes."]


async def test_provider_errors_report_a_general_message_without_the_credential(site):
    site.route(PATH, lambda request: (401, {"Content-Type": "application/json"}, '{"error":{"message":"denied"}}'))
    events = await run(agent_service(site, FakeWorkspace()))
    errors = [event for event in events if event["type"] == "RUN_ERROR"]
    assert errors == [{"type": "RUN_ERROR", "message": FAILURE_MESSAGE, "code": "AGENT_ERROR"}]
    assert KEY not in json.dumps(events)


def test_missing_settings_raise_a_clear_error():
    models = AzureChatClientFactory(Settings(azure_openai_endpoint="", azure_openai_deployment="",
                                             azure_openai_api_key=""))
    assert not models.configured()
    with pytest.raises(RuntimeError, match="Azure model settings are missing."):
        models.create()
