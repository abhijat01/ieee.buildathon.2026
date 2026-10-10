import uuid
from datetime import datetime, timezone
from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from ieee.database import Base
from ieee.portfolio.experience_period import ExperiencePeriod
from ieee.portfolio.experience_type import ExperienceType
from ieee.portfolio.item_content import ItemContent
from ieee.portfolio.portfolio_item_view import PortfolioItemView


class PortfolioItem(Base):
    """One approved experience in the portfolio of an owner."""
    __tablename__ = "portfolio_item"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_id: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(16))
    title: Mapped[str] = mapped_column(String(160))
    company: Mapped[str | None] = mapped_column(String(160))
    start_date: Mapped[str | None] = mapped_column(String(10))
    end_date: Mapped[str | None] = mapped_column(String(10))
    skills: Mapped[list[str]] = mapped_column(JSON)
    original_text: Mapped[str] = mapped_column(String(4000))
    final_text: Mapped[str] = mapped_column(String(4000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    @staticmethod
    def create(owner_id: str, content: ItemContent, original_text: str) -> "PortfolioItem":
        now = datetime.now(timezone.utc)
        item = PortfolioItem(id=str(uuid.uuid4()), owner_id=owner_id, original_text=original_text, created_at=now)
        item.update(content, now)
        return item

    def update(self, content: ItemContent, now: datetime) -> None:
        """Replaces the fields and the final text. The original text and the creation date stay the same."""
        self.type = content.type.value
        self.title = content.title
        self.company = content.company
        self.start_date = content.period.start
        self.end_date = content.period.end
        self.skills = list(content.skills)
        self.final_text = content.final_text
        self.updated_at = now

    def period(self) -> ExperiencePeriod:
        return ExperiencePeriod(self.start_date, self.end_date)

    def view(self) -> PortfolioItemView:
        return PortfolioItemView(id=self.id, type=ExperienceType(self.type), title=self.title, company=self.company,
                                 start_date=self.start_date, end_date=self.end_date, skills=list(self.skills),
                                 text=self.final_text, created_at=self._in_utc(self.created_at),
                                 updated_at=self._in_utc(self.updated_at))

    @staticmethod
    def _in_utc(moment: datetime) -> datetime:
        """SQLite returns a date without a time zone. The stored dates are in UTC."""
        return moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc)
