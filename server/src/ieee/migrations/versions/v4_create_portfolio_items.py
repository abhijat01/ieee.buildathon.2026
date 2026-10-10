"""Create portfolio items."""
from alembic import op
import sqlalchemy as sa

revision = "v4"
down_revision = "v3"


def upgrade() -> None:
    op.create_table(
        "portfolio_item",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_id", sa.String(255), nullable=False),
        sa.Column("type", sa.String(16), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("company", sa.String(160)),
        sa.Column("start_date", sa.String(10)),
        sa.Column("end_date", sa.String(10)),
        sa.Column("skills", sa.JSON, nullable=False),
        sa.Column("original_text", sa.String(4000), nullable=False),
        sa.Column("final_text", sa.String(4000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("portfolio_item_owner", "portfolio_item", ["owner_id"])
    op.create_index("portfolio_item_owner_company", "portfolio_item", ["owner_id", "company"])
