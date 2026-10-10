from typing import Annotated
from pydantic import Field
from ieee.api_model import ApiModel
from ieee.portfolio.assistant.member_decision import MemberDecision
from ieee.portfolio.experience_type import ExperienceType
from ieee.portfolio.portfolio_limits import NAME_LENGTH, SKILL_LENGTH, TEXT_LENGTH
from ieee.portfolio.update_item_request import SKILL_LIST_GUARD

ContextSkill = Annotated[str, Field(max_length=SKILL_LENGTH)]
DECISION_LIMIT = 30


class ItemContext(ApiModel):
    """The open item on the page of the member: its id, the unsaved form values, and the last decisions.

    The values are not saved and can break a save rule. The assistant reads them as data.
    """
    item_id: str = Field(min_length=1, max_length=36)
    type: ExperienceType
    title: str = Field(max_length=NAME_LENGTH)
    company: str = Field(default="", max_length=NAME_LENGTH)
    start_date: str = Field(default="", max_length=10)
    end_date: str = Field(default="", max_length=10)
    skills: list[ContextSkill] = Field(default_factory=list, max_length=SKILL_LIST_GUARD)
    text: str = Field(max_length=TEXT_LENGTH)
    unsaved_changes: bool = False
    decisions: list[MemberDecision] = Field(default_factory=list, max_length=DECISION_LIMIT)
