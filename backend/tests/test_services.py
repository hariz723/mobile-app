import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError, ConsentRequiredError
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.common import PaginationParams
from app.schemas.location import LocationSettingsUpdate, LocationUpdateRequest
from app.services.admin_service import AdminService
from app.services.auth_service import AuthService
from app.services.location_service import LocationService


def test_auth_service(db_session: Session):
    service = AuthService(db_session)

    req = RegisterRequest(name="David", email="david@example.com", password="SecurePassword123!")
    res = service.register(req)

    assert res.access_token is not None
    assert res.user.email == "david@example.com"
    assert res.user.role == "user"

    # Login
    login_req = LoginRequest(email="david@example.com", password="SecurePassword123!")
    login_res = service.login(login_req)
    assert login_res.access_token is not None

    # Invalid login raises HTTPException (401)
    bad_req = LoginRequest(email="david@example.com", password="WrongPassword123!")
    with pytest.raises(HTTPException):
        service.login(bad_req)


@pytest.mark.asyncio
async def test_location_service_consent_flow(db_session: Session):
    auth_service = AuthService(db_session)
    location_service = LocationService(db_session)

    res = auth_service.register(RegisterRequest(name="Eve", email="eve@example.com", password="SecurePassword123!"))
    user = auth_service.user_repo.get_by_id(res.user.id)
    assert user is not None

    # Initial settings: collection_enabled should be False
    settings = location_service.get_settings(user)
    assert settings.collection_enabled is False

    # Attempting to update location without consent raises ConsentRequiredError
    with pytest.raises(ConsentRequiredError):
        await location_service.update_location(
            user,
            LocationUpdateRequest(latitude=13.0827, longitude=80.2707, accuracy=10.0),
        )

    # Start collection (grants consent)
    started = location_service.start_collection(user)
    assert started.collection_enabled is True
    assert started.consent_timestamp is not None

    # Now location update should succeed
    update_res = await location_service.update_location(
        user,
        LocationUpdateRequest(latitude=13.0827, longitude=80.2707, accuracy=10.0),
    )
    assert update_res.stored is True
    assert update_res.data is not None
    assert update_res.data.latitude == 13.0827

    # Stop collection (revokes consent)
    stopped = location_service.stop_collection(user)
    assert stopped.collection_enabled is False

    # Update settings validation check: setting collection_enabled=True via PUT raises BadRequestError
    with pytest.raises(BadRequestError):
        location_service.update_settings(user, LocationSettingsUpdate(collection_enabled=True))


def test_admin_service(db_session: Session):
    auth_service = AuthService(db_session)
    admin_service = AdminService(db_session)

    admin_res = auth_service.register(
        RegisterRequest(name="Super Admin", email="superadmin@example.com", password="adminpassword")
    )
    admin_user = auth_service.user_repo.get_by_id(admin_res.user.id)
    assert admin_user is not None
    admin_user.role = "admin"
    db_session.commit()

    user_res = auth_service.register(
        RegisterRequest(name="Standard User", email="standard@example.com", password="userpassword")
    )
    normal_user = auth_service.user_repo.get_by_id(user_res.user.id)
    assert normal_user is not None

    # List users
    users = admin_service.list_users()
    assert len(users) >= 2

    # Get user location (even if None) creates audit log
    loc = admin_service.get_user_location(admin_user, normal_user.id, "127.0.0.1")
    assert loc is None

    # Audit logs
    logs = admin_service.get_audit_logs(admin_user, PaginationParams(skip=0, limit=10), "127.0.0.1")
    assert len(logs) >= 1
