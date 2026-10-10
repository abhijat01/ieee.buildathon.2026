from pydantic import Field
from ieee.api_model import ApiModel
from ieee.resume.resume_limits import JOB_TEXT_LENGTH


class AnalyzeJobRequest(ApiModel):
    """The job description that the member wants to analyze."""
    job_text: str = Field(min_length=1, max_length=JOB_TEXT_LENGTH, pattern=r"\S")
