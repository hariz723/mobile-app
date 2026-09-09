"""Base repository containing common database session helpers."""

from typing import Generic, TypeVar

from sqlalchemy.orm import Session

ModelT = TypeVar("ModelT")


class BaseRepository(Generic[ModelT]):
    """Generic base class for repositories with a database session."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, entity: ModelT) -> ModelT:
        self.db.add(entity)
        return entity

    def commit(self) -> None:
        self.db.commit()

    def flush(self) -> None:
        self.db.flush()

    def refresh(self, entity: ModelT) -> ModelT:
        self.db.refresh(entity)
        return entity
