"""Location repository encapsulating LocationSettings and LocationPoint database queries."""

from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import LocationPoint, LocationSettings
from app.repositories.base import BaseRepository


class LocationRepository(BaseRepository[LocationPoint]):
    def __init__(self, db: Session) -> None:
        super().__init__(db)

    # ------------------ LocationSettings Queries ------------------

    def get_settings(self, user_id: int) -> LocationSettings | None:
        """Fetch location settings for a user."""
        return self.db.scalar(select(LocationSettings).where(LocationSettings.user_id == user_id))

    def get_or_create_settings(self, user_id: int, default_enabled: bool = False) -> LocationSettings:
        """Get existing location settings or initialize new ones if missing."""
        settings_row = self.get_settings(user_id)
        if settings_row is None:
            settings_row = LocationSettings(user_id=user_id, collection_enabled=default_enabled)
            self.db.add(settings_row)
            self.flush()
        return settings_row

    def update_settings(
        self,
        settings_row: LocationSettings,
        collection_enabled: bool,
        consent_timestamp: datetime | None = None,
    ) -> LocationSettings:
        """Update collection status and consent timestamp."""
        settings_row.collection_enabled = collection_enabled
        if consent_timestamp is not None:
            settings_row.consent_timestamp = consent_timestamp
        self.commit()
        self.refresh(settings_row)
        return settings_row

    def get_latest(self, user_id: int) -> LocationPoint | None:
        """Fetch the most recent location point for a user."""
        return self.db.scalar(
            select(LocationPoint)
            .where(LocationPoint.user_id == user_id)
            .order_by(LocationPoint.recorded_at.desc())
            .limit(1)
        )

    def get_latest_recorded_at(self, user_id: int) -> datetime | None:
        """Fetch just the timestamp of the most recent location update."""
        return self.db.scalar(
            select(LocationPoint.recorded_at)
            .where(LocationPoint.user_id == user_id)
            .order_by(LocationPoint.recorded_at.desc())
            .limit(1)
        )

    def create_location(
        self,
        user_id: int,
        latitude: float,
        longitude: float,
        accuracy: float,
        recorded_at: datetime,
    ) -> LocationPoint:
        """Record a new location point."""
        location = LocationPoint(
            user_id=user_id,
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy,
            recorded_at=recorded_at,
        )
        self.add(location)
        self.commit()
        self.refresh(location)
        return location

    def delete_history_older_than(self, user_id: int, cutoff: datetime) -> int:
        """Enforce data retention policy by purging records older than cutoff."""
        result = self.db.execute(
            delete(LocationPoint).where(LocationPoint.user_id == user_id, LocationPoint.recorded_at < cutoff)
        )
        return result.rowcount

    def get_history(
        self,
        user_id: int,
        start: datetime | None = None,
        end: datetime | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[LocationPoint]:
        """Query location history points for a user with optional date boundaries and pagination."""
        statement = select(LocationPoint).where(LocationPoint.user_id == user_id)
        if start:
            statement = statement.where(LocationPoint.recorded_at >= start)
        if end:
            statement = statement.where(LocationPoint.recorded_at < end)
        statement = statement.order_by(LocationPoint.recorded_at.desc()).offset(skip).limit(limit)
        return list(self.db.scalars(statement).all())
