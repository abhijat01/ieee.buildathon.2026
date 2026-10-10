from ieee.api_model import ApiModel
from ieee.portfolio.match_level import MatchLevel


class DuplicateMatch(ApiModel):
    """An existing portfolio item that is similar to a new experience."""
    id: str
    title: str
    company: str | None
    start_date: str | None
    end_date: str | None
    level: MatchLevel
    reason: str
