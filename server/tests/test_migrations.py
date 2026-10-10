from sqlalchemy import inspect
from ieee.database import Database


def test_migrations_keep_notes_and_drop_experience_entries(tmp_path):
    database = Database(f"sqlite:///{tmp_path}/test.db")
    database.migrate()
    assert set(inspect(database.engine).get_table_names()) == {"alembic_version", "workspace_note"}
