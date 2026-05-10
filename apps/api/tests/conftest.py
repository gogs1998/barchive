"""
conftest.py — shared pytest fixtures for Barchive API tests.

Provides an async HTTP test client backed by an in-memory SQLite database so
tests run without a live Postgres instance. The SQLite engine is created fresh
for each test session (module scope) and all tables are created before the
first test runs.

Usage in tests
--------------
    async def test_something(async_client):
        response = await async_client.get("/health")
        assert response.status_code == 200
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# ---------------------------------------------------------------------------
# Override settings before importing app so the database URL is replaced.
# ---------------------------------------------------------------------------
import os
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")

# Now safe to import app modules
from main import app  # noqa: E402
from app.database import Base, get_db  # noqa: E402


# ---------------------------------------------------------------------------
# Engine + session factory (session-scoped so the DB lives for the whole run)
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Create a fresh async SQLite engine and build all tables once per session."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(test_engine):
    """
    Provide a transactional async session per test that is rolled back after
    each test so tests remain independent.
    """
    SessionLocal = async_sessionmaker(test_engine, expire_on_commit=False)
    async with SessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def async_client(db_session: AsyncSession):
    """
    Async HTTPX client wired to the FastAPI app, with the database dependency
    overridden to use the per-test SQLite session.
    """

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()
