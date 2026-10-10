from pydantic import Field
from ieee.api_model import ApiModel
from ieee.portfolio.portfolio_limits import INSTRUCTION_LENGTH, TEXT_LENGTH


class ImproveRequest(ApiModel):
    """The experience text and the optional instruction for the improvement."""
    text: str = Field(min_length=1, max_length=TEXT_LENGTH, pattern=r"\S")
    instruction: str = Field(default="", max_length=INSTRUCTION_LENGTH)
