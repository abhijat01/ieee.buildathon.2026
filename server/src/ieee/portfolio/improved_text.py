from pydantic import Field
from ieee.api_model import ApiModel


class ImprovedText(ApiModel):
    """The improved experience text that the AI proposes. The model reads the descriptions."""
    text: str = Field(description="The improved experience text in Markdown. It contains only facts from the original text.")
    note: str = Field(description="One short sentence for the member. It states what changed and which fact the member can add.")
