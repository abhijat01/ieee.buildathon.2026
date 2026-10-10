"""Create experience entries."""
from alembic import op
import sqlalchemy as sa

revision = "v2"
down_revision = "v1"


def upgrade() -> None:
    op.create_table(
        "experience_entry",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_id", sa.String(255), nullable=False),
        sa.Column("type", sa.String(32), nullable=False),
        sa.Column("original_input", sa.String(4000), nullable=False),
        sa.Column("company", sa.String(160)),
        sa.Column("project_name", sa.String(160)),
        sa.Column("start_date", sa.String(10)),
        sa.Column("end_date", sa.String(10)),
        sa.Column("description", sa.String(4000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("experience_entry_owner", "experience_entry", ["owner_id"])
