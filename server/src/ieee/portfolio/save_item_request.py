from typing import Annotated
from pydantic import Field
from ieee.api_model import ApiModel
from ieee.portfolio.experience_type import ExperienceType
from ieee.portfolio.portfolio_limits import NAME_LENGTH, SKILL_LENGTH, TEXT_LENGTH

Skill = Annotated[str, Field(max_length=SKILL_LENGTH)]
# A size guard only. PortfolioService owns the rule for the number of skills.
SKILL_LIST_GUARD = 100


class SaveItemRequest(ApiModel):
    """The portfolio item that the member approved. PortfolioService checks the business rules."""
    type: ExperienceType
    title: str = Field(max_length=NAME_LENGTH)
    company: str | None = Field(default=None, max_length=NAME_LENGTH)
    start_date: str | None = Field(default=None, max_length=10)
    end_date: str | None = Field(default=None, max_length=10)
    skills: list[Skill] = Field(default_factory=list, max_length=SKILL_LIST_GUARD)
    original_text: str = Field(max_length=TEXT_LENGTH)
    final_text: str = Field(max_length=TEXT_LENGTH)
