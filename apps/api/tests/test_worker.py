"""
Tests for the Cloudflare Workers (Python) entry point — src/worker.py.

Because the real Cloudflare `js` module is unavailable locally, we mock it
and test the routing logic, D1 query construction, and response serialization
using an in-process SQLite database (via aiosqlite) that mirrors the D1 schema.
"""

import asyncio
import json
import re
import sqlite3
import sys
import types
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import aiosqlite
import pytest
import pytest_asyncio


# ---------------------------------------------------------------------------
# Stub the Cloudflare `js` module so worker.py can be imported
# ---------------------------------------------------------------------------

def _make_js_stub():
    js_mod = types.ModuleType("js")

    class _Headers:
        def __init__(self, items=None):
            self._data = dict(items or [])

        @classmethod
        def new(cls, items):
            return cls(items)

    class _Response:
        def __init__(self, body="", status=200, headers=None):
            self.body = body
            self.status = status
            self.headers = headers or {}

        @classmethod
        def new(cls, body, status=200, headers=None):
            return cls(body, status, headers)

        def json(self):
            return json.loads(self.body)

    js_mod.Response = _Response
    js_mod.Headers = _Headers
    return js_mod


sys.modules.setdefault("js", _make_js_stub())

# Now import the worker
import importlib
import sys as _sys
import os

# Ensure src/ is on the path
_src_dir = os.path.join(os.path.dirname(__file__), "..", "src")
if _src_dir not in _sys.path:
    _sys.path.insert(0, _src_dir)

import worker  # noqa: E402


# ---------------------------------------------------------------------------
# Lightweight D1-compatible SQLite environment fixture
# ---------------------------------------------------------------------------

SCHEMA_SQL = """
CREATE TABLE ingredients (
    id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, category TEXT NOT NULL,
    description TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE TABLE tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE cocktails (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
    description TEXT, method TEXT, garnish TEXT, glassware TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE TABLE cocktail_ingredients (
    cocktail_id TEXT NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
    ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity TEXT, unit TEXT, notes TEXT,
    PRIMARY KEY (cocktail_id, ingredient_id)
);
CREATE TABLE cocktail_tags (
    cocktail_id TEXT NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (cocktail_id, tag_id)
);
"""


class D1Stub:
    """Mimics the CF D1 binding API using aiosqlite."""

    def __init__(self, conn: aiosqlite.Connection):
        self._conn = conn

    def prepare(self, sql: str) -> "D1Statement":
        return D1Statement(self._conn, sql, [])


class D1Statement:
    def __init__(self, conn, sql, params):
        self._conn = conn
        self._sql = sql
        self._params = list(params)

    def bind(self, *args) -> "D1Statement":
        return D1Statement(self._conn, self._sql, list(args))

    async def all(self) -> "D1Result":
        async with self._conn.execute(self._sql, self._params) as cur:
            rows = await cur.fetchall()
            cols = [d[0] for d in cur.description] if cur.description else []
        dicts = [dict(zip(cols, row)) for row in rows]
        result = MagicMock()
        result.results.to_py.return_value = dicts
        return result

    async def first(self) -> "dict | None":
        async with self._conn.execute(self._sql, self._params) as cur:
            row = await cur.fetchone()
            cols = [d[0] for d in cur.description] if cur.description else []
        if row is None:
            return None
        d = dict(zip(cols, row))
        mock = MagicMock()
        mock.to_py.return_value = d
        return mock


class FakeEnv:
    def __init__(self, db: D1Stub):
        self.DB = db


class FakeRequest:
    def __init__(self, url: str, method: str = "GET"):
        self.url = url
        self.method = method


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture()
async def env():
    async with aiosqlite.connect(":memory:") as conn:
        conn.row_factory = None
        await conn.executescript(SCHEMA_SQL)
        await conn.commit()
        stub = D1Stub(conn)
        fake_env = FakeEnv(stub)
        yield fake_env, conn


