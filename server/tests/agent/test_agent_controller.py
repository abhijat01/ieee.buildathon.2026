import httpx
import json
from fastapi import FastAPI
from ieee.agent.agent_controller import AgentController
from ieee.security.authenticated_user import AuthenticatedUser, current_user
from ieee.security.session_store import ServerSessionMiddleware, SessionStore
from ag_ui_events import AgUiEvents
from test_agent_bridge import service

BODY = {"threadId": "thread-1", "runId": "run-1", "messages": [{"id": "m1", "role": "user", "content": "Use dark"}],
        "tools": [{"name": "setTheme", "description": "Theme", "parameters": {"type": "object"}}], "state": {}, "context": [], "forwardedProps": {}}


def application(signed_in: bool) -> FastAPI:
    app = FastAPI()
    app.include_router(AgentController(service("setTheme")).router)
    app.add_middleware(ServerSessionMiddleware, store=SessionStore(1800), cookie_name="TEST", secure=False)
    if signed_in:
        app.dependency_overrides[current_user] = lambda: AuthenticatedUser("member-a", "Member", None)
    return app


def client(app: FastAPI) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


async def test_streams_ag_ui_events_as_server_sent_events():
    async with client(application(signed_in=True)) as http:
        response = await http.post("/api/agent", json=BODY, headers={"Accept": "text/event-stream"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    frames = [frame for frame in response.text.replace("\r\n", "\n").split("\n\n") if frame.strip()]
    assert all(frame.startswith("data: ") for frame in frames)
    events = [json.loads(frame.removeprefix("data: ")) for frame in frames]
    for event in events:
        AgUiEvents.check(event)
    assert [event["type"] for event in events] == [
        "RUN_STARTED", "TEXT_MESSAGE_START", "TOOL_CALL_START", "TOOL_CALL_ARGS", "TOOL_CALL_END",
        "TEXT_MESSAGE_END", "RUN_FINISHED"]


async def test_requires_a_signed_in_member():
    async with client(application(signed_in=False)) as http:
        response = await http.post("/api/agent", json=BODY)
    assert response.status_code == 401


async def test_rejects_invalid_input():
    async with client(application(signed_in=True)) as http:
        response = await http.post("/api/agent", json={**BODY, "threadId": "bad id"})
    assert response.status_code == 422


async def test_rejects_a_tool_that_the_browser_does_not_run():
    tools = [{"name": "deleteEverything", "description": "", "parameters": {}}]
    async with client(application(signed_in=True)) as http:
        response = await http.post("/api/agent", json={**BODY, "tools": tools})
    assert response.status_code == 422
