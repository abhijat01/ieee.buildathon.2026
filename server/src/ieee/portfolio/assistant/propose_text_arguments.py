from pydantic import BaseModel, Field
from ieee.portfolio.assistant.field_change import REASON_LENGTH
from ieee.portfolio.portfolio_limits import TEXT_LENGTH

LABEL_LENGTH = 40


class ProposeTextArguments(BaseModel):
    """The parameters of the proposeText tool."""
    text: str = Field(min_length=1, max_length=TEXT_LENGTH, description=(
        "The full new experience text in Markdown. It replaces the current text when the member accepts it."))
    label: str = Field(max_length=LABEL_LENGTH, description=(
        "A short name for the proposal, for example: Improved text."))
    reason: str = Field(max_length=REASON_LENGTH, description="One short sentence that says what you changed.")
