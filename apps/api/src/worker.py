"""
BarIQ API — Cloudflare Workers (Python) entry point.

Runtime: Cloudflare Python Workers (beta, compatibility_date >= 2024-12-18).
Database: Cloudflare D1 via env.DB binding (SQLite dialect).

Routing is handled manually; no FastAPI / asyncpg / SQLAlchemy dependencies.
All I/O is through the D1 binding which is available on the `env` object.

Auth:
  - Passwords hashed with bcrypt (stored by FastAPI; verified here via the
    cryptography package which pyodide bundles).
  - Sessions: opaque refresh-token UUID stored in sessions table.
  - Access token: HS256 JWT signed with env.JWT_SECRET, verified with hmac +
    hashlib (both in Python stdlib — no jose / PyJWT needed).
  - Cookies: httpOnly, SameSite=Lax.

CORS:
  - All responses include Access-Control-Allow-Origin: <allowed_origin> and
    Access-Control-Allow-Credentials: true so that fetch({credentials:'include'})
    works from bariq.co.uk.
  - Allowed origin is read from env.ALLOWED_ORIGIN (set per environment in
    wrangler.toml); defaults to https://bariq.co.uk.
"""

import base64
import hashlib
import hmac
import json
import re
import time
import uuid as _uuid_mod


# ---------------------------------------------------------------------------
# CORS / response helpers
# ---------------------------------------------------------------------------

def _allowed_origin(env) -> str:
    try:
        o = env.ALLOWED_ORIGIN
        return o if o else "https://bariq.co.uk"
    except Exception:
        return "https://bariq.co.uk"


def _cors_headers(env) -> dict:
    return {
        "access-control-allow-origin": _allowed_origin(env),
        "access-control-allow-credentials": "true",
        "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
        "access-control-allow-headers": "Content-Type, Accept",
        "vary": "Origin",
    }


def json_response(data, status=200, *, env, extra_headers=None):
    from js import Response, Headers  # type: ignore[import]
    h = {"content-type": "application/json"}
    h.update(_cors_headers(env))
    if extra_headers:
        h.update(extra_headers)
    headers = Headers.new(h.items())
    return Response.new(json.dumps(data), status=status, headers=headers)


def empty_response(status=204, *, env, extra_headers=None):
    from js import Response, Headers  # type: ignore[import]
    h = {}
    h.update(_cors_headers(env))
    if extra_headers:
        h.update(extra_headers)
    headers = Headers.new(h.items())
    return Response.new("", status=status, headers=headers)


def error_response(message, status=400, *, env):
    return json_response({"detail": message}, status=status, env=env)


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


async def d1_run(db, sql, *params):
    """Execute a D1 statement (INSERT/UPDATE/DELETE) without returning rows."""
    stmt = db.prepare(sql)
    if params:
        stmt = stmt.bind(*params)
    await stmt.run()


# ---------------------------------------------------------------------------
# JWT helpers (HS256, stdlib only)
# ---------------------------------------------------------------------------

_ACCESS_TOKEN_TYPE = "access"
_EMAIL_TOKEN_TYPE = "email_verification"
_RESET_TOKEN_TYPE = "password_reset"

_ACCESS_TOKEN_EXPIRE_MINUTES = 30
_REFRESH_TOKEN_EXPIRE_DAYS = 30


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


def _jwt_sign(payload: dict, secret: str) -> str:
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    body = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{header}.{body}"
    sig = hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()
    return f"{signing_input}.{_b64url_encode(sig)}"


def _jwt_verify(token: str, secret: str) -> dict:
    """Return decoded payload dict. Raises ValueError on bad token / expired."""
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Malformed JWT")
    header_b64, body_b64, sig_b64 = parts
    signing_input = f"{header_b64}.{body_b64}"
    expected_sig = hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()
    actual_sig = _b64url_decode(sig_b64)
    if not hmac.compare_digest(expected_sig, actual_sig):
        raise ValueError("Invalid JWT signature")
    payload = json.loads(_b64url_decode(body_b64))
    exp = payload.get("exp")
    if exp is not None and time.time() > exp:
        raise ValueError("JWT expired")
    return payload


