from typing import Annotated
from pydantic import AfterValidator, Field
from ieee.api_model import ApiModel
from ieee.resume.max_length import MaxLength
from ieee.resume.relevance_level import RelevanceLevel
from ieee.resume.resume_limits import ITEM_ID_LENGTH, KEYWORD_COUNT, KEYWORD_LENGTH, REASON_LENGTH

Keyword = Annotated[str, AfterValidator(MaxLength(KEYWORD_LENGTH))]


class ItemReview(ApiModel):
    """The review of one portfolio item by the AI. The model reads the descriptions."""
    item_id: Annotated[str, AfterValidator(MaxLength(ITEM_ID_LENGTH))] = Field(
        description="The id of the portfolio item, copied exactly from the input.")
    relevance: RelevanceLevel = Field(
        description="HIGH when the item shows the main requirements. MEDIUM when it shows some. LOW when it shows none.")
    reason: Annotated[str, AfterValidator(MaxLength(REASON_LENGTH))] = Field(
        description="One or two short sentences for the member. They state why the item has this relevance.")
    matched_keywords: Annotated[list[Keyword], AfterValidator(MaxLength(KEYWORD_COUNT))] = Field(
        description="The job keywords that this item supports. Use the exact words of the keywords list.")
