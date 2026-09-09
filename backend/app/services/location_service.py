"""Location service implementing consent controls, throttling, retention, and coordinate publishing."""

from datetime import UTC, datetime, timedelta
from math import asin, cos, radians, sin, sqrt

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import BadRequestError, ConsentRequiredError
from app.models import LocationPoint, User
from app.repositories.location_repository import LocationRepository
from app.schemas.common import PaginationParams
from app.schemas.location import (
    LocationResponse,
    LocationSettingsResponse,
    LocationSettingsUpdate,
    LocationUpdateRequest,
    LocationUpdateResponse,
)
from app.services.websocket_manager import location_broadcaster


def utcnow() -> datetime:
    return datetime.now(UTC)


def distance_meters(first: LocationPoint, latitude: float, longitude: float) -> float:
    """Return the great-circle distance between a stored point and a new point."""
    lat_delta = radians(latitude - first.latitude)
    lon_delta = radians(longitude - first.longitude)
    a = sin(lat_delta / 2) ** 2 + cos(radians(first.latitude)) * cos(radians(latitude)) * sin(lon_delta / 2) ** 2
    return 6_371_000 * 2 * asin(sqrt(a))


def parse_date_boundary(value: str | None, *, end: bool) -> datetime | None:
    if value is None:
        return None
    try:
        date_value = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise BadRequestError("Dates must be ISO-8601 values") from exc
    if date_value.tzinfo is None:
        date_value = date_value.replace(tzinfo=UTC)
    if len(value) == 10 and end:
        date_value += timedelta(days=1)
    return date_value


class LocationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.location_repo = LocationRepository(db)

    def get_settings(self, user: User) -> LocationSettingsResponse:
        """Retrieve current location settings for a user."""
        settings_row = self.location_repo.get_or_create_settings(user.id)
        self.db.commit()
        self.db.refresh(settings_row)
        return LocationSettingsResponse.model_validate(settings_row)

    def update_settings(self, user: User, payload: LocationSettingsUpdate) -> LocationSettingsResponse:
        """Update location settings. Enabling must go through /start."""
        if payload.collection_enabled:
            raise BadRequestError("Use POST /location/start to grant consent and begin collection")
        settings_row = self.location_repo.get_or_create_settings(user.id)
        updated = self.location_repo.update_settings(settings_row, collection_enabled=False)
        return LocationSettingsResponse.model_validate(updated)

    def start_collection(self, user: User) -> LocationSettingsResponse:
        """Grant affirmative consent and start real-time location collection."""
        settings_row = self.location_repo.get_or_create_settings(user.id)
        updated = self.location_repo.update_settings(
            settings_row,
            collection_enabled=True,
            consent_timestamp=utcnow(),
        )
        return LocationSettingsResponse.model_validate(updated)

    def stop_collection(self, user: User) -> LocationSettingsResponse:
        """Revoke active collection and stop tracking."""
        settings_row = self.location_repo.get_or_create_settings(user.id)
        updated = self.location_repo.update_settings(settings_row, collection_enabled=False)
        return LocationSettingsResponse.model_validate(updated)

    async def update_location(self, user: User, payload: LocationUpdateRequest) -> LocationUpdateResponse:
        """Validate consent, check throttling and retention, persist point, and broadcast event."""
        settings_row = self.location_repo.get_or_create_settings(user.id)
        if not settings_row.collection_enabled or settings_row.consent_timestamp is None:
            raise ConsentRequiredError()

        recorded_at = payload.timestamp or utcnow()
        if recorded_at > utcnow() + timedelta(minutes=5):
            raise BadRequestError("Location timestamp cannot be more than five minutes in the future")

        # Retention is enforced before each write, so stale records do not build up
        cutoff = utcnow() - timedelta(days=settings.LOCATION_RETENTION_DAYS)
        self.location_repo.delete_history_older_than(user.id, cutoff)

        # Check throttling
        previous = self.location_repo.get_latest(user.id)
        if previous is not None:
            elapsed = (recorded_at - previous.recorded_at).total_seconds()
            moved = distance_meters(previous, payload.latitude, payload.longitude)
            if elapsed < settings.MIN_TIME_INTERVAL_SECONDS and moved < settings.MIN_DISTANCE_METERS:
                self.db.commit()
                return LocationUpdateResponse(message="Location update throttled", stored=False)

        # Persist new location point
        location = self.location_repo.create_location(
            user_id=user.id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            accuracy=payload.accuracy,
            recorded_at=recorded_at,
        )

        response = LocationResponse.model_validate(location)

        # Publish real-time event to connected administrators
        await location_broadcaster.publish(
            {
                "type": "location_update",
                "user_id": user.id,
                "user_name": user.name,
                "latitude": location.latitude,
                "longitude": location.longitude,
                "accuracy": location.accuracy,
                "timestamp": location.recorded_at.isoformat(),
            }
        )

        return LocationUpdateResponse(message="Location update stored", stored=True, data=response)

    def get_latest(self, user: User) -> LocationResponse | None:
        """Fetch latest location point for the user."""
        location = self.location_repo.get_latest(user.id)
        return LocationResponse.model_validate(location) if location else None

    def get_history(
        self,
        user: User,
        start_date: str | None,
        end_date: str | None,
        pagination: PaginationParams,
    ) -> list[LocationResponse]:
        """Fetch location history for the user within date boundaries."""
        start = parse_date_boundary(start_date, end=False)
        end = parse_date_boundary(end_date, end=True)
        if start and end and start >= end:
            raise BadRequestError("start_date must be before end_date")

        locations = self.location_repo.get_history(
            user_id=user.id,
            start=start,
            end=end,
            skip=pagination.skip,
            limit=pagination.limit,
        )
        return [LocationResponse.model_validate(loc) for loc in locations]
