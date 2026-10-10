from pydantic import Field
from ieee.api_model import ApiModel
from ieee.portfolio.assistant.decision_outcome import DecisionOutcome

PROPOSAL_LENGTH = 200


class MemberDecision(ApiModel):
    """One decision of the member, for example: the skill Docker, rejected."""
    proposal: str = Field(min_length=1, max_length=PROPOSAL_LENGTH)
    outcome: DecisionOutcome
