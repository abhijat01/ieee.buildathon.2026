from pathlib import Path
from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session


class Base(DeclarativeBase):
    pass


class Database:
    """Owns the engine and the session factory. Alembic owns the schema."""

    def __init__(self, url: str):
        if url.startswith("sqlite:///./"):
            Path(url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
        self.url = url
        self.engine: Engine = create_engine(url)
        self.sessions = sessionmaker(self.engine, expire_on_commit=False)

    def session(self) -> Session:
        return self.sessions()

    def migrate(self) -> None:
        from alembic import command
        from alembic.config import Config
        root = Path(__file__).resolve().parent / "migrations"
        config = Config()
        config.set_main_option("script_location", str(root))
        config.attributes["connection_url"] = self.url
        with self.engine.begin() as connection:
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
