from datetime import datetime

from pydantic import BaseModel

from app.schemas.auth import UserResponse


class AdminUserResponse(UserResponse):
    collection_enabled: bool = False
    last_update: datetime | None = None


class AuditLogResponse(BaseModel):
    id: int
    admin_id: int
    admin_name: str | None = None
    action: str
    target_user_id: int | None = None
    target_user_name: str | None = None
    timestamp: datetime
    ip_address: str | None = None
