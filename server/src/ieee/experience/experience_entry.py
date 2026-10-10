import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from ieee.database import Base
from ieee.experience.experience_fields import ExperienceFields
from ieee.experience.experience_type import ExperienceType
from ieee.experience.saved_experience import SavedExperience


class ExperienceEntry(Base):
    __tablename__ = "experience_entry"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_id: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(32))
    original_input: Mapped[str] = mapped_column(String(4000))
    company: Mapped[str | None] = mapped_column(String(160))
    project_name: Mapped[str | None] = mapped_column(String(160))
    start_date: Mapped[str | None] = mapped_column(String(10))
    end_date: Mapped[str | None] = mapped_column(String(10))
    description: Mapped[str] = mapped_column(String(4000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    @staticmethod
    def create(owner: str, type: ExperienceType, original_input: str, fields: ExperienceFields) -> "ExperienceEntry":
        return ExperienceEntry(id=str(uuid.uuid4()), owner_id=owner, type=type.value, original_input=original_input,
                               company=fields.company, project_name=fields.project_name, start_date=fields.start_date,
                               end_date=fields.end_date, description=fields.description,
                               created_at=datetime.now(timezone.utc))

    def response(self) -> SavedExperience:
        created = self.created_at if self.created_at.tzinfo else self.created_at.replace(tzinfo=timezone.utc)
        return SavedExperience(id=self.id, type=ExperienceType(self.type), original_input=self.original_input,
                               company=self.company, project_name=self.project_name, start_date=self.start_date,
                               end_date=self.end_date, description=self.description, created_at=created)
