from datetime import datetime
from ieee.api_model import ApiModel
from ieee.portfolio.experience_type import ExperienceType


class PortfolioItemView(ApiModel):
    """One saved portfolio item, as the UI shows it."""
    id: str
    type: ExperienceType
    title: str
    company: str | None
    start_date: str | None
    end_date: str | None
    skills: list[str]
    text: str
    created_at: datetime
    updated_at: datetime
