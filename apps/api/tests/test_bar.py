"""Integration tests for the My Bar ingredient inventory API.

Covers the acceptance criteria from BAR-37:
  - All endpoints require valid session (401 otherwise)
  - Returns ingredient objects (id, name, category, description)
  - Handles duplicate add gracefully (idempotent POST)
  - Integration flow: add → list → delete → list

Email sending is patched so tests run without a live Resend key.
"""

from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Ingredient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _register_and_login(
    async_client: AsyncClient,
    email: str = "bartest@bariq.example",
    password: str = "password123",
) -> None:
    """Register + verify + login; sets auth cookies on the client."""
    with patch("app.routers.auth.send_verification_email", new_callable=AsyncMock):
        reg = await async_client.post(
            "/api/v1/auth/register", json={"email": email, "password": password}
        )
    assert reg.status_code == 201

    # Grab the raw verification token from the DB via the test-only token endpoint
    # (auth tests do the same pattern — replicate it here)
    from app.auth.tokens import create_email_verification_token
    token = create_email_verification_token(str(reg.json()["id"]))
    verify = await async_client.get(f"/api/v1/auth/verify-email?token={token}")
    assert verify.status_code == 200

    login = await async_client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert login.status_code == 200


async def _seed_ingredient(db: AsyncSession, name: str = "Gin") -> Ingredient:
    """Insert a test ingredient directly into the DB and return it."""
    import uuid
    ing = Ingredient(
        id=uuid.uuid4(),
        name=name,
        category="spirit",
        description="A botanical spirit",
    )
    db.add(ing)
    await db.commit()
    await db.refresh(ing)
    return ing


# ---------------------------------------------------------------------------
# 401 tests — unauthenticated requests must be rejected
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_bar_requires_auth(async_client: AsyncClient):
    resp = await async_client.get("/api/user/bar")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_add_to_bar_requires_auth(async_client: AsyncClient):
    import uuid
    resp = await async_client.post(f"/api/user/bar/{uuid.uuid4()}")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_remove_from_bar_requires_auth(async_client: AsyncClient):
    import uuid
    resp = await async_client.delete(f"/api/user/bar/{uuid.uuid4()}")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Core flow: add → list → delete → list
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_bar_full_flow(async_client: AsyncClient, db_session: AsyncSession):
    """add → list → delete → list integration test."""
    await _register_and_login(async_client, email="flow@bariq.example")
    ing = await _seed_ingredient(db_session, name="Campari")

    # 1. Add ingredient → 204
    add_resp = await async_client.post(f"/api/user/bar/{ing.id}")
    assert add_resp.status_code == 204

    # 2. List → contains the ingredient
    list_resp = await async_client.get("/api/user/bar")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    item = data["items"][0]
    assert item["id"] == str(ing.id)
    assert item["name"] == "Campari"
    assert item["category"] == "spirit"

    # 3. Delete → 204
    del_resp = await async_client.delete(f"/api/user/bar/{ing.id}")
    assert del_resp.status_code == 204

    # 4. List → empty
    list_resp2 = await async_client.get("/api/user/bar")
    assert list_resp2.status_code == 200
    assert list_resp2.json()["total"] == 0


# ---------------------------------------------------------------------------
# Idempotent POST
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_add_ingredient_idempotent(async_client: AsyncClient, db_session: AsyncSession):
    """Adding the same ingredient twice must be a no-op (not a 409 or 500)."""
    await _register_and_login(async_client, email="idem@bariq.example")
    ing = await _seed_ingredient(db_session, name="Sweet Vermouth")

    resp1 = await async_client.post(f"/api/user/bar/{ing.id}")
    assert resp1.status_code == 204

    resp2 = await async_client.post(f"/api/user/bar/{ing.id}")
    assert resp2.status_code == 204  # idempotent — not a duplicate error

    # Still only one entry
    list_resp = await async_client.get("/api/user/bar")
    assert list_resp.json()["total"] == 1


# ---------------------------------------------------------------------------
# Error cases
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_add_nonexistent_ingredient(async_client: AsyncClient):
    """POST with an unknown ingredient_id must return 404."""
    import uuid
    await _register_and_login(async_client, email="err1@bariq.example")
    resp = await async_client.post(f"/api/user/bar/{uuid.uuid4()}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_remove_ingredient_not_in_bar(async_client: AsyncClient, db_session: AsyncSession):
    """DELETE an ingredient that was never added returns 404."""
    await _register_and_login(async_client, email="err2@bariq.example")
    ing = await _seed_ingredient(db_session, name="Angostura Bitters")
    resp = await async_client.delete(f"/api/user/bar/{ing.id}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Multiple ingredients
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_bar_multiple_ingredients(async_client: AsyncClient, db_session: AsyncSession):
    """Verify list returns all added ingredients, ordered by name."""
    await _register_and_login(async_client, email="multi@bariq.example")
    rum = await _seed_ingredient(db_session, name="Rum")
    lime = await _seed_ingredient(db_session, name="Lime Juice")

    await async_client.post(f"/api/user/bar/{rum.id}")
    await async_client.post(f"/api/user/bar/{lime.id}")

    list_resp = await async_client.get("/api/user/bar")
    data = list_resp.json()
    assert data["total"] == 2
    names = [i["name"] for i in data["items"]]
    assert names == sorted(names)  # ordered alphabetically
