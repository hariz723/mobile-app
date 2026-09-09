"""Admin service implementing administrative queries and mandatory audit logging."""

from sqlalchemy.orm import Session  # type:ignore

from app.core.exceptions import BadRequestError, NotFoundError
from app.models import User
from app.repositories.audit_repository import AuditRepository
from app.repositories.location_repository import LocationRepository
from app.repositories.user_repository import UserRepository
from app.schemas.admin import AdminUserResponse, AuditLogResponse
from app.schemas.common import PaginationParams
from app.schemas.location import LocationResponse
from app.services.location_service import parse_date_boundary


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.user_repo = UserRepository(db)
        self.location_repo = LocationRepository(db)
        self.audit_repo = AuditRepository(db)

    def get_target_user(self, user_id: int) -> User:
        """Verify that the target user exists or raise NotFoundError."""
        user = self.user_repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found")
        return user

    def list_users(self) -> list[AdminUserResponse]:
        """List all users along with their collection status and latest update timestamp."""
        users = self.user_repo.list_all()
        result: list[AdminUserResponse] = []
        for u in users:
            settings_row = self.location_repo.get_settings(u.id)
            latest_time = self.location_repo.get_latest_recorded_at(u.id)
            result.append(
                AdminUserResponse(
                    id=u.id,
                    name=u.name,
                    email=u.email,
                    role=u.role,
                    created_at=u.created_at,
                    collection_enabled=settings_row.collection_enabled if settings_row else False,
                    last_update=latest_time,
                )
            )
        return result

    def get_user_location(self, admin: User, user_id: int, ip_address: str | None) -> LocationResponse | None:
        """Fetch latest location for a specific user and record audit log."""
        self.get_target_user(user_id)
        location = self.location_repo.get_latest(user_id)

        # Audit log mandatory for sensitive location viewing
        self.audit_repo.create(
            admin_id=admin.id,
            action="VIEW_LATEST_LOCATION",
            target_user_id=user_id,
            ip_address=ip_address,
        )
        self.db.commit()

        return LocationResponse.model_validate(location) if location else None

    def get_user_history(
        self,
        admin: User,
        user_id: int,
        start_date: str | None,
        end_date: str | None,
        pagination: PaginationParams,
        ip_address: str | None,
    ) -> list[LocationResponse]:
        """Fetch location history for a user and record audit log."""
        self.get_target_user(user_id)
        start = parse_date_boundary(start_date, end=False)
        end = parse_date_boundary(end_date, end=True)
        if start and end and start >= end:
            raise BadRequestError("start_date must be before end_date")

        locations = self.location_repo.get_history(
            user_id=user_id,
            start=start,
            end=end,
            skip=pagination.skip,
            limit=pagination.limit,
        )

        self.audit_repo.create(
            admin_id=admin.id,
            action="VIEW_LOCATION_HISTORY",
            target_user_id=user_id,
            ip_address=ip_address,
        )
        self.db.commit()

        return [LocationResponse.model_validate(loc) for loc in locations]

    def get_audit_logs(
        self,
        admin: User,
        pagination: PaginationParams,
        ip_address: str | None,
    ) -> list[AuditLogResponse]:
        """Fetch audit log records with resolved names and record audit log."""
        logs = self.audit_repo.list_logs(skip=pagination.skip, limit=pagination.limit)

        self.audit_repo.create(
            admin_id=admin.id,
            action="VIEW_AUDIT_LOGS",
            target_user_id=None,
            ip_address=ip_address,
        )
        self.db.commit()

        result: list[AuditLogResponse] = []
        for log in logs:
            administrator = self.user_repo.get_by_id(log.admin_id)
            target = self.user_repo.get_by_id(log.target_user_id) if log.target_user_id else None
            result.append(
                AuditLogResponse(
                    id=log.id,
                    admin_id=log.admin_id,
                    admin_name=administrator.name if administrator else None,
                    action=log.action,
                    target_user_id=log.target_user_id,
                    target_user_name=target.name if target else None,
                    timestamp=log.timestamp,
                    ip_address=log.ip_address,
                )
            )
        return result
