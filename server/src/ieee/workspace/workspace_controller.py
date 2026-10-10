from fastapi import APIRouter, Depends
from pydantic import Field
from ieee.api_model import ApiModel
from ieee.security.authenticated_user import AuthenticatedUser, current_user
from ieee.workspace.workspace_note import NoteView
from ieee.workspace.workspace_service import WorkspaceService


class NoteInput(ApiModel):
    title: str = Field(min_length=1, max_length=160, pattern=r"\S")
    body: str = Field(min_length=1, max_length=4000, pattern=r"\S")


class WorkspaceController:
    def __init__(self, workspace: WorkspaceService):
        self.workspace = workspace
        self.router = APIRouter(prefix="/api/notes")
        self.router.add_api_route("", self.list, methods=["GET"], response_model=list[NoteView])
        self.router.add_api_route("", self.save, methods=["POST"], response_model=NoteView)

    def list(self, user: AuthenticatedUser = Depends(current_user)) -> list[NoteView]:
        return self.workspace.list_notes(user.subject)

    def save(self, note: NoteInput, user: AuthenticatedUser = Depends(current_user)) -> NoteView:
        return self.workspace.save_note(user.subject, note.title, note.body)
