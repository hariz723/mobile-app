from datetime import UTC, datetime

from pydantic import BaseModel, Field


class HealthStatus(BaseModel):
    status: str = Field(..., json_schema_extra={"example": "healthy"})
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    app_name: str
    version: str
    environment: str


class HealthCheckResponse(BaseModel):
    success: bool = True
    data: HealthStatus
