from datetime import UTC, datetime

from fastapi import APIRouter, status

from app.core.config import settings
from app.schemas.health import HealthCheckResponse, HealthStatus

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Application Health Check",
    description="Returns the current operational status, environment, and version of the API.",
)
async def health_check() -> HealthCheckResponse:
    return HealthCheckResponse(
        success=True,
        data=HealthStatus(
            status="healthy",
            timestamp=datetime.now(UTC),
            app_name=settings.PROJECT_NAME,
            version=settings.VERSION,
            environment=settings.ENVIRONMENT,
        ),
    )
