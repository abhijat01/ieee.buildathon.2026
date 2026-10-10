import pytest
from ieee.database import Database


@pytest.fixture
def database(tmp_path) -> Database:
    database = Database(f"sqlite:///{tmp_path}/resume.db")
    database.migrate()
    return database
