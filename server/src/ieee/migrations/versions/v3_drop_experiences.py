"""Drop experience entries. The Resume Builder feature no longer exists."""
from alembic import op

revision = "v3"
down_revision = "v2"


def upgrade() -> None:
    op.drop_index("experience_entry_owner", table_name="experience_entry")
    op.drop_table("experience_entry")