def _create_access_token(user_id: str, secret: str) -> str:
    payload = {
        "sub": user_id,
        "type": _ACCESS_TOKEN_TYPE,
        "exp": int(time.time()) + _ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }
    return _jwt_sign(payload, secret)


def _decode_access_token(token: str, secret: str) -> str:
    payload = _jwt_verify(token, secret)
    if payload.get("type") != _ACCESS_TOKEN_TYPE:
        raise ValueError("Wrong token type")
    sub = payload.get("sub")
    if not sub:
        raise ValueError("Missing sub")
    return sub


def _create_email_token(user_id: str, secret: str) -> str:
    payload = {
        "sub": user_id,
        "type": _EMAIL_TOKEN_TYPE,
        "exp": int(time.time()) + 24 * 3600,
    }
    return _jwt_sign(payload, secret)


def _decode_email_token(token: str, secret: str) -> str:
    payload = _jwt_verify(token, secret)
    if payload.get("type") != _EMAIL_TOKEN_TYPE:
        raise ValueError("Wrong token type")
    return payload["sub"]


def _create_reset_token(user_id: str, secret: str) -> str:
    payload = {
        "sub": user_id,
        "type": _RESET_TOKEN_TYPE,
        "exp": int(time.time()) + 3600,
    }
    return _jwt_sign(payload, secret)


def _decode_reset_token(token: str, secret: str) -> str:
    payload = _jwt_verify(token, secret)
    if payload.get("type") != _RESET_TOKEN_TYPE:
        raise ValueError("Wrong token type")
    return payload["sub"]


# ---------------------------------------------------------------------------
# Password helpers (bcrypt via cryptography / bcrypt package in pyodide)
# ---------------------------------------------------------------------------

