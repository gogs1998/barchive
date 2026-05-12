"""Integration tests for the saved favourites API (BAR-38).

Covers:
- GET /api/user/favourites — 401 unauthenticated; 200 returns list (empty + populated)
- POST /api/user/favourites/{recipeId} — 204 success; idempotent (double-save); 404 unknown recipe; 401 unauthenticated
- DELETE /api/user/favourites/{recipeId} — 204 success; idempotent (delete twice); 401 unauthenticated
- Full round-trip: save → list → delete → list is empty
"""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Cocktail


# ---------------------------------------------------------------------------
# Test-DB cocktail fixture
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def test_recipe(db_session: AsyncSession) -> Cocktail:
    """Insert a minimal cocktail row directly into the test DB and return it."""
    unique_suffix = uuid.uuid4().hex[:8]
    cocktail = Cocktail(
        id=uuid.uuid4(),
        name=f"Test Negroni {unique_suffix}",
        slug=f"test-negroni-{unique_suffix}",
        description="A classic bittersweet cocktail.",
        method="Stir over ice",
        garnish="Orange peel",
        glassware="Rocks glass",
    )
    db_session.add(cocktail)
    await db_session.commit()
    await db_session.refresh(cocktail)
    return cocktail


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _register_and_login(async_client: AsyncClient, email: str) -> None:
    """Register + login a test user, leaving auth cookies on the client."""
    with patch("app.routers.auth.send_verification_email", new_callable=AsyncMock):
        resp = await async_client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": "password123"},
        )
    assert resp.status_code == 201, resp.text

    login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password123"},
    )
    assert login_resp.status_code == 200, login_resp.text


async def _get_any_recipe_id(async_client: AsyncClient) -> str:
    """Return the id of the first cocktail from the DB (seed data assumed present)."""
    resp = await async_client.get("/api/v1/cocktails?per_page=1")
    assert resp.status_code == 200, resp.text
    items = resp.json()["items"]
    assert items, "No cocktails in test DB — seed data missing"
    return items[0]["id"]


# ---------------------------------------------------------------------------
# Unauthenticated access — 401 on all three endpoints
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_favourites_unauthenticated(async_client: AsyncClient):
    resp = await async_client.get("/api/user/favourites")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_save_favourite_unauthenticated(async_client: AsyncClient):
    resp = await async_client.post(f"/api/user/favourites/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_favourite_unauthenticated(async_client: AsyncClient):
    resp = await async_client.delete(f"/api/user/favourites/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/user/favourites — empty list for new user
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_favourites_empty_for_new_user(async_client: AsyncClient):
    await _register_and_login(async_client, "fav_empty@bariq.example")
    resp = await async_client.get("/api/user/favourites")
    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# POST /api/user/favourites/{recipeId} — save
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_save_favourite_success(async_client: AsyncClient, test_recipe: Cocktail):
    await _register_and_login(async_client, "fav_save@bariq.example")
    recipe_id = str(test_recipe.id)

    resp = await async_client.post(f"/api/user/favourites/{recipe_id}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_save_favourite_idempotent(async_client: AsyncClient, test_recipe: Cocktail):
    """Saving the same recipe twice must return 204 both times."""
    await _register_and_login(async_client, "fav_idem@bariq.example")
    recipe_id = str(test_recipe.id)

    r1 = await async_client.post(f"/api/user/favourites/{recipe_id}")
    assert r1.status_code == 204
    r2 = await async_client.post(f"/api/user/favourites/{recipe_id}")
    assert r2.status_code == 204


@pytest.mark.asyncio
async def test_save_favourite_unknown_recipe(async_client: AsyncClient):
    await _register_and_login(async_client, "fav_404@bariq.example")
    resp = await async_client.post("/api/user/favourites/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/user/favourites — populated
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_favourites_returns_saved_recipe(async_client: AsyncClient, test_recipe: Cocktail):
    await _register_and_login(async_client, "fav_list@bariq.example")
    recipe_id = str(test_recipe.id)

    await async_client.post(f"/api/user/favourites/{recipe_id}")

    resp = await async_client.get("/api/user/favourites")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    item = data[0]
    assert item["id"] == recipe_id
    assert item["isFavourited"] is True
    # Full recipe card fields
    assert "name" in item
    assert "slug" in item
    assert "ingredients" in item
    assert "tags" in item


# ---------------------------------------------------------------------------
# DELETE /api/user/favourites/{recipeId} — unsave
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_favourite_success(async_client: AsyncClient, test_recipe: Cocktail):
    await _register_and_login(async_client, "fav_del@bariq.example")
    recipe_id = str(test_recipe.id)

    await async_client.post(f"/api/user/favourites/{recipe_id}")
    resp = await async_client.delete(f"/api/user/favourites/{recipe_id}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_delete_favourite_idempotent(async_client: AsyncClient, test_recipe: Cocktail):
    """Deleting a recipe that was never saved (or already deleted) returns 204."""
    await _register_and_login(async_client, "fav_del_idem@bariq.example")
    recipe_id = str(test_recipe.id)

    r1 = await async_client.delete(f"/api/user/favourites/{recipe_id}")
    assert r1.status_code == 204
    r2 = await async_client.delete(f"/api/user/favourites/{recipe_id}")
    assert r2.status_code == 204


# ---------------------------------------------------------------------------
# Full round-trip
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_favourite_full_round_trip(async_client: AsyncClient, test_recipe: Cocktail):
    await _register_and_login(async_client, "fav_rt@bariq.example")
    recipe_id = str(test_recipe.id)

    # Initially empty
    r0 = await async_client.get("/api/user/favourites")
    assert r0.json() == []

    # Save
    await async_client.post(f"/api/user/favourites/{recipe_id}")

    # Appears in list
    r1 = await async_client.get("/api/user/favourites")
    ids = [item["id"] for item in r1.json()]
    assert recipe_id in ids

    # Unsave
    await async_client.delete(f"/api/user/favourites/{recipe_id}")

    # List is empty again
    r2 = await async_client.get("/api/user/favourites")
    assert r2.json() == []
