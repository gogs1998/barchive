"""Auth router: registration, email verification, login, logout,
Google OAuth, password reset, and the /api/user/me profile endpoint.

All tokens travel as httpOnly cookies (SameSite=Lax) to protect against XSS.
The access token is short-lived (30 min); the refresh token is opaque, stored
in the DB, and is exchanged for a new access token via POST /api/v1/auth/refresh.
"""

import uuid
from datetime import datetime, timedelta, timezone

from authlib.integrations.httpx_client import AsyncOAuth2Client
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from jose import JWTError
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.email import send_password_reset_email, send_verification_email
from app.auth.tokens import (
    create_access_token,
    create_email_verification_token,
    create_password_reset_token,
    decode_email_verification_token,
    decode_password_reset_token,
    generate_refresh_token,
    hash_password,
    verify_password,
)
from app.config import settings
from app.database import get_db
from app.models import OAuthAccount, Session, User

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------

_SECURE = settings.environment != "development"
_SAMESITE = "lax"


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=_SECURE,
        samesite=_SAMESITE,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=_SECURE,
        samesite=_SAMESITE,
        max_age=settings.refresh_token_expire_days * 86400,
        path="/api/v1/auth/refresh",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/v1/auth/refresh")


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    email_verified: bool


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserOut)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)) -> UserOut:
    """Register a new user with email + password.

    Sends an email-verification link via Resend. Returns 409 if the email is
    already taken.
    """
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        email_verified=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_email_verification_token(str(user.id))
    await send_verification_email(user.email, token)

    return UserOut(id=user.id, email=user.email, email_verified=user.email_verified)


# ---------------------------------------------------------------------------
# Email verification
# ---------------------------------------------------------------------------


@router.get("/verify-email")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)) -> dict:
    """Verify an email address using the token sent by registration."""
    try:
        user_id = decode_email_verification_token(token)
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.email_verified = True
    await db.commit()
    return {"message": "Email verified successfully"}


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


@router.post("/login")
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)) -> dict:
    """Authenticate with email + password.

    Sets httpOnly access_token and refresh_token cookies on success.
    """
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None or user.password_hash is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(str(user.id))
    refresh_token = generate_refresh_token()

    session = Session(
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.now(tz=timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(session)
    await db.commit()

    _set_auth_cookies(response, access_token, refresh_token)
    return {"message": "Logged in"}


# ---------------------------------------------------------------------------
# Token refresh
# ---------------------------------------------------------------------------


@router.post("/refresh")
async def refresh_token(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Exchange a valid refresh token for a new access token."""
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Missing refresh token")

    result = await db.execute(
        select(Session).where(Session.token == refresh_token)
    )
    session = result.scalar_one_or_none()

    if session is None or session.expires_at.replace(tzinfo=timezone.utc) < datetime.now(tz=timezone.utc):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Rotate refresh token
    new_refresh = generate_refresh_token()
    session.token = new_refresh
    session.expires_at = datetime.now(tz=timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    await db.commit()

    new_access = create_access_token(str(session.user_id))
    _set_auth_cookies(response, new_access, new_refresh)
    return {"message": "Token refreshed"}


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------


@router.post("/logout")
async def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Revoke the refresh token session and clear cookies."""
    if refresh_token:
        result = await db.execute(select(Session).where(Session.token == refresh_token))
        session = result.scalar_one_or_none()
        if session:
            await db.delete(session)
            await db.commit()

    _clear_auth_cookies(response)
    return {"message": "Logged out"}


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


@router.get("/google")
async def google_login(request: Request) -> dict:
    """Redirect the user to Google's OAuth consent screen.

    The frontend should redirect to this endpoint to start the OAuth flow.
    Returns the authorization URL so the frontend (SPA) can redirect.
    """
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    async with AsyncOAuth2Client(
        client_id=settings.google_client_id,
        redirect_uri=settings.google_redirect_uri,
        scope="openid email profile",
    ) as client:
        url, state = client.create_authorization_url(GOOGLE_AUTH_URL)

    # State is embedded in the URL; the SPA stores it in sessionStorage
    return {"authorization_url": url}


@router.get("/google/callback")
async def google_callback(
    code: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Handle the OAuth callback, upsert the user, and set auth cookies."""
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    async with AsyncOAuth2Client(
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        redirect_uri=settings.google_redirect_uri,
    ) as client:
        token_data = await client.fetch_token(GOOGLE_TOKEN_URL, code=code)
        userinfo_resp = await client.get(GOOGLE_USERINFO_URL, token=token_data)
    userinfo = userinfo_resp.json()

    google_id: str = userinfo["id"]
    email: str = userinfo["email"]
    email_verified_google: bool = userinfo.get("verified_email", False)

    # Find existing OAuth account
    oauth_result = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.provider == "google",
            OAuthAccount.provider_account_id == google_id,
        )
    )
    oauth_account = oauth_result.scalar_one_or_none()

    if oauth_account:
        user_result = await db.execute(select(User).where(User.id == oauth_account.user_id))
        user = user_result.scalar_one()
    else:
        # Find or create user by email
        user_result = await db.execute(select(User).where(User.email == email))
        user = user_result.scalar_one_or_none()
        if user is None:
            user = User(email=email, password_hash=None, email_verified=email_verified_google)
            db.add(user)
            await db.flush()
        elif email_verified_google and not user.email_verified:
            user.email_verified = True

        oauth_account = OAuthAccount(
            user_id=user.id,
            provider="google",
            provider_account_id=google_id,
        )
        db.add(oauth_account)
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token(str(user.id))
    refresh_token_val = generate_refresh_token()

    session = Session(
        user_id=user.id,
        token=refresh_token_val,
        expires_at=datetime.now(tz=timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(session)
    await db.commit()

    _set_auth_cookies(response, access_token, refresh_token_val)
    return {"message": "Authenticated via Google"}


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------


@router.post("/password-reset/request")
async def request_password_reset(body: PasswordResetRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """Send a password-reset email. Always returns 200 to avoid user enumeration."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user and user.password_hash:  # Only email+password users can reset
        token = create_password_reset_token(str(user.id))
        await send_password_reset_email(user.email, token)

    return {"message": "If that email is registered, a reset link has been sent"}


@router.post("/password-reset/confirm")
async def confirm_password_reset(body: PasswordResetConfirm, db: AsyncSession = Depends(get_db)) -> dict:
    """Apply a new password using the reset token from email."""
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    try:
        user_id = decode_password_reset_token(body.token)
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(body.new_password)
    await db.commit()
    return {"message": "Password updated successfully"}


# ---------------------------------------------------------------------------
# Profile — GET /api/user/me
# (Placed here so auth is self-contained; also registered at the top-level
# prefix /api/user in main.py for the canonical URL.)
# ---------------------------------------------------------------------------


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)) -> UserOut:
    """Return the authenticated user's profile."""
    return UserOut(id=user.id, email=user.email, email_verified=user.email_verified)
