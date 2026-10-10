from typing import Annotated, Any, Literal
from pydantic import Field, StringConstraints, field_validator
from ieee.agent.browser_tools import BROWSER_TOOLS
from ieee.api_model import ApiModel

RunIdentifier = Annotated[str, StringConstraints(pattern=r"^[a-zA-Z0-9-]{1,80}$")]
NotBlank = Annotated[str, StringConstraints(pattern=r"\S")]


class AgentMessage(ApiModel):
    """One AG-UI conversation message. A tool message carries the result of a browser tool call."""
    id: NotBlank
    role: Literal["user", "assistant", "tool"]
    content: Annotated[str, StringConstraints(pattern=r"\S", max_length=12000)]
    tool_call_id: str | None = None


class AgentTool(ApiModel):
    """A browser tool that the client declares."""
    name: NotBlank
    description: str | None = None
    parameters: Any = None

    @field_validator("name")
    @classmethod
    def allowlisted(cls, name: str) -> str:
        if name not in BROWSER_TOOLS:
            raise ValueError("The browser tool is not supported.")
        return name


class AgentInput(ApiModel):
    """The AG-UI RunAgentInput. The server ignores state, context, and forwardedProps."""
    thread_id: RunIdentifier
    run_id: RunIdentifier
    messages: list[AgentMessage] = Field(min_length=1, max_length=100)
    tools: list[AgentTool] = Field(max_length=5)

    def run_input(self, messages: list[AgentMessage]) -> dict[str, Any]:
        """Return the AG-UI run input for MAF with only the new messages of this turn."""
        return {
            "thread_id": self.thread_id,
            "run_id": self.run_id,
            "messages": [message.model_dump(exclude_none=True) for message in messages],
            "tools": [tool.model_dump(exclude_none=True) for tool in self.tools],
            "state": {},
            "context": [],
            "forwarded_props": {},
        }
