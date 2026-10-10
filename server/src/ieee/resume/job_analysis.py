from typing import Annotated
from pydantic import AfterValidator, Field
from ieee.api_model import ApiModel
from ieee.resume.item_review import ItemReview
from ieee.resume.max_length import MaxLength
from ieee.resume.resume_limits import (ITEM_COUNT, JOB_NAME_LENGTH, KEYWORD_COUNT, KEYWORD_LENGTH, REQUIREMENT_COUNT,
                                       REQUIREMENT_LENGTH)

Name = Annotated[str, AfterValidator(MaxLength(JOB_NAME_LENGTH))]
Requirement = Annotated[str, AfterValidator(MaxLength(REQUIREMENT_LENGTH))]
Keyword = Annotated[str, AfterValidator(MaxLength(KEYWORD_LENGTH))]


class JobAnalysis(ApiModel):
    """What the AI found in the job description, and its review of each portfolio item."""
    job_title: Name = Field(description="The job title from the job description.")
    company: Name | None = Field(description="The company that offers the job. Null when the text names none.")
    requirements: Annotated[list[Requirement], AfterValidator(MaxLength(REQUIREMENT_COUNT))] = Field(
        description="The main requirements of the job. At most 8 short lines.")
    keywords: Annotated[list[Keyword], AfterValidator(MaxLength(KEYWORD_COUNT))] = Field(
        description="The skills, tools, and technologies that the job description names. At most 20 short keywords.")
    reviews: Annotated[list[ItemReview], AfterValidator(MaxLength(ITEM_COUNT))] = Field(
        description="One review for each portfolio item of the input. Each item id occurs one time.")
