from sqlalchemy import select
from ieee.database import Database
from ieee.portfolio.experience_period import ExperiencePeriod
from ieee.portfolio.portfolio_item import PortfolioItem
from ieee.portfolio.portfolio_item_not_found import PortfolioItemNotFound
from ieee.portfolio.portfolio_item_view import PortfolioItemView
from ieee.portfolio.portfolio_limits import SKILL_COUNT
from ieee.portfolio.portfolio_validation_error import PortfolioValidationError
from ieee.portfolio.save_item_request import SaveItemRequest

TITLE_MESSAGE = "Add a title before you save."
TEXT_MESSAGE = "Add the experience text before you save."
SKILLS_MESSAGE = f"Keep at most {SKILL_COUNT} skills. Remove some skills, then save again."


class PortfolioService:
    """Business rules for the private portfolio items of one owner."""

    def __init__(self, database: Database):
        self.database = database

    def list_items(self, owner: str) -> list[PortfolioItemView]:
        with self.database.session() as session:
            query = (select(PortfolioItem).where(PortfolioItem.owner_id == owner)
                     .order_by(PortfolioItem.created_at.desc()).limit(100))
            return [item.view() for item in session.scalars(query)]

    def get_item(self, owner: str, item_id: str) -> PortfolioItemView:
        with self.database.session() as session:
            query = select(PortfolioItem).where(PortfolioItem.owner_id == owner, PortfolioItem.id == item_id)
            item = session.scalars(query).first()
        if item is None:
            raise PortfolioItemNotFound()
        return item.view()

    def get_items(self, owner: str, item_ids: list[str]) -> list[PortfolioItemView]:
        """Returns the items in the given order. Raises PortfolioItemNotFound if one is not an item of the owner."""
        unique_ids = list(dict.fromkeys(item_ids))
        with self.database.session() as session:
            query = select(PortfolioItem).where(PortfolioItem.owner_id == owner, PortfolioItem.id.in_(unique_ids))
            views = {item.id: item.view() for item in session.scalars(query)}
        if len(views) != len(unique_ids):
            raise PortfolioItemNotFound()
        return [views[item_id] for item_id in unique_ids]

    def save_item(self, owner: str, request: SaveItemRequest) -> PortfolioItemView:
        title = request.title.strip()
        if not title:
            raise PortfolioValidationError(TITLE_MESSAGE)
        if not request.final_text.strip() or not request.original_text.strip():
            raise PortfolioValidationError(TEXT_MESSAGE)
        skills = self._skills(request.skills)
        if len(skills) > SKILL_COUNT:
            raise PortfolioValidationError(SKILLS_MESSAGE)
        period = ExperiencePeriod.parse(request.start_date, request.end_date)
        company = (request.company or "").strip() or None
        with self.database.session() as session, session.begin():
            item = PortfolioItem.create(owner, request.type, title, company, period, skills,
                                        request.original_text, request.final_text)
            session.add(item)
        return item.view()

    @staticmethod
    def _skills(skills: list[str]) -> list[str]:
        """Removes empty and repeated skills. Keeps the order of the member."""
        unique: dict[str, str] = {}
        for skill in skills:
            if skill.strip():
                unique.setdefault(skill.strip().casefold(), skill.strip())
        return list(unique.values())
