"""Audit repository encapsulating AuditLog database queries."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditLog
from app.repositories.base import BaseRepository


class AuditRepository(BaseRepository[AuditLog]):
    def __init__(self, db: Session) -> None:
        super().__init__(db)

    def create(
        self,
        admin_id: int,
        action: str,
        target_user_id: int | None = None,
        ip_address: str | None = None,
        details: str | None = None,
    ) -> AuditLog:
        """Create and persist an audit log entry."""
        log = AuditLog(
            admin_id=admin_id,
            action=action,
            target_user_id=target_user_id,
            ip_address=ip_address,
            details=details,
        )
        self.add(log)
        self.flush()
        return log

    def list_logs(self, skip: int = 0, limit: int = 50) -> list[AuditLog]:
        """Fetch audit log records ordered by timestamp descending."""
        return list(
            self.db.scalars(select(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit)).all()
        )
