from typing import Any
from agent_framework import BaseChatClient, ChatResponse, Content, Message


class ScriptedChatClient(BaseChatClient):
    """A fake MAF chat client. It returns the given reply text and records each request."""

    def __init__(self, reply: str = "", failure: Exception | None = None):
        super().__init__()
        self.reply = reply
        self.failure = failure
        self.requests: list[list[Message]] = []
        self.options: list[Any] = []

    def _inner_get_response(self, *, messages: list[Message], stream: bool, options: Any, **kwargs: Any):
        self.requests.append(list(messages))
        self.options.append(options)

        async def respond() -> ChatResponse:
            if self.failure:
                raise self.failure
            return ChatResponse(messages=[Message(role="assistant", contents=[Content.from_text(self.reply)])],
                                response_format=options.get("response_format"))
        return respond()

    def text_of(self, role: str) -> str:
        return "\n".join(message.text for message in self.requests[-1] if message.role == role)


class ScriptedModels:
    """Replaces AzureChatClientFactory in tests."""

    def __init__(self, client: ScriptedChatClient):
        self.client = client

    def configured(self) -> bool:
        return True

    def create(self) -> ScriptedChatClient:
        return self.client
