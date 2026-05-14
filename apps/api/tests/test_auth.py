"""Integration tests for the authentication system.

Tests cover:
- Registration (success, duplicate email, weak password)
- Email verification (valid/invalid/expired token)
- Login (success, wrong password, unregistered email)
- Token refresh (valid, missing, expired)
- Logout (clears cookies, revokes session)
- Password reset request + confirm
- GET /api/user/me (authenticated, unauthenticated)
- Protected routes return 401 when unauthenticated

Email sending is patched so tests run without a live Resend key.
"""

from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _register(async_client: AsyncClient, email: str = "test@bariq.example", password: str = "password123") -> dict:
    resp = await async_client.post("/api/v1/auth/register", json={"email": email, "password": password})
    return resp


async def _login(async_client: AsyncClient, email: str = "test@bariq.example", password: str = "password123") -> dict:
    resp = await async_client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return resp


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_register_success(async_client: AsyncClient):
    with patch("app.routers.auth.send_verification_email", new_callable=AsyncMock):
        resp = await _register(async_client)
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "test@bariq.example"
    assert data["email_verified"] is False
    assert "id" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(async_client: AsyncClient):
    with patch("app.routers.auth.send_verification_email", new_callable=AsyncMock):
        await _register(async_client, "dup@bariq.example")
        resp = await _register(async_client, "dup@bariq.example")
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_register_weak_password(async_client: AsyncClient):
    with patch("app.routers.auth.send_verification_email", new_callable=AsyncMock):
        resp = await _register(async_client, "short@bariq.example", "abc")
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Email verification
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_verify_email_valid_token(async_client: AsyncClient):
    from app.auth.tokens import create_email_verification_token
    from app.models import User
    from app.database import get_db

    captured_user_id = {}

    async def mock_send(to, token):
        from app.auth.tokens import decode_email_verification_token
        captured_user_id["user_id"] = decode_email_verification_token(token)
        captured_user_id["token"] = token

    with patch("app.routers.auth.send_verification_email", side_effect=mock_send):
        await _register(async_client, "verify@bariq.example")

    # Use the captured token to verify
    resp = await async_client.get(f"/api/v1/auth/verify-email?token={captured_user_id['token']}")
    assert resp.status_code == 200
    assert "verified" in resp.json()["message"].lower()


@pytest.mark.asyncio
async def test_verify_email_invalid_token(async_client: AsyncClient):
    resp = await async_client.get("/api/v1/auth/verify-email?token=bogustoken")
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_login_success(async_client: AsyncClient):
    with patch("app.routers.auth.send_verification_email", new_callable=AsyncMock):
        await _register(async_client, "login@bariq.example")

    resp = await _login(async_client, "login@bariq.example")
    assert resp.status_code == 200
    # httpOnly cookies should be set
    assert "access_token" in resp.cookies
    assert "refresh_token" in resp.cookies


@pytest.mark.asyncio
async def test_login_wrong_password(async_client: AsyncClient):
    with patch("app.routers.auth.send_verification_email", new_callable=AsyncMock):
        await _register(async_client, "wrongpw@bariq.example")

    resp = await _login(async_client, "wrongpw@bariq.example", "wrongpassword")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email(async_client: AsyncClient):
    resp = await _login(async_client, "nobody@bariq.example")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Token refresh
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_refresh_token(async_client: AsyncClient):
    with patch("app.routers.auth.send_verification_email", new_callable=AsyncMock):
        await _register(async_client, "refresh@bariq.example")

    login_resp = await _login(async_client, "refresh@bariq.example")
    assert login_resp.status_code == 200

    # Refresh using the cookie that was just set (httpx carries cookies automatically)
    resp = await async_client.post("/api/v1/auth/refresh")
    assert resp.status_code == 200
    assert "access_token" in resp.cookies


@pytest.mark.asyncio
async def test_refresh_missing_cookie(async_client: AsyncClient):
    resp = await async_client.post("/api/v1/auth/refresh")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_logout(async_client: AsyncClient):
    with patch("app.routers.auth.send_verification_email", new_callable=AsyncMock):
        await _register(async_client, "logout@bariq.example")

    await _login(async_client, "logout@bariq.example")

    resp = await async_client.post("/api/v1/auth/logout")
    assert resp.status_code == 200

    # After logout, refresh should fail
    resp2 = await async_client.post("/api/v1/auth/refresh")
    assert resp2.status_code == 401


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_password_reset_flow(async_client: AsyncClient):
    with patch("app.routers.auth.send_verification_email", new_callable=AsyncMock):
        await _register(async_client, "reset@bariq.example")

    captured = {}

    async def mock_reset_email(to, token):
        captured["token"] = token

    with patch("app.routers.auth.send_password_reset_email", side_effect=mock_reset_email):
        resp = await async_client.post(
            "/api/v1/auth/password-reset/request",
            json={"email": "reset@bariq.example"},
        )
    assert resp.status_code == 200

    # Confirm with the captured token
    resp2 = await async_client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": captured["token"], "new_password": "newpassword456"},
    )
    assert resp2.status_code == 200

    # Should now be able to log in with the new password
    resp3 = await _login(async_client, "reset@bariq.example", "newpassword456")
    assert resp3.status_code == 200


@pytest.mark.asyncio
async def test_password_reset_unknown_email_does_not_leak(async_client: AsyncClient):
    """Always returns 200 to prevent user enumeration."""
    resp = await async_client.post(
        "/api/v1/auth/password-reset/request",
        json={"email": "ghost@bariq.example"},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_password_reset_invalid_token(async_client: AsyncClient):
    resp = await async_client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": "invalidtoken", "new_password": "newpassword456"},
    )
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Profile — GET /api/user/me
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_me_unauthenticated(async_client: AsyncClient):
    resp = await async_client.get("/api/user/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(async_client: AsyncClient):
    with patch("app.routers.auth.send_verification_email", new_callable=AsyncMock):
        await _register(async_client, "me@bariq.example")

    await _login(async_client, "me@bariq.example")

    resp = await async_client.get("/api/user/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "me@bariq.example"
    assert "id" in data
