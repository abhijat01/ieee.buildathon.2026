from typing import Annotated
from pydantic import AfterValidator, Field
from ieee.api_model import ApiModel
from ieee.resume.improved_description import ImprovedDescription
from ieee.resume.max_length import MaxLength
from ieee.resume.resume_limits import ITEM_COUNT, SUMMARY_LENGTH


class TailoredResume(ApiModel):
    """The resume texts that the AI wrote for the job: the summary and one description for each included item."""
    summary: Annotated[str, AfterValidator(MaxLength(SUMMARY_LENGTH))] = Field(
        description="A summary of the member for this job, in one to three sentences. It contains only facts from the items.")
    descriptions: Annotated[list[ImprovedDescription], AfterValidator(MaxLength(ITEM_COUNT))] = Field(
        description="One improved description for each portfolio item of the input. Each item id occurs one time.")
