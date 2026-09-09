"""Password and bearer-token helpers."""

import hmac
import json
import secrets
from base64 import b64decode, b64encode, urlsafe_b64decode, urlsafe_b64encode
from datetime import UTC, datetime, timedelta
from hashlib import pbkdf2_hmac, sha256

from app.core.config import settings
from app.core.exceptions import UnauthorizedError


def hash_password(password: str) -> str:
    """Hash passwords with a salted, portable stdlib PBKDF2 representation."""
    salt = secrets.token_bytes(16)
    digest = pbkdf2_hmac("sha256", password.encode(), salt, 600_000)
    return f"pbkdf2_sha256$600000${b64encode(salt).decode()}${b64encode(digest).decode()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, rounds, encoded_salt, encoded_digest = password_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        digest = pbkdf2_hmac("sha256", password.encode(), b64decode(encoded_salt), int(rounds))
        return hmac.compare_digest(digest, b64decode(encoded_digest))
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: int) -> str:
    expires = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    if settings.ALGORITHM != "HS256":
        raise RuntimeError("Only HS256 access tokens are supported")
    header = b64url(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = b64url(json.dumps({"sub": str(user_id), "exp": int(expires.timestamp())}, separators=(",", ":")).encode())
    signing_input = f"{header}.{payload}".encode()
    signature = b64url(hmac.new(settings.SECRET_KEY.encode(), signing_input, sha256).digest())
    return f"{header}.{payload}.{signature}"


def decode_access_token(token: str) -> int:
    try:
        header, payload, signature = token.split(".")
        expected = b64url(hmac.new(settings.SECRET_KEY.encode(), f"{header}.{payload}".encode(), sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise ValueError("Bad signature")
        decoded_header = json.loads(b64url_decode(header))
        decoded_payload = json.loads(b64url_decode(payload))
        if decoded_header.get("alg") != "HS256" or int(decoded_payload["exp"]) <= int(datetime.now(UTC).timestamp()):
            raise ValueError("Expired or unsupported token")
        return int(decoded_payload["sub"])
    except (KeyError, TypeError, ValueError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise UnauthorizedError("Invalid or expired access token") from exc


def b64url(value: bytes) -> str:
    return urlsafe_b64encode(value).rstrip(b"=").decode()


def b64url_decode(value: str) -> str:
    return urlsafe_b64decode(value + "=" * (-len(value) % 4)).decode()