async def seed(conn: aiosqlite.Connection):
    gin_id = str(uuid.uuid4())
    campari_id = str(uuid.uuid4())
    vermouth_id = str(uuid.uuid4())
    negroni_id = str(uuid.uuid4())
    martini_id = str(uuid.uuid4())
    tag_stirred_id = str(uuid.uuid4())
    tag_classic_id = str(uuid.uuid4())

    await conn.execute(
        "INSERT INTO ingredients (id, name, category, description) VALUES (?,?,?,?)",
        (gin_id, "Gin", "spirit", "London Dry"),
    )
    await conn.execute(
        "INSERT INTO ingredients (id, name, category, description) VALUES (?,?,?,?)",
        (campari_id, "Campari", "liqueur", "Italian bitter"),
    )
    await conn.execute(
        "INSERT INTO ingredients (id, name, category, description) VALUES (?,?,?,?)",
        (vermouth_id, "Sweet Vermouth", "liqueur", "Italian vermouth"),
    )
    await conn.execute(
        "INSERT INTO tags (id, name) VALUES (?,?)", (tag_stirred_id, "stirred")
    )
    await conn.execute(
        "INSERT INTO tags (id, name) VALUES (?,?)", (tag_classic_id, "classic")
    )
    await conn.execute(
        "INSERT INTO cocktails (id, name, slug, description, method, garnish, glassware) VALUES (?,?,?,?,?,?,?)",
        (negroni_id, "Negroni", "negroni", "Equal parts.", "Stir.", "Orange twist", "Rocks glass"),
    )
    await conn.execute(
        "INSERT INTO cocktails (id, name, slug, description, method, garnish, glassware) VALUES (?,?,?,?,?,?,?)",
        (martini_id, "Martini", "martini", "Gin and vermouth.", "Stir.", "Olive", "Martini glass"),
    )
    await conn.execute(
        "INSERT INTO cocktail_ingredients (cocktail_id, ingredient_id, quantity, unit) VALUES (?,?,?,?)",
        (negroni_id, gin_id, "30", "ml"),
    )
    await conn.execute(
        "INSERT INTO cocktail_ingredients (cocktail_id, ingredient_id, quantity, unit) VALUES (?,?,?,?)",
        (negroni_id, campari_id, "30", "ml"),
    )
    await conn.execute(
        "INSERT INTO cocktail_ingredients (cocktail_id, ingredient_id, quantity, unit) VALUES (?,?,?,?)",
        (negroni_id, vermouth_id, "30", "ml"),
    )
    await conn.execute(
        "INSERT INTO cocktail_tags (cocktail_id, tag_id) VALUES (?,?)", (negroni_id, tag_stirred_id)
    )
    await conn.execute(
        "INSERT INTO cocktail_tags (cocktail_id, tag_id) VALUES (?,?)", (negroni_id, tag_classic_id)
    )
    await conn.commit()

    return {
        "gin_id": gin_id,
        "campari_id": campari_id,
        "vermouth_id": vermouth_id,
        "negroni_id": negroni_id,
        "martini_id": martini_id,
        "tag_stirred_id": tag_stirred_id,
        "tag_classic_id": tag_classic_id,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def req(path: str, method: str = "GET") -> FakeRequest:
    return FakeRequest(f"http://localhost{path}", method)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health_ok(env):
    fake_env, _conn = env
    resp = await worker.on_fetch(req("/health"), fake_env)
    assert resp.status == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["db"] == "ok"


# ---------------------------------------------------------------------------
# Cocktail list
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_cocktails_empty(env):
    fake_env, _conn = env
    resp = await worker.on_fetch(req("/api/v1/cocktails"), fake_env)
    assert resp.status == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []
    assert data["page"] == 1
    assert data["per_page"] == 20


@pytest.mark.asyncio
async def test_list_cocktails_with_data(env):
    fake_env, conn = env
    await seed(conn)
    resp = await worker.on_fetch(req("/api/v1/cocktails"), fake_env)
    assert resp.status == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_list_cocktails_search(env):
    fake_env, conn = env
    await seed(conn)
    resp = await worker.on_fetch(req("/api/v1/cocktails?q=negroni"), fake_env)
    assert resp.status == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["slug"] == "negroni"


@pytest.mark.asyncio
async def test_list_cocktails_search_no_match(env):
    fake_env, conn = env
    await seed(conn)
    resp = await worker.on_fetch(req("/api/v1/cocktails?q=zzznomatch"), fake_env)
    data = resp.json()
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_cocktails_pagination(env):
    fake_env, conn = env
    await seed(conn)
    resp = await worker.on_fetch(req("/api/v1/cocktails?page=1&per_page=1"), fake_env)
    data = resp.json()
    assert data["total"] == 2
    assert len(data["items"]) == 1
    assert data["page"] == 1
    assert data["per_page"] == 1


@pytest.mark.asyncio
async def test_list_cocktails_pagination_page2(env):
    fake_env, conn = env
    await seed(conn)
    resp = await worker.on_fetch(req("/api/v1/cocktails?page=2&per_page=1"), fake_env)
    data = resp.json()
    assert len(data["items"]) == 1


# ---------------------------------------------------------------------------
# Cocktail detail
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_cocktail_by_slug(env):
    fake_env, conn = env
    await seed(conn)
    resp = await worker.on_fetch(req("/api/v1/cocktails/negroni"), fake_env)
    assert resp.status == 200
    data = resp.json()
    assert data["name"] == "Negroni"
    assert data["slug"] == "negroni"
    assert len(data["ingredients"]) == 3
    assert len(data["tags"]) == 2


@pytest.mark.asyncio
async def test_get_cocktail_ingredients_detail(env):
    fake_env, conn = env
    await seed(conn)
    resp = await worker.on_fetch(req("/api/v1/cocktails/negroni"), fake_env)
    data = resp.json()
    names = {i["name"] for i in data["ingredients"]}
    assert "Gin" in names
    assert "Campari" in names
    assert "Sweet Vermouth" in names


@pytest.mark.asyncio
async def test_get_cocktail_not_found(env):
    fake_env, _conn = env
    resp = await worker.on_fetch(req("/api/v1/cocktails/no-such-slug"), fake_env)
    assert resp.status == 404
    assert resp.json()["detail"] == "Cocktail not found"


@pytest.mark.asyncio
async def test_get_cocktail_no_ingredients(env):
    fake_env, conn = env
    await seed(conn)
    resp = await worker.on_fetch(req("/api/v1/cocktails/martini"), fake_env)
    assert resp.status == 200
    data = resp.json()
    assert data["ingredients"] == []


# ---------------------------------------------------------------------------
# Ingredient list
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_ingredients_empty(env):
    fake_env, _conn = env
    resp = await worker.on_fetch(req("/api/v1/ingredients"), fake_env)
    assert resp.status == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_list_ingredients_with_data(env):
    fake_env, conn = env
    await seed(conn)
    resp = await worker.on_fetch(req("/api/v1/ingredients"), fake_env)
    data = resp.json()
    assert data["total"] == 3


@pytest.mark.asyncio
async def test_list_ingredients_category_filter(env):
    fake_env, conn = env
    await seed(conn)
    resp = await worker.on_fetch(req("/api/v1/ingredients?category=spirit"), fake_env)
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Gin"


@pytest.mark.asyncio
async def test_list_ingredients_category_no_match(env):
    fake_env, conn = env
    await seed(conn)
    resp = await worker.on_fetch(req("/api/v1/ingredients?category=bitters"), fake_env)
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_list_ingredients_pagination(env):
    fake_env, conn = env
    await seed(conn)
    resp = await worker.on_fetch(req("/api/v1/ingredients?page=1&per_page=2"), fake_env)
    data = resp.json()
    assert len(data["items"]) == 2
    assert data["total"] == 3


# ---------------------------------------------------------------------------
# Ingredient detail
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_ingredient_by_id(env):
    fake_env, conn = env
    ids = await seed(conn)
    resp = await worker.on_fetch(req(f"/api/v1/ingredients/{ids['gin_id']}"), fake_env)
    assert resp.status == 200
    data = resp.json()
    assert data["name"] == "Gin"
    assert data["category"] == "spirit"


@pytest.mark.asyncio
async def test_get_ingredient_not_found(env):
    fake_env, _conn = env
    resp = await worker.on_fetch(req(f"/api/v1/ingredients/{uuid.uuid4()}"), fake_env)
    assert resp.status == 404
    assert resp.json()["detail"] == "Ingredient not found"


@pytest.mark.asyncio
async def test_get_ingredient_invalid_uuid(env):
    fake_env, _conn = env
    resp = await worker.on_fetch(req("/api/v1/ingredients/not-a-uuid"), fake_env)
    assert resp.status == 422


# ---------------------------------------------------------------------------
# 404 on unknown route
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_unknown_route_404(env):
    fake_env, _conn = env
    resp = await worker.on_fetch(req("/api/v1/unknown"), fake_env)
    assert resp.status == 404
