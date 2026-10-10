from typing import Annotated
from pydantic import Field, StringConstraints
from ieee.api_model import ApiModel
from ieee.portfolio.assistant.assistant_message import AssistantMessage
from ieee.portfolio.assistant.assistant_tools import AssistantTools
from ieee.portfolio.assistant.declared_tool import DeclaredTool
from ieee.portfolio.assistant.item_context import ItemContext

RunIdentifier = Annotated[str, StringConstraints(pattern=r"^[a-zA-Z0-9-]{1,80}$")]
# One member message, or one result for each tool call of the last answer.
MESSAGE_LIMIT = 8


class AssistantInput(ApiModel):
    """The typed AG-UI run input: the thread, the new turn, the declared tools, and the item context.

    The AG-UI state carries the item context. The server ignores `context` and `forwardedProps`.
    """
    thread_id: RunIdentifier
    run_id: RunIdentifier
    messages: list[AssistantMessage] = Field(min_length=1, max_length=MESSAGE_LIMIT)
    tools: list[DeclaredTool] = Field(max_length=len(AssistantTools.NAMES))
    state: ItemContext

    def tool_names(self) -> list[str]:
        return [tool.name for tool in self.tools]
