from pydantic import Field
from ieee.api_model import ApiModel
from ieee.portfolio.portfolio_limits import TEXT_LENGTH


class AnalyzeRequest(ApiModel):
    """The experience text that the member wants to analyze."""
    text: str = Field(min_length=1, max_length=TEXT_LENGTH, pattern=r"\S")
