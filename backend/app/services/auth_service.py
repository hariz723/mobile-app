"""Authentication service implementing user registration, authentication, and token generation."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models import User
from app.repositories.location_repository import LocationRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.user_repo = UserRepository(db)
        self.location_repo = LocationRepository(db)

    def create_token_response(self, user: User) -> TokenResponse:
        """Construct a TokenResponse with access token and user info."""
        access_token = create_access_token(user.id)
        return TokenResponse(
            access_token=access_token,
            user=UserResponse.model_validate(user),
        )

    def register(self, payload: RegisterRequest) -> TokenResponse:
        """Register a new user account with default opted-out location settings."""
        if self.user_repo.email_exists(payload.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists",
            )

        password_hash = hash_password(payload.password)
        # Default role is user; admin accounts are provisioned securely
        user = self.user_repo.create(
            name=payload.name,
            email=payload.email,
            password_hash=password_hash,
            role="user",
        )

        # Every account starts opted out; only /location/start records explicit consent
        self.location_repo.get_or_create_settings(user.id, default_enabled=False)

        self.db.commit()
        self.db.refresh(user)
        return self.create_token_response(user)

    def login(self, payload: LoginRequest) -> TokenResponse:
        """Authenticate user credentials and return bearer token."""
        user = self.user_repo.get_by_email(payload.email)
        if user is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )
        return self.create_token_response(user)

    def get_me(self, user: User) -> UserResponse:
        """Return the current user profile."""
        return UserResponse.model_validate(user)
