import re
from sqlalchemy import select
from ieee.database import Database
from ieee.portfolio.duplicate_match import DuplicateMatch
from ieee.portfolio.experience_period import ExperiencePeriod
from ieee.portfolio.extracted_fields import ExtractedFields
from ieee.portfolio.match_level import MatchLevel
from ieee.portfolio.portfolio_item import PortfolioItem

MATCH_LIMIT = 3
SIMILAR_TITLE = 0.5
COMMON_WORDS = {"the", "and", "for", "with", "from"}


class DuplicateSearchService:
    """Finds the portfolio items of one owner that are similar to a new experience."""

    def __init__(self, database: Database):
        self.database = database

    def find(self, owner: str, fields: ExtractedFields) -> list[DuplicateMatch]:
        with self.database.session() as session:
            query = (select(PortfolioItem).where(PortfolioItem.owner_id == owner)
                     .order_by(PortfolioItem.created_at.desc()).limit(200))
            items = list(session.scalars(query))
        matches = [match for match in (self._compare(fields, item) for item in items) if match]
        matches.sort(key=lambda match: match.level != MatchLevel.VERY_SIMILAR)
        return matches[:MATCH_LIMIT]

    def _compare(self, fields: ExtractedFields, item: PortfolioItem) -> DuplicateMatch | None:
        title = self._title_similarity(fields.title, item.title)
        company = self._same_company(fields.company, item.company)
        period = ExperiencePeriod(fields.start_date, fields.end_date).overlaps(item.period())
        if title >= SIMILAR_TITLE and company:
            level = MatchLevel.VERY_SIMILAR
        elif title >= SIMILAR_TITLE or (company and (title > 0 or period)):
            level = MatchLevel.SOME_OVERLAP
        else:
            return None
        reasons = [name for name, found in (("Similar title", title >= SIMILAR_TITLE),
                                            ("Related title", 0 < title < SIMILAR_TITLE),
                                            ("Same company", company), ("Same period", period)) if found]
        return DuplicateMatch(id=item.id, title=item.title, company=item.company, start_date=item.start_date,
                              end_date=item.end_date, level=level, reason=" · ".join(reasons))

    def _title_similarity(self, first: str, second: str) -> float:
        """Returns the share of title words that the two titles have in common."""
        one, two = self._words(first), self._words(second)
        return len(one & two) / len(one | two) if one and two else 0.0

    @staticmethod
    def _same_company(first: str | None, second: str | None) -> bool:
        return bool(first and second and first.strip().casefold() == second.strip().casefold())

    @staticmethod
    def _words(title: str) -> set[str]:
        return {word for word in re.findall(r"\w+", title.casefold()) if len(word) > 2 and word not in COMMON_WORDS}
