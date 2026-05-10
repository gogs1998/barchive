"""
BarIQ API — Cloudflare Workers (Python) entry point.

Runtime: Cloudflare Python Workers (beta, compatibility_date >= 2024-12-18).
Database: Cloudflare D1 via env.DB binding (SQLite dialect).

Routing is handled manually; no FastAPI / asyncpg / SQLAlchemy dependencies.
All I/O is through the D1 binding which is available on the `env` object.
"""

import json
import re
import uuid


# ---------------------------------------------------------------------------
# Response helpers
# ---------------------------------------------------------------------------

def json_response(data, status=200):
    from js import Response, Headers  # type: ignore[import]  # available in CF Workers runtime
    headers = Headers.new({"content-type": "application/json", "access-control-allow-origin": "*"}.items())
    return Response.new(json.dumps(data), status=status, headers=headers)


def error_response(message, status=400):
    return json_response({"detail": message}, status=status)


# ---------------------------------------------------------------------------
# D1 helpers
# ---------------------------------------------------------------------------

async def d1_all(db, sql, *params):
    """Execute a D1 query and return all rows as a list of dicts."""
    stmt = db.prepare(sql)
    if params:
        stmt = stmt.bind(*params)
    result = await stmt.all()
    rows = result.results.to_py()
    return rows


async def d1_first(db, sql, *params):
    """Execute a D1 query and return the first row as a dict, or None."""
    stmt = db.prepare(sql)
    if params:
        stmt = stmt.bind(*params)
    result = await stmt.first()
    if result is None:
        return None
    return result.to_py()


# ---------------------------------------------------------------------------
# Route handlers
# ---------------------------------------------------------------------------

async def handle_health(request, env):
    """GET /health"""
    try:
        await d1_first(env.DB, "SELECT 1 AS ok")
        db_status = "ok"
    except Exception as exc:
        db_status = f"error: {exc}"
    status_val = "ok" if db_status == "ok" else "degraded"
    return json_response({"status": status_val, "db": db_status})


async def handle_list_cocktails(request, env):
    """GET /api/v1/cocktails[?q=&page=&per_page=]"""
    url = request.url
    params = _parse_query(url)

    q = params.get("q", "")
    try:
        page = max(1, int(params.get("page", "1")))
        per_page = min(100, max(1, int(params.get("per_page", "20"))))
    except ValueError:
        return error_response("Invalid pagination parameters", 422)

    offset = (page - 1) * per_page

    if q:
        pattern = f"%{q}%"
        count_row = await d1_first(
            env.DB,
            "SELECT COUNT(*) AS cnt FROM cocktails WHERE name LIKE ? COLLATE NOCASE",
            pattern,
        )
        rows = await d1_all(
            env.DB,
            "SELECT id, name, slug, description, method, garnish, glassware FROM cocktails "
            "WHERE name LIKE ? COLLATE NOCASE ORDER BY name LIMIT ? OFFSET ?",
            pattern, per_page, offset,
        )
    else:
        count_row = await d1_first(env.DB, "SELECT COUNT(*) AS cnt FROM cocktails")
        rows = await d1_all(
            env.DB,
            "SELECT id, name, slug, description, method, garnish, glassware FROM cocktails "
            "ORDER BY name LIMIT ? OFFSET ?",
            per_page, offset,
        )

    total = count_row["cnt"] if count_row else 0
    return json_response({"total": total, "page": page, "per_page": per_page, "items": rows})


async def handle_get_cocktail(request, env, slug):
    """GET /api/v1/cocktails/{slug}"""
    cocktail = await d1_first(
        env.DB,
        "SELECT id, name, slug, description, method, garnish, glassware FROM cocktails WHERE slug = ?",
        slug,
    )
    if not cocktail:
        return error_response("Cocktail not found", 404)

    cocktail_id = cocktail["id"]
    ingredients = await d1_all(
        env.DB,
        """
        SELECT i.id AS ingredient_id, i.name, i.category, ci.quantity, ci.unit, ci.notes
        FROM cocktail_ingredients ci
        JOIN ingredients i ON i.id = ci.ingredient_id
        WHERE ci.cocktail_id = ?
        """,
        cocktail_id,
    )
    tags = await d1_all(
        env.DB,
        """
        SELECT t.id, t.name
        FROM cocktail_tags ct
        JOIN tags t ON t.id = ct.tag_id
        WHERE ct.cocktail_id = ?
        """,
        cocktail_id,
    )

    cocktail["ingredients"] = ingredients
    cocktail["tags"] = tags
    return json_response(cocktail)


