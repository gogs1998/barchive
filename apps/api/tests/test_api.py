"""
Integration tests for the BarIQ API.
Uses an in-memory SQLite database via aiosqlite to avoid needing a live Postgres.
"""
import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

# Override DATABASE_URL before importing app modules
import os
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")

from app.database import Base, get_db  # noqa: E402
from app.models import Ingredient, Cocktail, CocktailIngredient, Tag, CocktailTag  # noqa: E402
from main import app  # noqa: E402

# ---------------------------------------------------------------------------
# Test database setup
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="session")
def event_loop_policy():
    import asyncio
    return asyncio.DefaultEventLoopPolicy()


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    SessionLocal = async_sessionmaker(db_engine, expire_on_commit=False)
    async with SessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    """AsyncClient with the DB dependency overridden to use our test session."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _seed_test_data(session: AsyncSession):
    """Seed minimal test data."""
    gin = Ingredient(id=uuid.uuid4(), name="Gin", category="spirit", description="London Dry")
    campari = Ingredient(id=uuid.uuid4(), name="Campari", category="liqueur", description="Italian bitter")
    vermouth = Ingredient(id=uuid.uuid4(), name="Sweet Vermouth", category="liqueur", description="Italian vermouth")

    tag_stirred = Tag(id=uuid.uuid4(), name="stirred")
    tag_classic = Tag(id=uuid.uuid4(), name="classic")

    negroni = Cocktail(
        id=uuid.uuid4(),
        name="Negroni",
        slug="negroni",
        description="Equal parts gin, Campari, sweet vermouth.",
        method="Stir over ice.",
        garnish="Orange twist",
        glassware="Rocks glass",
    )

    martini = Cocktail(
        id=uuid.uuid4(),
        name="Martini",
        slug="martini",
        description="Gin and dry vermouth.",
        method="Stir over ice.",
        garnish="Olive",
        glassware="Martini glass",
    )

    session.add_all([gin, campari, vermouth, tag_stirred, tag_classic, negroni, martini])
    await session.flush()

    # Negroni ingredients
    session.add(CocktailIngredient(cocktail_id=negroni.id, ingredient_id=gin.id, quantity="30", unit="ml"))
    session.add(CocktailIngredient(cocktail_id=negroni.id, ingredient_id=campari.id, quantity="30", unit="ml"))
    session.add(CocktailIngredient(cocktail_id=negroni.id, ingredient_id=vermouth.id, quantity="30", unit="ml"))

    # Tags
    session.add(CocktailTag(cocktail_id=negroni.id, tag_id=tag_stirred.id))
    session.add(CocktailTag(cocktail_id=negroni.id, tag_id=tag_classic.id))

    await session.commit()

    return {
        "gin": gin, "campari": campari, "vermouth": vermouth,
        "negroni": negroni, "martini": martini,
        "tag_stirred": tag_stirred, "tag_classic": tag_classic,
    }


# ---------------------------------------------------------------------------
# Health tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health_ok(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["db"] == "ok"


# ---------------------------------------------------------------------------
# Cocktail list tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_cocktails_empty(client):
    response = await client.get("/api/v1/cocktails")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []
    assert data["page"] == 1
    assert data["per_page"] == 20


@pytest.mark.asyncio
async def test_list_cocktails_with_data(client, db_session):
    await _seed_test_data(db_session)
    response = await client.get("/api/v1/cocktails")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_list_cocktails_search(client, db_session):
    await _seed_test_data(db_session)
    response = await client.get("/api/v1/cocktails?q=negroni")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["slug"] == "negroni"


@pytest.mark.asyncio
async def test_list_cocktails_search_no_match(client, db_session):
    await _seed_test_data(db_session)
    response = await client.get("/api/v1/cocktails?q=zzznomatch")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_cocktails_pagination(client, db_session):
    await _seed_test_data(db_session)
    response = await client.get("/api/v1/cocktails?page=1&per_page=1")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 1
    assert data["page"] == 1
    assert data["per_page"] == 1


@pytest.mark.asyncio
async def test_list_cocktails_pagination_page2(client, db_session):
    await _seed_test_data(db_session)
    response = await client.get("/api/v1/cocktails?page=2&per_page=1")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1


@pytest.mark.asyncio
async def test_list_cocktails_invalid_page(client):
    response = await client.get("/api/v1/cocktails?page=0")
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Cocktail detail tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_cocktail_by_slug(client, db_session):
    await _seed_test_data(db_session)
    response = await client.get("/api/v1/cocktails/negroni")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Negroni"
    assert data["slug"] == "negroni"
    assert len(data["ingredients"]) == 3
    assert len(data["tags"]) == 2


@pytest.mark.asyncio
async def test_get_cocktail_ingredients_detail(client, db_session):
    await _seed_test_data(db_session)
    response = await client.get("/api/v1/cocktails/negroni")
    assert response.status_code == 200
    data = response.json()
    names = {i["name"] for i in data["ingredients"]}
    assert "Gin" in names
    assert "Campari" in names
    assert "Sweet Vermouth" in names


@pytest.mark.asyncio
async def test_get_cocktail_not_found(client):
    response = await client.get("/api/v1/cocktails/nonexistent-slug")
    assert response.status_code == 404
    assert response.json()["detail"] == "Cocktail not found"


@pytest.mark.asyncio
async def test_get_cocktail_no_ingredients(client, db_session):
    """Cocktail with no ingredients returns empty list."""
    await _seed_test_data(db_session)
    response = await client.get("/api/v1/cocktails/martini")
    assert response.status_code == 200
    data = response.json()
    assert data["ingredients"] == []


# ---------------------------------------------------------------------------
# Ingredient list tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_ingredients_empty(client):
    response = await client.get("/api/v1/ingredients")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_list_ingredients_with_data(client, db_session):
    await _seed_test_data(db_session)
    response = await client.get("/api/v1/ingredients")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3


@pytest.mark.asyncio
async def test_list_ingredients_category_filter(client, db_session):
    await _seed_test_data(db_session)
    response = await client.get("/api/v1/ingredients?category=spirit")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Gin"


@pytest.mark.asyncio
async def test_list_ingredients_category_filter_no_match(client, db_session):
    await _seed_test_data(db_session)
    response = await client.get("/api/v1/ingredients?category=bitters")
    assert response.status_code == 200
    assert response.json()["total"] == 0


@pytest.mark.asyncio
async def test_list_ingredients_pagination(client, db_session):
    await _seed_test_data(db_session)
    response = await client.get("/api/v1/ingredients?page=1&per_page=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["total"] == 3


# ---------------------------------------------------------------------------
# Ingredient detail tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_ingredient_by_id(client, db_session):
    seeded = await _seed_test_data(db_session)
    gin_id = str(seeded["gin"].id)
    response = await client.get(f"/api/v1/ingredients/{gin_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Gin"
    assert data["category"] == "spirit"


@pytest.mark.asyncio
async def test_get_ingredient_not_found(client):
    response = await client.get(f"/api/v1/ingredients/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Ingredient not found"


@pytest.mark.asyncio
async def test_get_ingredient_invalid_uuid(client):
    response = await client.get("/api/v1/ingredients/not-a-uuid")
    assert response.status_code == 422
