from typing import Annotated
from pydantic import Field
from ieee.api_model import ApiModel
from ieee.resume.resume_limits import ITEM_COUNT, ITEM_ID_LENGTH, JOB_TEXT_LENGTH, KEYWORD_COUNT, KEYWORD_LENGTH

Keyword = Annotated[str, Field(min_length=1, max_length=KEYWORD_LENGTH)]
ItemId = Annotated[str, Field(min_length=1, max_length=ITEM_ID_LENGTH)]


class WriteResumeRequest(ApiModel):
    """The job description, the job keywords from the analysis, and the items that the member included."""
    job_text: str = Field(min_length=1, max_length=JOB_TEXT_LENGTH, pattern=r"\S")
    keywords: list[Keyword] = Field(max_length=KEYWORD_COUNT)
    item_ids: list[ItemId] = Field(min_length=1, max_length=ITEM_COUNT)
