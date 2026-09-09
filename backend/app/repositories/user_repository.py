"""User repository encapsulating all User database queries."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session) -> None:
        super().__init__(db)

    def get_by_id(self, user_id: int) -> User | None:
        """Fetch a user by primary key."""
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        """Fetch a user by normalized email address."""
        return self.db.scalar(select(User).where(User.email == email.strip().lower()))

    def email_exists(self, email: str) -> bool:
        """Check if an email is already registered."""
        exists = self.db.scalar(select(User.id).where(User.email == email.strip().lower()))
        return exists is not None

    def create(self, name: str, email: str, password_hash: str, role: str = "user") -> User:
        """Create and persist a new user entity."""
        user = User(
            name=name.strip(),
            email=email.strip().lower(),
            password_hash=password_hash,
            role=role,
        )
        self.add(user)
        self.flush()
        return user

    def list_all(self) -> list[User]:
        """List all users ordered by creation date descending."""
        return list(self.db.scalars(select(User).order_by(User.created_at.desc())).all())
