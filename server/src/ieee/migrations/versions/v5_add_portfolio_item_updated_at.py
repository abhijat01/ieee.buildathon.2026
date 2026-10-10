"""Add the date of the last change to portfolio items."""
from alembic import op
import sqlalchemy as sa

revision = "v5"
down_revision = "v4"


def upgrade() -> None:
    op.add_column("portfolio_item", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE portfolio_item SET updated_at = created_at")
    # SQLite cannot change a column. The batch operation copies the table.
    with op.batch_alter_table("portfolio_item") as batch:
        batch.alter_column("updated_at", existing_type=sa.DateTime(timezone=True), nullable=False)
