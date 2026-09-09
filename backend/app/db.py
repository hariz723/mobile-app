"""Database setup shared by API dependencies and application startup."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    """Base class for persisted application entities."""


if settings.sync_database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif settings.sync_database_url.startswith("postgresql"):
    # Avoid making health routes wait on a long TCP timeout when the optional
    # local Postgres service has not been started yet.
    connect_args = {"connect_timeout": 3}
else:
    connect_args = {}
engine = create_engine(settings.sync_database_url, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Generator[Session, None, None]:
    """Yield a request-scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables() -> None:
    """Create the initial schema for development deployments.

    Production deployments should use migrations once the schema is managed by
    Alembic; this keeps a fresh local installation usable in the meantime.
    """
    # Importing here registers every model without creating an import cycle.
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
