from typing import Annotated
from pydantic import BaseModel, Field
from ieee.portfolio.portfolio_limits import SKILL_COUNT, SKILL_LENGTH

ProposedSkill = Annotated[str, Field(min_length=1, max_length=SKILL_LENGTH)]


class ProposeSkillsArguments(BaseModel):
    """The parameters of the proposeSkills tool."""
    skills: list[ProposedSkill] = Field(min_length=1, max_length=SKILL_COUNT, description=(
        "The skills to add. Give only skills that the experience names. "
        "Do not give a skill that the skill list already has."))
