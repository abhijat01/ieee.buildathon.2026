from datetime import datetime, timezone
from typing import Annotated, Any
from agent_framework import FunctionTool
from pydantic import Field
from ieee.workspace.workspace_service import WorkspaceService


class WorkspaceTools:
    """Server tools for the workspace of one signed-in member. The browser declares setTheme itself."""

    def __init__(self, workspace: WorkspaceService, owner: str):
        self.workspace = workspace
        self.owner = owner

    def tools(self) -> list[FunctionTool]:
        """Return the tools that run on the server."""
        return [
            FunctionTool(name="listNotes", func=self.list_notes,
                         description="Read the signed-in member's saved workspace notes."),
            FunctionTool(name="saveNote", func=self.save_note,
                         description="Save a workspace note when the member asks to save it."),
            FunctionTool(name="getCurrentTime", func=self.get_current_time,
                         description="Get the current UTC date and time from the server."),
        ]

    def list_notes(self) -> dict[str, Any]:
        return {"notes": [note.model_dump(mode="json") for note in self.workspace.list_notes(self.owner)]}

    def save_note(self, title: Annotated[str, Field(description="Short note title")],
                  body: Annotated[str, Field(description="Note text")]) -> dict[str, Any]:
        return {"note": self.workspace.save_note(self.owner, title, body).model_dump(mode="json")}

    @staticmethod
    def get_current_time() -> dict[str, Any]:
        return {"utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}
