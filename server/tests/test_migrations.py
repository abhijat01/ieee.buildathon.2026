from sqlalchemy import inspect
from ieee.database import Database


def test_migrations_create_notes_and_portfolio_items_and_drop_experience_entries(tmp_path):
    database = Database(f"sqlite:///{tmp_path}/test.db")
    database.migrate()
    inspector = inspect(database.engine)
    assert set(inspector.get_table_names()) == {"alembic_version", "workspace_note", "portfolio_item"}
    indexes = {index["name"] for index in inspector.get_indexes("portfolio_item")}
    assert indexes == {"portfolio_item_owner", "portfolio_item_owner_company"}
