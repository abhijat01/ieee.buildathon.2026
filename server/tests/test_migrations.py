from sqlalchemy import inspect, text
from ieee.database import Database

INSERT_ITEM = text(
    "INSERT INTO portfolio_item (id, owner_id, type, title, skills, original_text, final_text, created_at) "
    "VALUES (:id, 'owner', 'PROJECT', :title, '[]', 'Original', 'Final', :created_at)")


def test_migrations_create_notes_and_portfolio_items_and_drop_experience_entries(tmp_path):
    database = Database(f"sqlite:///{tmp_path}/test.db")
    database.migrate()
    inspector = inspect(database.engine)
    assert set(inspector.get_table_names()) == {"alembic_version", "workspace_note", "portfolio_item"}
    indexes = {index["name"] for index in inspector.get_indexes("portfolio_item")}
    assert indexes == {"portfolio_item_owner", "portfolio_item_owner_company"}


def test_migration_v5_adds_updated_at_copies_created_at_and_keeps_the_rows(tmp_path):
    database = Database(f"sqlite:///{tmp_path}/test.db")
    database.migrate("v4")
    with database.engine.begin() as connection:
        connection.execute(INSERT_ITEM, {"id": "one", "title": "Atlas", "created_at": "2026-09-12 10:00:00.000000"})
        connection.execute(INSERT_ITEM, {"id": "two", "title": "Pipeline", "created_at": "2026-08-30 09:30:00.000000"})
    database.migrate()
    columns = {column["name"]: column for column in inspect(database.engine).get_columns("portfolio_item")}
    assert columns["updated_at"]["nullable"] is False
    with database.engine.connect() as connection:
        rows = connection.execute(text(
            "SELECT id, title, original_text, created_at, updated_at FROM portfolio_item ORDER BY id")).all()
    assert [(row.id, row.title, row.original_text) for row in rows] == [("one", "Atlas", "Original"),
                                                                       ("two", "Pipeline", "Original")]
    assert all(row.updated_at == row.created_at for row in rows)
    indexes = {index["name"] for index in inspect(database.engine).get_indexes("portfolio_item")}
    assert indexes == {"portfolio_item_owner", "portfolio_item_owner_company"}