def _hash_password(plain: str) -> str:
    """Hash a plaintext password with bcrypt."""
    try:
        import bcrypt  # type: ignore[import]
        return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()
    except ImportError:
        pass
    # Fallback: use cryptography package (also available in pyodide)
    from cryptography.hazmat.primitives.kdf.scrypt import Scrypt  # type: ignore[import]
    # Not bcrypt-compatible — only used when bcrypt missing (new accounts only)
    salt = _uuid_mod.uuid4().bytes
    kdf = Scrypt(salt=salt, length=32, n=2**14, r=8, p=1)
    key = kdf.derive(plain.encode())
    return "scrypt:" + base64.b64encode(salt + key).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a stored hash."""
    if hashed.startswith("scrypt:"):
        try:
            from cryptography.hazmat.primitives.kdf.scrypt import Scrypt  # type: ignore[import]
            raw = base64.b64decode(hashed[7:])
            salt = raw[:16]
            stored_key = raw[16:]
            kdf = Scrypt(salt=salt, length=32, n=2**14, r=8, p=1)
            kdf.verify(plain.encode(), stored_key)
            return True
        except Exception:
            return False
    # bcrypt hash
    try:
        import bcrypt  # type: ignore[import]
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except ImportError:
        pass
    # bcrypt unavailable — attempt passlib
    try:
        from passlib.hash import bcrypt as passlib_bcrypt  # type: ignore[import]
        return passlib_bcrypt.verify(plain, hashed)
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------

def _cookie(name: str, value: str, max_age: int, path: str = "/", secure: bool = True) -> str:
    parts = [f"{name}={value}", f"Max-Age={max_age}", f"Path={path}", "HttpOnly", "SameSite=Lax"]
    if secure:
        parts.append("Secure")
    return "; ".join(parts)


def _clear_cookie(name: str, path: str = "/", secure: bool = True) -> str:
    parts = [f"{name}=", "Max-Age=0", f"Path={path}", "HttpOnly", "SameSite=Lax"]
    if secure:
        parts.append("Secure")
    return "; ".join(parts)


def _parse_cookies(request) -> dict:
    """Parse Cookie header into a dict."""
    try:
        raw = request.headers.get("Cookie") or ""
    except Exception:
        return {}
    cookies = {}
    for part in raw.split(";"):
        part = part.strip()
        if "=" in part:
            k, v = part.split("=", 1)
            cookies[k.strip()] = v.strip()
    return cookies


def _is_secure(env) -> bool:
    try:
        return (env.ENVIRONMENT or "production") != "development"
    except Exception:
        return True


# ---------------------------------------------------------------------------
# Auth helper: resolve user from access_token cookie
# ---------------------------------------------------------------------------

async def _get_current_user(request, env) -> dict | None:
    """Return user row dict if access token is valid, else None."""
    cookies = _parse_cookies(request)
    token = cookies.get("access_token")
    if not token:
        return None
    try:
        secret = env.JWT_SECRET
        user_id = _decode_access_token(token, secret)
    except Exception:
        return None
    return await d1_first(env.DB, "SELECT id, email, email_verified FROM users WHERE id = ?", user_id)


# ---------------------------------------------------------------------------
# Email helper (Resend)
# ---------------------------------------------------------------------------

async def _send_email(to: str, subject: str, html: str, env) -> None:
    """Send transactional email via Resend API. Silently skips if not configured."""
    try:
        api_key = env.RESEND_API_KEY
    except Exception:
        return
    if not api_key:
        return
    try:
        from js import fetch as js_fetch, Headers  # type: ignore[import]
        headers = Headers.new({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }.items())
        body = json.dumps({
            "from": "BarIQ <no-reply@bariq.co.uk>",
            "to": [to],
            "subject": subject,
            "html": html,
        })
        from js import Object  # type: ignore[import]
        opts = Object.new()
        opts.method = "POST"
        opts.headers = headers
        opts.body = body
        await js_fetch("https://api.resend.com/emails", opts)
    except Exception:
        pass  # non-fatal — email sending failure should not break the auth flow


# ---------------------------------------------------------------------------
# Route handlers — cocktails / ingredients (original)
# ---------------------------------------------------------------------------

async def handle_health(request, env):
    """GET /health"""
    try:
        await d1_first(env.DB, "SELECT 1 AS ok")
        db_status = "ok"
    except Exception as exc:
        db_status = f"error: {exc}"
    status_val = "ok" if db_status == "ok" else "degraded"
    return json_response({"status": status_val, "db": db_status}, env=env)


async def handle_list_cocktails(request, env):
    """GET /api/v1/cocktails[?q=&page=&per_page=]"""
    url = request.url
    params = _parse_query(url)

    q = params.get("q", "")
    try:
        page = max(1, int(params.get("page", "1")))
        per_page = min(100, max(1, int(params.get("per_page", "20"))))
    except ValueError:
        return error_response("Invalid pagination parameters", 422, env=env)

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
    return json_response({"total": total, "page": page, "per_page": per_page, "items": rows}, env=env)


async def handle_get_cocktail(request, env, slug):
    """GET /api/v1/cocktails/{slug}"""
    cocktail = await d1_first(
        env.DB,
        "SELECT id, name, slug, description, method, garnish, glassware FROM cocktails WHERE slug = ?",
        slug,
    )
    if not cocktail:
        return error_response("Cocktail not found", 404, env=env)

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
    return json_response(cocktail, env=env)


async def handle_list_ingredients(request, env):
    """GET /api/v1/ingredients[?category=&page=&per_page=]"""
    url = request.url
    params = _parse_query(url)

    category = params.get("category", "")
    try:
        page = max(1, int(params.get("page", "1")))
        per_page = min(200, max(1, int(params.get("per_page", "50"))))
    except ValueError:
        return error_response("Invalid pagination parameters", 422, env=env)

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
    return json_response({"total": total, "page": page, "per_page": per_page, "items": rows}, env=env)


async def handle_get_ingredient(request, env, ingredient_id):
    """GET /api/v1/ingredients/{ingredient_id}"""
    try:
        _uuid_mod.UUID(ingredient_id)
    except ValueError:
        return error_response("Invalid UUID", 422, env=env)

    row = await d1_first(
        env.DB,
        "SELECT id, name, category, description FROM ingredients WHERE id = ?",
        ingredient_id,
    )
    if not row:
        return error_response("Ingredient not found", 404, env=env)
    return json_response(row, env=env)


# ---------------------------------------------------------------------------
# Route handlers — auth
# ---------------------------------------------------------------------------

async def _parse_json_body(request) -> dict:
    """Read and parse the JSON request body."""
    try:
        text = await request.text()
        return json.loads(text)
    except Exception:
        return {}


async def handle_auth_register(request, env):
    """POST /api/v1/auth/register"""
    body = await _parse_json_body(request)
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not email or "@" not in email:
        return error_response("Valid email required", 400, env=env)
    if len(password) < 8:
        return error_response("Password must be at least 8 characters", 400, env=env)

    existing = await d1_first(env.DB, "SELECT id FROM users WHERE email = ?", email)
    if existing:
        return error_response("Email already registered", 409, env=env)

    user_id = str(_uuid_mod.uuid4())
    pw_hash = _hash_password(password)
    await d1_run(
        env.DB,
        "INSERT INTO users (id, email, password_hash, email_verified) VALUES (?, ?, ?, 0)",
        user_id, email, pw_hash,
    )

    # Send verification email (non-fatal)
    try:
        secret = env.JWT_SECRET
        token = _create_email_token(user_id, secret)
        try:
            base_url = env.BASE_URL or "https://bariq.co.uk"
        except Exception:
            base_url = "https://bariq.co.uk"
        link = f"{base_url}/auth/verify-email?token={token}"
        await _send_email(
            email,
            "Verify your BarIQ email",
            f"<p>Click <a href='{link}'>here</a> to verify your email address.</p>",
            env,
        )
    except Exception:
        pass

    return json_response({"id": user_id, "email": email, "email_verified": False}, status=201, env=env)


async def handle_auth_login(request, env):
    """POST /api/v1/auth/login"""
    body = await _parse_json_body(request)
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    user = await d1_first(
        env.DB,
        "SELECT id, email, password_hash, email_verified FROM users WHERE email = ?",
        email,
    )
    if not user or not user.get("password_hash") or not _verify_password(password, user["password_hash"]):
        return error_response("Invalid email or password", 401, env=env)

    secret = env.JWT_SECRET
    access_token = _create_access_token(user["id"], secret)
    refresh_token = str(_uuid_mod.uuid4())
    session_id = str(_uuid_mod.uuid4())

    import datetime as _dt
    expires_at = (_dt.datetime.now(_dt.timezone.utc) + _dt.timedelta(days=_REFRESH_TOKEN_EXPIRE_DAYS)).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    await d1_run(
        env.DB,
        "INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
        session_id, user["id"], refresh_token, expires_at,
    )

    secure = _is_secure(env)
    set_cookies = [
        _cookie("access_token", access_token, _ACCESS_TOKEN_EXPIRE_MINUTES * 60, "/", secure),
        _cookie("refresh_token", refresh_token, _REFRESH_TOKEN_EXPIRE_DAYS * 86400, "/api/v1/auth/refresh", secure),
    ]

    from js import Response, Headers  # type: ignore[import]
    h = {"content-type": "application/json"}
    h.update(_cors_headers(env))
    headers = Headers.new(h.items())
    for c in set_cookies:
        headers.append("Set-Cookie", c)
    return Response.new(json.dumps({"message": "Logged in"}), status=200, headers=headers)


async def handle_auth_logout(request, env):
    """POST /api/v1/auth/logout"""
    cookies = _parse_cookies(request)
    refresh_token = cookies.get("refresh_token")
    if refresh_token:
        await d1_run(env.DB, "DELETE FROM sessions WHERE token = ?", refresh_token)

    secure = _is_secure(env)
    from js import Response, Headers  # type: ignore[import]
    h = {"content-type": "application/json"}
    h.update(_cors_headers(env))
    headers = Headers.new(h.items())
    headers.append("Set-Cookie", _clear_cookie("access_token", "/", secure))
    headers.append("Set-Cookie", _clear_cookie("refresh_token", "/api/v1/auth/refresh", secure))
    return Response.new(json.dumps({"message": "Logged out"}), status=200, headers=headers)


async def handle_auth_refresh(request, env):
    """POST /api/v1/auth/refresh"""
    cookies = _parse_cookies(request)
    refresh_token = cookies.get("refresh_token")
    if not refresh_token:
        return error_response("Missing refresh token", 401, env=env)

    import datetime as _dt
    now_str = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    session = await d1_first(
        env.DB,
        "SELECT id, user_id, expires_at FROM sessions WHERE token = ?",
        refresh_token,
    )
    if not session or session["expires_at"] < now_str:
        return error_response("Invalid or expired refresh token", 401, env=env)

    # Rotate refresh token
    new_refresh = str(_uuid_mod.uuid4())
    new_expires = (_dt.datetime.now(_dt.timezone.utc) + _dt.timedelta(days=_REFRESH_TOKEN_EXPIRE_DAYS)).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    await d1_run(
        env.DB,
        "UPDATE sessions SET token = ?, expires_at = ? WHERE id = ?",
        new_refresh, new_expires, session["id"],
    )

    secret = env.JWT_SECRET
    new_access = _create_access_token(session["user_id"], secret)
    secure = _is_secure(env)

    from js import Response, Headers  # type: ignore[import]
    h = {"content-type": "application/json"}
    h.update(_cors_headers(env))
    headers = Headers.new(h.items())
    headers.append("Set-Cookie", _cookie("access_token", new_access, _ACCESS_TOKEN_EXPIRE_MINUTES * 60, "/", secure))
    headers.append("Set-Cookie", _cookie("refresh_token", new_refresh, _REFRESH_TOKEN_EXPIRE_DAYS * 86400, "/api/v1/auth/refresh", secure))
    return Response.new(json.dumps({"message": "Token refreshed"}), status=200, headers=headers)


async def handle_auth_verify_email(request, env):
    """GET /api/v1/auth/verify-email?token=..."""
    params = _parse_query(request.url)
    token = params.get("token", "")
    if not token:
        return error_response("Missing token", 400, env=env)
    try:
        secret = env.JWT_SECRET
        user_id = _decode_email_token(token, secret)
    except Exception:
        return error_response("Invalid or expired verification token", 400, env=env)

    await d1_run(env.DB, "UPDATE users SET email_verified = 1 WHERE id = ?", user_id)
    return json_response({"message": "Email verified successfully"}, env=env)


async def handle_auth_password_reset_request(request, env):
    """POST /api/v1/auth/password-reset/request"""
    body = await _parse_json_body(request)
    email = (body.get("email") or "").strip().lower()
    user = await d1_first(
        env.DB,
        "SELECT id, password_hash FROM users WHERE email = ?",
        email,
    )
    if user and user.get("password_hash"):
        try:
            secret = env.JWT_SECRET
            token = _create_reset_token(user["id"], secret)
            try:
                base_url = env.BASE_URL or "https://bariq.co.uk"
            except Exception:
                base_url = "https://bariq.co.uk"
            link = f"{base_url}/auth/reset-password?token={token}"
            await _send_email(
                email,
                "BarIQ password reset",
                f"<p>Click <a href='{link}'>here</a> to reset your password. This link expires in 1 hour.</p>",
                env,
            )
        except Exception:
            pass
    # Always 200 to prevent user enumeration
    return json_response({"message": "If that email is registered, a reset link has been sent"}, env=env)


async def handle_auth_password_reset_confirm(request, env):
    """POST /api/v1/auth/password-reset/confirm"""
    body = await _parse_json_body(request)
    token = body.get("token") or ""
    new_password = body.get("new_password") or ""
    if len(new_password) < 8:
        return error_response("Password must be at least 8 characters", 400, env=env)
    try:
        secret = env.JWT_SECRET
        user_id = _decode_reset_token(token, secret)
    except Exception:
        return error_response("Invalid or expired reset token", 400, env=env)
    pw_hash = _hash_password(new_password)
    await d1_run(env.DB, "UPDATE users SET password_hash = ? WHERE id = ?", pw_hash, user_id)
    return json_response({"message": "Password updated successfully"}, env=env)


# ---------------------------------------------------------------------------
# Route handlers — user profile
# ---------------------------------------------------------------------------

async def handle_user_me(request, env):
    """GET /api/user/me"""
    user = await _get_current_user(request, env)
    if not user:
        return error_response("Not authenticated", 401, env=env)
    return json_response({
        "id": user["id"],
        "email": user["email"],
        "email_verified": bool(user.get("email_verified")),
    }, env=env)


# ---------------------------------------------------------------------------
# Route handlers — My Bar
# ---------------------------------------------------------------------------

async def handle_get_bar(request, env):
    """GET /api/user/bar"""
    user = await _get_current_user(request, env)
    if not user:
        return error_response("Not authenticated", 401, env=env)
    rows = await d1_all(
        env.DB,
        """
        SELECT i.id, i.name, i.category, i.description
        FROM user_bar ub
        JOIN ingredients i ON i.id = ub.ingredient_id
        WHERE ub.user_id = ?
        ORDER BY i.name
        """,
        user["id"],
    )
    return json_response({"items": rows, "total": len(rows)}, env=env)


async def handle_add_bar_ingredient(request, env, ingredient_id):
    """POST /api/user/bar/{ingredient_id}"""
    user = await _get_current_user(request, env)
    if not user:
        return error_response("Not authenticated", 401, env=env)
    try:
        _uuid_mod.UUID(ingredient_id)
    except ValueError:
        return error_response("Invalid UUID", 422, env=env)
    ing = await d1_first(env.DB, "SELECT id FROM ingredients WHERE id = ?", ingredient_id)
    if not ing:
        return error_response("Ingredient not found", 404, env=env)
    # Idempotent insert
    await d1_run(
        env.DB,
        "INSERT OR IGNORE INTO user_bar (user_id, ingredient_id) VALUES (?, ?)",
        user["id"], ingredient_id,
    )
    return empty_response(204, env=env)


async def handle_remove_bar_ingredient(request, env, ingredient_id):
    """DELETE /api/user/bar/{ingredient_id}"""
    user = await _get_current_user(request, env)
    if not user:
        return error_response("Not authenticated", 401, env=env)
    try:
        _uuid_mod.UUID(ingredient_id)
    except ValueError:
        return error_response("Invalid UUID", 422, env=env)
    existing = await d1_first(
        env.DB,
        "SELECT ingredient_id FROM user_bar WHERE user_id = ? AND ingredient_id = ?",
        user["id"], ingredient_id,
    )
    if not existing:
        return error_response("Ingredient not in your bar", 404, env=env)
    await d1_run(
        env.DB,
        "DELETE FROM user_bar WHERE user_id = ? AND ingredient_id = ?",
        user["id"], ingredient_id,
    )
    return empty_response(204, env=env)


# ---------------------------------------------------------------------------
# Route handlers — Favourites
# ---------------------------------------------------------------------------

async def handle_get_favourites(request, env):
    """GET /api/user/favourites"""
    user = await _get_current_user(request, env)
    if not user:
        return error_response("Not authenticated", 401, env=env)
    rows = await d1_all(
        env.DB,
        """
        SELECT c.id, c.name, c.slug, c.description, c.method, c.garnish, c.glassware,
               uf.created_at AS favourited_at
        FROM user_favourites uf
        JOIN cocktails c ON c.id = uf.recipe_id
        WHERE uf.user_id = ?
        ORDER BY uf.created_at DESC
        """,
        user["id"],
    )
    # Enrich each cocktail with ingredients + tags
    enriched = []
    for row in rows:
        row["isFavourited"] = True
        cocktail_id = row["id"]
        row["ingredients"] = await d1_all(
            env.DB,
            """
            SELECT i.id AS ingredient_id, i.name, i.category, ci.quantity, ci.unit, ci.notes
            FROM cocktail_ingredients ci
            JOIN ingredients i ON i.id = ci.ingredient_id
            WHERE ci.cocktail_id = ?
            """,
            cocktail_id,
        )
        row["tags"] = await d1_all(
            env.DB,
            """
            SELECT t.id, t.name
            FROM cocktail_tags ct
            JOIN tags t ON t.id = ct.tag_id
            WHERE ct.cocktail_id = ?
            """,
            cocktail_id,
        )
        enriched.append(row)
    return json_response(enriched, env=env)


async def handle_add_favourite(request, env, recipe_id):
    """POST /api/user/favourites/{recipe_id}"""
    user = await _get_current_user(request, env)
    if not user:
        return error_response("Not authenticated", 401, env=env)
    try:
        _uuid_mod.UUID(recipe_id)
    except ValueError:
        return error_response("Invalid UUID", 422, env=env)
    cocktail = await d1_first(env.DB, "SELECT id FROM cocktails WHERE id = ?", recipe_id)
    if not cocktail:
        return error_response("Recipe not found", 404, env=env)
    await d1_run(
        env.DB,
        "INSERT OR IGNORE INTO user_favourites (user_id, recipe_id) VALUES (?, ?)",
        user["id"], recipe_id,
    )
    return empty_response(204, env=env)


async def handle_remove_favourite(request, env, recipe_id):
    """DELETE /api/user/favourites/{recipe_id}"""
    user = await _get_current_user(request, env)
    if not user:
        return error_response("Not authenticated", 401, env=env)
    try:
        _uuid_mod.UUID(recipe_id)
    except ValueError:
        return error_response("Invalid UUID", 422, env=env)
    await d1_run(
        env.DB,
        "DELETE FROM user_favourites WHERE user_id = ? AND recipe_id = ?",
        user["id"], recipe_id,
    )
    return empty_response(204, env=env)


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

ROUTES = [
    # Health
    ("GET",    r"^/health$",                                               handle_health,                        []),
    # Cocktails
    ("GET",    r"^/api/v1/cocktails$",                                     handle_list_cocktails,                []),
    ("GET",    r"^/api/v1/cocktails/(?P<slug>[^/]+)$",                     handle_get_cocktail,                  ["slug"]),
    # Ingredients
    ("GET",    r"^/api/v1/ingredients$",                                   handle_list_ingredients,              []),
    ("GET",    r"^/api/v1/ingredients/(?P<ingredient_id>[^/]+)$",          handle_get_ingredient,                ["ingredient_id"]),
    # Auth
    ("POST",   r"^/api/v1/auth/register$",                                 handle_auth_register,                 []),
    ("POST",   r"^/api/v1/auth/login$",                                    handle_auth_login,                    []),
    ("POST",   r"^/api/v1/auth/logout$",                                   handle_auth_logout,                   []),
    ("POST",   r"^/api/v1/auth/refresh$",                                  handle_auth_refresh,                  []),
    ("GET",    r"^/api/v1/auth/verify-email$",                             handle_auth_verify_email,             []),
    ("POST",   r"^/api/v1/auth/password-reset/request$",                   handle_auth_password_reset_request,   []),
    ("POST",   r"^/api/v1/auth/password-reset/confirm$",                   handle_auth_password_reset_confirm,   []),
    # User profile
    ("GET",    r"^/api/user/me$",                                          handle_user_me,                       []),
    # My Bar
    ("GET",    r"^/api/user/bar$",                                         handle_get_bar,                       []),
    ("POST",   r"^/api/user/bar/(?P<ingredient_id>[^/]+)$",                handle_add_bar_ingredient,            ["ingredient_id"]),
    ("DELETE", r"^/api/user/bar/(?P<ingredient_id>[^/]+)$",                handle_remove_bar_ingredient,         ["ingredient_id"]),
    # Favourites
    ("GET",    r"^/api/user/favourites$",                                   handle_get_favourites,                []),
    ("POST",   r"^/api/user/favourites/(?P<recipe_id>[^/]+)$",             handle_add_favourite,                 ["recipe_id"]),
    ("DELETE", r"^/api/user/favourites/(?P<recipe_id>[^/]+)$",             handle_remove_favourite,              ["recipe_id"]),
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
        headers = Headers.new(_cors_headers(env).items())
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

    return error_response("Not found", 404, env=env)
