from sqlalchemy import select
from ieee.database import Database
from ieee.workspace.workspace_note import NoteView, WorkspaceNote


class WorkspaceService:
    """Business rules for private workspace notes."""

    def __init__(self, database: Database):
        self.database = database

    def list_notes(self, owner: str) -> list[NoteView]:
        with self.database.session() as session:
            query = (select(WorkspaceNote).where(WorkspaceNote.owner_id == owner)
                     .order_by(WorkspaceNote.created_at.desc()).limit(50))
            return [note.view() for note in session.scalars(query)]

    def save_note(self, owner: str, title: str | None, body: str | None) -> NoteView:
        if (not title or not title.strip() or len(title) > 160
                or not body or not body.strip() or len(body) > 4000):
            raise ValueError("A note needs a title and text within the allowed limits.")
        with self.database.session() as session, session.begin():
            note = WorkspaceNote.create(owner, title.strip(), body.strip())
            session.add(note)
        return note.view()
