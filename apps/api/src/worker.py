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
# Shape helpers
# ---------------------------------------------------------------------------

def _abv_is_low(abv: str) -> bool:
    """Return True if ABV is below 15%."""
    try:
        return int(abv.rstrip("%")) < 15
    except (ValueError, AttributeError):
        return False


def _cocktail_list_shape(row: dict) -> dict:
    """
    Map a DB cocktail row (list query) to the shape the frontend Cocktail type
    expects.  Ingredients and tags are lightweight for list pages.
    """
    abv = row.get("abv") or ""
    return {
        "id":          row.get("id", ""),
        "name":        row.get("name", ""),
        "slug":        row.get("slug", ""),
        "category":    row.get("category") or "",
        "glass":       row.get("glassware") or "",
        "img":         row.get("img") or "",
        "color":       row.get("color") or "",
        "abv":         abv,
        "time":        row.get("time_to_make") or "",
        "vegan":       bool(row.get("vegan", 1)),
        "glutenFree":  bool(row.get("gluten_free", 1)),
        "lowAbv":      _abv_is_low(abv),
        "tags":        [],          # populated by detail route only
        "ingredients": [],          # populated by detail route only
        "steps":       [],          # populated by detail route only
    }


def _cocktail_detail_shape(row: dict, ingredients: list, tags: list) -> dict:
    """Full Cocktail shape for the detail page."""
    abv = row.get("abv") or ""
    # steps stored as JSON array; fall back to legacy method text
    raw_steps = row.get("steps_json")
    if raw_steps:
        try:
            steps = json.loads(raw_steps)
        except (json.JSONDecodeError, TypeError):
            steps = [raw_steps] if raw_steps else []
    else:
        method = row.get("method") or ""
        steps = [method] if method else []

    return {
        "id":          row.get("id", ""),
        "name":        row.get("name", ""),
        "slug":        row.get("slug", ""),
        "category":    row.get("category") or "",
        "glass":       row.get("glassware") or "",
        "img":         row.get("img") or "",
        "color":       row.get("color") or "",
        "abv":         abv,
        "time":        row.get("time_to_make") or "",
        "vegan":       bool(row.get("vegan", 1)),
        "glutenFree":  bool(row.get("gluten_free", 1)),
        "lowAbv":      _abv_is_low(abv),
        "tags":        [t["name"] for t in tags],
        "ingredients": [
            {
                "name":   i.get("name", ""),
                "amount": i.get("amount") or (
                    f"{i.get('quantity', '')} {i.get('unit', '')}".strip()
                ),
            }
            for i in ingredients
        ],
        "steps": steps,
    }


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
    """GET /api/v1/cocktails[?q=&category=&glass=&page=&per_page=]"""
    url = request.url
    params = _parse_query(url)

    q        = params.get("q", "")
    category = params.get("category", "")
    glass    = params.get("glass", "")
    try:
        page     = max(1, int(params.get("page", "1")))
        per_page = min(500, max(1, int(params.get("per_page", "20"))))
    except ValueError:
        return error_response("Invalid pagination parameters", 422)

    offset = (page - 1) * per_page

    # Build WHERE clauses dynamically
    conditions = []
    bind_vals  = []

    if q:
        conditions.append("(c.name LIKE ? COLLATE NOCASE OR c.category LIKE ? COLLATE NOCASE)")
        bind_vals += [f"%{q}%", f"%{q}%"]
    if category:
        conditions.append("c.category = ? COLLATE NOCASE")
        bind_vals.append(category)
    if glass:
        conditions.append("c.glassware = ? COLLATE NOCASE")
        bind_vals.append(glass)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    count_sql = f"SELECT COUNT(*) AS cnt FROM cocktails c {where}"
    count_row = await d1_first(env.DB, count_sql, *bind_vals)

    rows_sql = (
        f"SELECT c.id, c.name, c.slug, c.category, c.glassware, c.img, c.color, "
        f"       c.abv, c.time_to_make, c.vegan, c.gluten_free, c.steps_json "
        f"FROM cocktails c {where} "
        f"ORDER BY c.name LIMIT ? OFFSET ?"
    )
    rows = await d1_all(env.DB, rows_sql, *bind_vals, per_page, offset)

    total = count_row["cnt"] if count_row else 0

    if rows:
        # Batch-load ingredients and tags for all returned cocktails in two queries.
        # This avoids N+1 queries for the ingredient/tag search client needs.
        ids        = [r["id"] for r in rows]
        placeholders = ",".join("?" * len(ids))

        ing_rows = await d1_all(
            env.DB,
            f"SELECT ci.cocktail_id, i.name, ci.amount, ci.quantity, ci.unit "
            f"FROM cocktail_ingredients ci "
            f"JOIN ingredients i ON i.id = ci.ingredient_id "
            f"WHERE ci.cocktail_id IN ({placeholders})",
            *ids,
        )
        tag_rows = await d1_all(
            env.DB,
            f"SELECT ct.cocktail_id, t.name "
            f"FROM cocktail_tags ct "
            f"JOIN tags t ON t.id = ct.tag_id "
            f"WHERE ct.cocktail_id IN ({placeholders})",
            *ids,
        )

        # Build lookup maps
        ing_map: dict = {}
        for ir in ing_rows:
            cid = ir["cocktail_id"]
            ing_map.setdefault(cid, []).append({
                "name":   ir["name"],
                "amount": ir.get("amount") or f"{ir.get('quantity','') or ''} {ir.get('unit','') or ''}".strip(),
            })

        tag_map: dict = {}
        for tr in tag_rows:
            cid = tr["cocktail_id"]
            tag_map.setdefault(cid, []).append(tr["name"])
    else:
        ing_map = {}
        tag_map = {}

    items = []
    for r in rows:
        abv = r.get("abv") or ""
        raw_steps = r.get("steps_json")
        if raw_steps:
            try:
                steps = json.loads(raw_steps)
            except (json.JSONDecodeError, TypeError):
                steps = []
        else:
            steps = []

        cid = r["id"]
        items.append({
            "id":          cid,
            "name":        r.get("name", ""),
            "slug":        r.get("slug", ""),
            "category":    r.get("category") or "",
            "glass":       r.get("glassware") or "",
            "img":         r.get("img") or "",
            "color":       r.get("color") or "",
            "abv":         abv,
            "time":        r.get("time_to_make") or "",
            "vegan":       bool(r.get("vegan", 1)),
            "glutenFree":  bool(r.get("gluten_free", 1)),
            "lowAbv":      _abv_is_low(abv),
            "tags":        tag_map.get(cid, []),
            "ingredients": ing_map.get(cid, []),
            "steps":       steps,
        })

    return json_response({"total": total, "page": page, "per_page": per_page, "items": items})


async def handle_get_cocktail(request, env, slug):
    """GET /api/v1/cocktails/{slug}"""
    cocktail = await d1_first(
        env.DB,
        "SELECT id, name, slug, category, glassware, img, color, abv, time_to_make, "
        "       vegan, gluten_free, steps_json, method, description "
        "FROM cocktails WHERE slug = ?",
        slug,
    )
    if not cocktail:
        return error_response("Cocktail not found", 404)

    cocktail_id = cocktail["id"]
    ingredients = await d1_all(
        env.DB,
        """
        SELECT i.name, ci.amount, ci.quantity, ci.unit
        FROM cocktail_ingredients ci
        JOIN ingredients i ON i.id = ci.ingredient_id
        WHERE ci.cocktail_id = ?
        ORDER BY ci.ingredient_id
        """,
        cocktail_id,
    )
    tags = await d1_all(
        env.DB,
        """
        SELECT t.name
        FROM cocktail_tags ct
        JOIN tags t ON t.id = ct.tag_id
        WHERE ct.cocktail_id = ?
        ORDER BY t.name
        """,
        cocktail_id,
    )

    return json_response(_cocktail_detail_shape(cocktail, ingredients, tags))


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
