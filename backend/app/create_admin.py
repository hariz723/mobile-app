"""CLI command to create or promote an administrator account."""

import argparse
import sys

from app.core.security import hash_password
from app.db import SessionLocal, create_tables
from app.repositories.location_repository import LocationRepository
from app.repositories.user_repository import UserRepository


def create_or_promote_admin(name: str, email: str, password: str) -> None:
    create_tables()
    email_clean = email.strip().lower()

    with SessionLocal() as db:
        user_repo = UserRepository(db)
        loc_repo = LocationRepository(db)

        user = user_repo.get_by_email(email_clean)
        if user:
            user.role = "admin"
            user.name = name.strip()
            user.password_hash = hash_password(password)
            db.commit()
            print(f"Successfully promoted existing user '{email_clean}' to administrator!")
        else:
            user = user_repo.create(
                name=name.strip(),
                email=email_clean,
                password_hash=hash_password(password),
                role="admin",
            )
            loc_repo.get_or_create_settings(user.id, default_enabled=False)
            db.commit()
            print(f"Successfully created new administrator account for '{email_clean}'!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create or promote an administrator user")
    parser.add_argument("--name", default="Administrator", help="Admin display name")
    parser.add_argument("--email", required=True, help="Admin email address")
    parser.add_argument("--password", required=True, help="Admin password (min 12 characters)")
    args = parser.parse_args()

    if len(args.password) < 12:
        print("Error: Password must be at least 12 characters long", file=sys.stderr)
        sys.exit(1)

    create_or_promote_admin(args.name, args.email, args.password)
