from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.repositories.audit_repository import AuditRepository
from app.repositories.location_repository import LocationRepository
from app.repositories.user_repository import UserRepository


def test_user_repository(db_session: Session):
    repo = UserRepository(db_session)

    assert repo.email_exists("alice@example.com") is False

    user = repo.create("Alice", "alice@example.com", "hashed_pwd_123", role="user")
    db_session.commit()

    assert user.id is not None
    assert user.email == "alice@example.com"
    assert repo.email_exists("alice@example.com") is True

    fetched = repo.get_by_id(user.id)
    assert fetched is not None
    assert fetched.name == "Alice"

    fetched_by_email = repo.get_by_email("alice@example.com")
    assert fetched_by_email is not None
    assert fetched_by_email.id == user.id

    all_users = repo.list_all()
    assert len(all_users) >= 1


def test_location_repository(db_session: Session):
    user_repo = UserRepository(db_session)
    loc_repo = LocationRepository(db_session)

    user = user_repo.create("Bob", "bob@example.com", "pwd", role="user")
    db_session.commit()

    # Settings
    settings = loc_repo.get_or_create_settings(user.id, default_enabled=False)
    assert settings.collection_enabled is False

    now = datetime.now(UTC)
    updated = loc_repo.update_settings(settings, collection_enabled=True, consent_timestamp=now)
    assert updated.collection_enabled is True
    assert updated.consent_timestamp is not None

    # Locations
    loc1 = loc_repo.create_location(user.id, latitude=13.0827, longitude=80.2707, accuracy=10.0, recorded_at=now)
    assert loc1.id is not None

    latest = loc_repo.get_latest(user.id)
    assert latest is not None
    assert latest.latitude == 13.0827

    history = loc_repo.get_history(user.id)
    assert len(history) == 1

    # Cleanup
    older = now - timedelta(days=1)
    purged = loc_repo.delete_history_older_than(user.id, older)
    assert purged == 0


def test_audit_repository(db_session: Session):
    user_repo = UserRepository(db_session)
    audit_repo = AuditRepository(db_session)

    admin = user_repo.create("Admin", "admin@example.com", "pwd", role="admin")
    user = user_repo.create("User", "user@example.com", "pwd", role="user")
    db_session.commit()

    log = audit_repo.create(
        admin_id=admin.id,
        action="VIEW_LATEST_LOCATION",
        target_user_id=user.id,
        ip_address="127.0.0.1",
    )
    db_session.commit()

    assert log.id is not None
    assert log.action == "VIEW_LATEST_LOCATION"

    logs = audit_repo.list_logs()
    assert len(logs) >= 1
