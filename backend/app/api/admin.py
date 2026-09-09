from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request

from app.core.dependencies import PaginationParams, get_admin_service, get_current_admin
from app.models import User
from app.schemas.admin import AdminUserResponse, AuditLogResponse
from app.schemas.location import LocationResponse
from app.services.admin_service import AdminService

router = APIRouter()


def client_ip(request: Request) -> str | None:
    """Extract client IP from request for audit trails."""
    return request.client.host if request.client else None


@router.get("/users", response_model=list[AdminUserResponse])
def list_users(
    _admin: Annotated[User, Depends(get_current_admin)],
    admin_service: Annotated[AdminService, Depends(get_admin_service)],
) -> list[AdminUserResponse]:
    """List all registered users with their collection status and last update time."""
    return admin_service.list_users()


@router.get("/users/{user_id}/location", response_model=LocationResponse | None)
def get_user_location(
    user_id: int,
    request: Request,
    admin: Annotated[User, Depends(get_current_admin)],
    admin_service: Annotated[AdminService, Depends(get_admin_service)],
) -> LocationResponse | None:
    """Fetch the latest location for a specific user and create an audit log entry."""
    return admin_service.get_user_location(admin, user_id, client_ip(request))


@router.get("/users/{user_id}/locations", response_model=list[LocationResponse])
def get_user_history(
    user_id: int,
    request: Request,
    admin: Annotated[User, Depends(get_current_admin)],
    admin_service: Annotated[AdminService, Depends(get_admin_service)],
    pagination: Annotated[PaginationParams, Depends()],
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
) -> list[LocationResponse]:
    """Retrieve historical location records for a user and log the audit event."""
    return admin_service.get_user_history(
        admin=admin,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        pagination=pagination,
        ip_address=client_ip(request),
    )


@router.get("/audit-logs", response_model=list[AuditLogResponse])
def get_audit_logs(
    request: Request,
    admin: Annotated[User, Depends(get_current_admin)],
    admin_service: Annotated[AdminService, Depends(get_admin_service)],
    pagination: Annotated[PaginationParams, Depends()],
) -> list[AuditLogResponse]:
    """List security audit log entries with user names resolved."""
    return admin_service.get_audit_logs(
        admin=admin,
        pagination=pagination,
        ip_address=client_ip(request),
    )
