import pytest
from ieee.database import Database


@pytest.fixture
def database(tmp_path) -> Database:
    database = Database(f"sqlite:///{tmp_path}/portfolio.db")
    database.migrate()
    return database
