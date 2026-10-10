import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from ieee.api_model import ApiModel
from ieee.database import Base


class WorkspaceNote(Base):
    __tablename__ = "workspace_note"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_id: Mapped[str] = mapped_column(String(255))
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(String(4000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    @staticmethod
    def create(owner_id: str, title: str, body: str) -> "WorkspaceNote":
        return WorkspaceNote(id=str(uuid.uuid4()), owner_id=owner_id, title=title, body=body,
                             created_at=datetime.now(timezone.utc))

    def view(self) -> "NoteView":
        created = self.created_at if self.created_at.tzinfo else self.created_at.replace(tzinfo=timezone.utc)
        return NoteView(id=self.id, title=self.title, body=self.body, created_at=created)


class NoteView(ApiModel):
    id: str
    title: str
    body: str
    created_at: datetime
