"""Increase the text length of portfolio items to 20000 characters."""
from alembic import op
import sqlalchemy as sa

revision = "v6"
down_revision = "v5"


def upgrade() -> None:
    # SQLite cannot change a column. The batch operation copies the table.
    with op.batch_alter_table("portfolio_item") as batch:
        batch.alter_column("original_text", existing_type=sa.String(4000), type_=sa.String(20000), existing_nullable=False)
        batch.alter_column("final_text", existing_type=sa.String(4000), type_=sa.String(20000), existing_nullable=False)
