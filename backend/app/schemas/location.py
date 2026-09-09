from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class LocationUpdateRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy: float = Field(ge=0, le=100_000)
    timestamp: datetime | None = None

    @field_validator("timestamp")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            raise ValueError("timestamp must include a timezone")
        return value


class LocationSettingsUpdate(BaseModel):
    collection_enabled: bool


class LocationSettingsResponse(BaseModel):
    id: int
    user_id: int
    collection_enabled: bool
    consent_timestamp: datetime | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class LocationResponse(BaseModel):
    id: int
    user_id: int
    latitude: float
    longitude: float
    accuracy: float
    recorded_at: datetime

    model_config = {"from_attributes": True}


class LocationUpdateResponse(BaseModel):
    success: bool = True
    message: str
    stored: bool
    data: LocationResponse | None = None
