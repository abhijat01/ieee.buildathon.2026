from typing import Annotated, Literal
from pydantic import StringConstraints
from ieee.api_model import ApiModel

MESSAGE_LENGTH = 4000
Identifier = Annotated[str, StringConstraints(pattern=r"^[a-zA-Z0-9_-]{1,80}$")]


class AssistantMessage(ApiModel):
    """One AG-UI message of the new turn. A tool message carries the result of a frontend tool call."""
    id: Identifier
    role: Literal["user", "tool"]
    content: Annotated[str, StringConstraints(pattern=r"\S", max_length=MESSAGE_LENGTH)]
    tool_call_id: Annotated[str, StringConstraints(min_length=1, max_length=120)] | None = None
