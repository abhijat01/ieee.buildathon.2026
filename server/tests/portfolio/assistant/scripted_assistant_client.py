import asyncio
from collections.abc import AsyncIterator
from typing import Any
from agent_framework import ChatResponse, ChatResponseUpdate, Content, FunctionInvocationLayer, Message
from ..scripted_chat_client import ScriptedChatClient

Step = list[Content] | Exception


def say(*deltas: str) -> list[Content]:
    return [Content.from_text(delta) for delta in deltas]


def call(call_id: str, name: str, **arguments: Any) -> Content:
    return Content.from_function_call(call_id=call_id, name=name, arguments=arguments)


class ScriptedAssistantClient(FunctionInvocationLayer, ScriptedChatClient):
    """A fake MAF chat client for the assistant. Each model call returns the next step of the script.

    A step is a list of text deltas and tool calls, or an exception. MAF function invocation runs on top of it,
    as on the Azure client. It supports streaming and non-streaming calls.
    """

    def __init__(self, *steps: Step):
        super().__init__()
        self.steps = list(steps)
        self.delay_seconds = 0.0

    def _inner_get_response(self, *, messages: list[Message], stream: bool, options: Any, **kwargs: Any):
        self.requests.append(list(messages))
        self.options.append(options)
        step = self.steps.pop(0)
        if not stream:
            async def respond() -> ChatResponse:
                if isinstance(step, Exception):
                    raise step
                return ChatResponse(messages=[Message(role="assistant", contents=step)])
            return respond()

        async def updates() -> AsyncIterator[ChatResponseUpdate]:
            await asyncio.sleep(self.delay_seconds)
            if isinstance(step, Exception):
                raise step
            for content in step:
                yield ChatResponseUpdate(role="assistant", contents=[content])
        return self._build_response_stream(updates())

    def texts(self, role: str) -> list[str]:
        """Return the text contents of the last request for one role."""
        return [content.text for message in self.requests[-1] if message.role == role
                for content in message.contents if content.type == "text"]

    def tools(self) -> dict[str, dict[str, Any]]:
        """Return the name and the parameter schema of each tool that the model got in the last request."""
        return {tool.name: tool.parameters() for tool in self.options[-1].get("tools") or []}

    def contents(self, *kinds: str) -> list[tuple[str, str]]:
        """Return the kind and the call id of the tool contents in the last request."""
        return [(content.type, content.call_id) for message in self.requests[-1] for content in message.contents
                if content.type in kinds]
