"""Create workspace notes."""
from alembic import op
import sqlalchemy as sa

revision = "v1"
down_revision = None


def upgrade() -> None:
    op.create_table(
        "workspace_note",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_id", sa.String(255), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("body", sa.String(4000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("workspace_note_owner", "workspace_note", ["owner_id"])
