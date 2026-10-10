import uuid
from datetime import datetime, timezone
from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from ieee.database import Base
from ieee.portfolio.experience_period import ExperiencePeriod
from ieee.portfolio.experience_type import ExperienceType
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

    @staticmethod
    def create(owner_id: str, type: ExperienceType, title: str, company: str | None, period: ExperiencePeriod,
               skills: list[str], original_text: str, final_text: str) -> "PortfolioItem":
        return PortfolioItem(id=str(uuid.uuid4()), owner_id=owner_id, type=type.value, title=title, company=company,
                             start_date=period.start, end_date=period.end, skills=skills,
                             original_text=original_text, final_text=final_text,
                             created_at=datetime.now(timezone.utc))

    def period(self) -> ExperiencePeriod:
        return ExperiencePeriod(self.start_date, self.end_date)

    def view(self) -> PortfolioItemView:
        created = self.created_at if self.created_at.tzinfo else self.created_at.replace(tzinfo=timezone.utc)
        return PortfolioItemView(id=self.id, type=ExperienceType(self.type), title=self.title, company=self.company,
                                 start_date=self.start_date, end_date=self.end_date, skills=list(self.skills),
                                 text=self.final_text, created_at=created)
