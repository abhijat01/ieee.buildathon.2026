from collections.abc import AsyncIterator
from typing import Any
from agent_framework import (BaseChatClient, ChatResponse, ChatResponseUpdate, Content, FunctionInvocationLayer,
                             Message)

ANSWER = ["The action ", "is complete."]


class ScriptedChatClient(FunctionInvocationLayer, BaseChatClient):
    """A fake MAF chat client. It calls the given tools once, then replies with text in two deltas.

    MAF function invocation runs on top of it, as on the Azure client. It supports streaming and non-streaming calls.
    """

    def __init__(self, *tools: str):
        super().__init__()
        self.tools = tools
        self.requests: list[list[Message]] = []

    def _inner_get_response(self, *, messages: list[Message], stream: bool, options: Any, **kwargs: Any):
        self.requests.append(list(messages))
        contents = self._next(messages)
        if not stream:
            async def respond() -> ChatResponse:
                return ChatResponse(messages=[Message(role="assistant", contents=contents)])
            return respond()

        async def updates() -> AsyncIterator[ChatResponseUpdate]:
            for content in contents:
                yield ChatResponseUpdate(role="assistant", contents=[content])
        return self._build_response_stream(updates())

    def _next(self, messages: list[Message]) -> list[Content]:
        results = {content.call_id for message in messages for content in message.contents
                   if content.type == "function_result"}
        expected = {f"call-{index + 1}" for index in range(len(self.tools))}
        if expected <= results:
            return [Content.from_text(text) for text in ANSWER]
        return [Content.from_function_call(call_id=f"call-{index + 1}", name=tool,
                                           arguments={"theme": "dark"} if tool == "setTheme" else {})
                for index, tool in enumerate(self.tools)]
