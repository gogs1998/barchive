"""Password hashing, JWT access-token creation/verification, and refresh-token helpers."""

import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---------------------------------------------------------------------------
# Password
# ---------------------------------------------------------------------------


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# Access token (short-lived JWT)
# ---------------------------------------------------------------------------

ACCESS_TOKEN_TYPE = "access"
EMAIL_TOKEN_TYPE = "email_verification"
RESET_TOKEN_TYPE = "password_reset"


def _create_token(data: dict, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(tz=timezone.utc) + expires_delta
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: str) -> str:
    return _create_token(
        {"sub": user_id, "type": ACCESS_TOKEN_TYPE},
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def decode_access_token(token: str) -> str:
    """Return user_id (sub) or raise JWTError."""
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    if payload.get("type") != ACCESS_TOKEN_TYPE:
        raise JWTError("Wrong token type")
    sub = payload.get("sub")
    if sub is None:
        raise JWTError("Missing sub")
    return sub


# ---------------------------------------------------------------------------
# Email-verification / password-reset tokens (short-lived JWT, single-use by
# convention — actual revocation relies on the token exp + the DB flag update)
# ---------------------------------------------------------------------------

EMAIL_VERIFICATION_EXPIRY = timedelta(hours=24)
PASSWORD_RESET_EXPIRY = timedelta(hours=1)


def create_email_verification_token(user_id: str) -> str:
    return _create_token(
        {"sub": user_id, "type": EMAIL_TOKEN_TYPE},
        EMAIL_VERIFICATION_EXPIRY,
    )


def decode_email_verification_token(token: str) -> str:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    if payload.get("type") != EMAIL_TOKEN_TYPE:
        raise JWTError("Wrong token type")
    sub = payload.get("sub")
    if sub is None:
        raise JWTError("Missing sub")
    return sub


def create_password_reset_token(user_id: str) -> str:
    return _create_token(
        {"sub": user_id, "type": RESET_TOKEN_TYPE},
        PASSWORD_RESET_EXPIRY,
    )


def decode_password_reset_token(token: str) -> str:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    if payload.get("type") != RESET_TOKEN_TYPE:
        raise JWTError("Wrong token type")
    sub = payload.get("sub")
    if sub is None:
        raise JWTError("Missing sub")
    return sub


# ---------------------------------------------------------------------------
# Refresh token (opaque UUID stored in DB)
# ---------------------------------------------------------------------------


def generate_refresh_token() -> str:
    return str(uuid.uuid4())
