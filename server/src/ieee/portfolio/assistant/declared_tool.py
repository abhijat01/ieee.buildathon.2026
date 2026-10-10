from pydantic import field_validator
from ieee.api_model import ApiModel
from ieee.portfolio.assistant.assistant_tools import AssistantTools


class DeclaredTool(ApiModel):
    """A frontend tool that the browser declares. The server reads only the name. It ignores a browser schema."""
    name: str

    @field_validator("name")
    @classmethod
    def allowlisted(cls, name: str) -> str:
        if name not in AssistantTools.NAMES:
            raise ValueError("The frontend tool is not supported.")
        return name
