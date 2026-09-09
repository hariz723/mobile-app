from typing import TYPE_CHECKING, Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.db import get_db
from app.models import User
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginationParams

if TYPE_CHECKING:
    from app.services.admin_service import AdminService
    from app.services.auth_service import AuthService
    from app.services.location_service import LocationService

bearer_scheme = HTTPBearer(auto_error=False)

__all__ = [
    "PaginationParams",
    "get_admin_service",
    "get_auth_service",
    "get_current_admin",
    "get_current_user",
    "get_location_service",
]


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Resolve the bearer token to its user; never trust a client-supplied user id."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UnauthorizedError()
    user_id = decode_access_token(credentials.credentials)
    user = UserRepository(db).get_by_id(user_id)
    if user is None:
        raise UnauthorizedError("Account no longer exists")
    return user


def get_current_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    """Ensure the authenticated user holds administrator privileges."""
    if user.role != "admin":
        raise ForbiddenError("Administrator access is required")
    return user


def get_auth_service(db: Annotated[Session, Depends(get_db)]) -> "AuthService":
    """Dependency provider for AuthService."""
    from app.services.auth_service import AuthService

    return AuthService(db)


def get_location_service(db: Annotated[Session, Depends(get_db)]) -> "LocationService":
    """Dependency provider for LocationService."""
    from app.services.location_service import LocationService

    return LocationService(db)


def get_admin_service(db: Annotated[Session, Depends(get_db)]) -> "AdminService":
    """Dependency provider for AdminService."""
    from app.services.admin_service import AdminService

    return AdminService(db)
