from dataclasses import dataclass
from ieee.portfolio.experience_period import ExperiencePeriod
from ieee.portfolio.experience_type import ExperienceType


@dataclass(frozen=True)
class ItemContent:
    """The checked values of a portfolio item. PortfolioService creates it after the rules pass."""
    type: ExperienceType
    title: str
    company: str | None
    period: ExperiencePeriod
    skills: list[str]
    final_text: str
