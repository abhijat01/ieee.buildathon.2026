from ieee.api_model import ApiModel
from ieee.portfolio.experience_type import ExperienceType
from ieee.resume.relevance_level import RelevanceLevel


class ItemReviewView(ApiModel):
    """One portfolio item with the review of the AI, as the UI shows it."""
    item_id: str
    type: ExperienceType
    title: str
    company: str | None
    start_date: str | None
    end_date: str | None
    relevance: RelevanceLevel
    reason: str
    matched_keywords: list[str]
    proposed: bool