async def handle_list_ingredients(request, env):
    """GET /api/v1/ingredients[?category=&page=&per_page=]"""
    url = request.url
    params = _parse_query(url)

    category = params.get("category", "")
    try:
        page = max(1, int(params.get("page", "1")))
        per_page = min(200, max(1, int(params.get("per_page", "50"))))
    except ValueError:
        return error_response("Invalid pagination parameters", 422)

    offset = (page - 1) * per_page

    if category:
        count_row = await d1_first(
            env.DB,
            "SELECT COUNT(*) AS cnt FROM ingredients WHERE category = ?",
            category,
        )
        rows = await d1_all(
            env.DB,
            "SELECT id, name, category, description FROM ingredients WHERE category = ? ORDER BY name LIMIT ? OFFSET ?",
            category, per_page, offset,
        )
    else:
        count_row = await d1_first(env.DB, "SELECT COUNT(*) AS cnt FROM ingredients")
        rows = await d1_all(
            env.DB,
            "SELECT id, name, category, description FROM ingredients ORDER BY name LIMIT ? OFFSET ?",
            per_page, offset,
        )

    total = count_row["cnt"] if count_row else 0
    return json_response({"total": total, "page": page, "per_page": per_page, "items": rows})


async def handle_get_ingredient(request, env, ingredient_id):
    """GET /api/v1/ingredients/{ingredient_id}"""
    # Validate UUID format
    try:
        uuid.UUID(ingredient_id)
    except ValueError:
        return error_response("Invalid UUID", 422)

    row = await d1_first(
        env.DB,
        "SELECT id, name, category, description FROM ingredients WHERE id = ?",
        ingredient_id,
    )
    if not row:
        return error_response("Ingredient not found", 404)
    return json_response(row)


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

ROUTES = [
    ("GET", r"^/health$", handle_health, []),
    ("GET", r"^/api/v1/cocktails$", handle_list_cocktails, []),
    ("GET", r"^/api/v1/cocktails/(?P<slug>[^/]+)$", handle_get_cocktail, ["slug"]),
    ("GET", r"^/api/v1/ingredients$", handle_list_ingredients, []),
    ("GET", r"^/api/v1/ingredients/(?P<ingredient_id>[^/]+)$", handle_get_ingredient, ["ingredient_id"]),
]


def _parse_query(url: str) -> dict:
    """Parse query parameters from a URL string."""
    params = {}
    if "?" not in url:
        return params
    qs = url.split("?", 1)[1]
    for part in qs.split("&"):
        if "=" in part:
            k, v = part.split("=", 1)
            params[k] = v
        elif part:
            params[part] = ""
    return params


async def on_fetch(request, env):
    """Cloudflare Workers entry point."""
    method = request.method.upper()

    # Handle CORS preflight
    if method == "OPTIONS":
        from js import Response, Headers  # type: ignore[import]
        headers = Headers.new({
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET, OPTIONS",
            "access-control-allow-headers": "Content-Type",
        }.items())
        return Response.new("", status=204, headers=headers)

    path = request.url.split("?")[0]
    # Strip scheme+host if present (e.g. full URL)
    if "://" in path:
        path = "/" + "/".join(path.split("/")[3:])

    for route_method, pattern, handler, capture_groups in ROUTES:
        if method != route_method:
            continue
        m = re.match(pattern, path)
        if m:
            kwargs = {g: m.group(g) for g in capture_groups}
            return await handler(request, env, **kwargs)

    return error_response("Not found", 404)
