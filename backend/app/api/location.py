from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import PaginationParams, get_current_user, get_location_service
from app.models import User
from app.schemas.common import ApiResponse
from app.schemas.location import (
    LocationResponse,
    LocationSettingsResponse,
    LocationSettingsUpdate,
    LocationUpdateRequest,
    LocationUpdateResponse,
)
from app.services.location_service import LocationService, parse_date_boundary  # noqa: F401

router = APIRouter()


@router.get("/settings", response_model=LocationSettingsResponse)
def get_settings(
    user: Annotated[User, Depends(get_current_user)],
    location_service: Annotated[LocationService, Depends(get_location_service)],
) -> LocationSettingsResponse:
    """Retrieve the current user's location collection settings."""
    return location_service.get_settings(user)


@router.put("/settings", response_model=LocationSettingsResponse)
def update_settings(
    payload: LocationSettingsUpdate,
    user: Annotated[User, Depends(get_current_user)],
    location_service: Annotated[LocationService, Depends(get_location_service)],
) -> LocationSettingsResponse:
    """Update location collection settings (disabling collection)."""
    return location_service.update_settings(user, payload)


@router.post("/start", response_model=ApiResponse[LocationSettingsResponse])
def start_collection(
    user: Annotated[User, Depends(get_current_user)],
    location_service: Annotated[LocationService, Depends(get_location_service)],
) -> ApiResponse[LocationSettingsResponse]:
    """Grant affirmative consent and initiate active location collection."""
    updated = location_service.start_collection(user)
    return ApiResponse(
        message="Location collection started",
        data=updated,
    )


@router.post("/stop", response_model=ApiResponse[LocationSettingsResponse])
def stop_collection(
    user: Annotated[User, Depends(get_current_user)],
    location_service: Annotated[LocationService, Depends(get_location_service)],
) -> ApiResponse[LocationSettingsResponse]:
    """Revoke consent and cease location collection."""
    updated = location_service.stop_collection(user)
    return ApiResponse(
        message="Location collection stopped",
        data=updated,
    )


@router.post("/update", response_model=LocationUpdateResponse)
async def update_location(
    payload: LocationUpdateRequest,
    user: Annotated[User, Depends(get_current_user)],
    location_service: Annotated[LocationService, Depends(get_location_service)],
) -> LocationUpdateResponse:
    """Accept and record a location broadcast from the authenticated user."""
    return await location_service.update_location(user, payload)


@router.get("/latest", response_model=LocationResponse | None)
def latest_location(
    user: Annotated[User, Depends(get_current_user)],
    location_service: Annotated[LocationService, Depends(get_location_service)],
) -> LocationResponse | None:
    """Fetch the latest recorded location for the authenticated user."""
    return location_service.get_latest(user)


@router.get("/history", response_model=list[LocationResponse])
def location_history(
    user: Annotated[User, Depends(get_current_user)],
    location_service: Annotated[LocationService, Depends(get_location_service)],
    pagination: Annotated[PaginationParams, Depends()],
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
) -> list[LocationResponse]:
    """Retrieve historical location records for the authenticated user within date boundaries."""
    return location_service.get_history(user, start_date, end_date, pagination)
