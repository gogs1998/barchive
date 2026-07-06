# Worker Auth (TypeScript/Hono) — Design Spec

**Date:** 2026-07-06
**Branch:** `work/claude`
**Status:** Approved (decisions made), pending implementation plan

## Goal

Make user accounts actually work in production. Port the deployed Cloudflare Worker
(`apps/api/src/worker.py`, raw Python/Pyodide, ~5 read-only GETs, no auth) to
**TypeScript + Hono** on the same D1 database, and implement **email+password auth core**
plus wiring **My Bar** and **Favourites** to the account. Then rewire the frontend to it.

Decisions already made by the owner:
- **Port to TS/Hono** (Python Workers can't hash passwords cleanly — no native bcrypt/argon2).
- **Email+password core first.** OUT of this pass: Google OAuth, email-verification enforcement,
  and Resend email *delivery* (endpoints that would email are stubbed/no-op until Resend keys exist).
- **Not deployed** (deploy is parked). Build + test locally; document required secrets.

## Why TS (recorded)
Password hashing is the one primitive the Python/Pyodide Worker can't do cleanly. TS gives
WebCrypto PBKDF2 natively, HS256 JWT (`hono/jwt`), `hono/cookie` with flags, first-class
`fetch`, and typed D1 (`env.DB.prepare().bind().all()` — same semantics as the Python helper).
The existing 5 GETs are trivial to re-express, so a full port is low-risk.

## Architecture

Convert `apps/api` into a TS Worker project (keep `wrangler.toml` bindings + `migrations/`;
the Python files become dead and can be removed in a later cleanup, not now):
- `apps/api/package.json` — deps: `hono`; dev: `wrangler`, `typescript`, `vitest`,
  `@cloudflare/workers-types`. Scripts: `dev` (wrangler dev), `test` (vitest), `typecheck`.
- `apps/api/tsconfig.json`, `apps/api/src/index.ts` (Hono app entry).
- `apps/api/wrangler.toml` — `main = "src/index.ts"`, remove `python_workers` flag, keep D1
  binding `DB` and the staging/prod database ids + routes. Add `[vars] ENVIRONMENT`.
- `apps/api/.dev.vars` (gitignored) — local `JWT_SECRET` for dev/test.

Module layout under `apps/api/src/`:
- `index.ts` — Hono app: CORS, route mounting.
- `db.ts` — thin typed D1 helpers (`first`, `all`, `run`).
- `auth/password.ts` — PBKDF2 hash/verify via WebCrypto (format `pbkdf2$<iters>$<saltB64>$<hashB64>`).
- `auth/jwt.ts` — HS256 sign/verify (access/verify/reset token types), using `JWT_SECRET`.
- `auth/session.ts` — opaque refresh token create/rotate/revoke against the `sessions` table.
- `auth/cookies.ts` — set/clear `access_token` + `refresh_token` cookies with correct flags.
- `auth/middleware.ts` — `requireUser` (reads `access_token`, 401 otherwise).
- `routes/auth.ts`, `routes/user.ts` (me + bar + favourites), `routes/catalog.ts` (the 5 GETs).

## Token & cookie scheme (port from FastAPI)
- **Access JWT** HS256 `{sub, type:"access", exp}`, TTL **30 min**.
- **Refresh** = opaque uuid, stored in `sessions(token, user_id, expires_at)`, TTL **30 days**,
  **rotated** on `/refresh`.
- **Reset JWT** `type:"password_reset"`, 1h (used by password-reset/confirm).
- Cookies: `access_token` (httpOnly, `SameSite=Lax`, `Secure` when `ENVIRONMENT!=="development"`,
  path `/`, max-age 30m); `refresh_token` (same flags, **path `/api/v1/auth/refresh`**, max-age 30d).
- **`JWT_SECRET` required** (P0-7): the Worker must fail/500 clearly if unset; never hardcode.
- **Password hashing:** PBKDF2-SHA256, ≥100k iterations, per-user random salt.

## Endpoints (this pass)
Auth (`/api/v1/auth`):
- `POST /register` `{email,password,displayName?}` → 201 `{id,email,email_verified,display_name}`;
  400 pw<8; 409 email taken. Stores `display_name`. (Verification email = no-op without Resend;
  do NOT enforce verification.)
- `POST /login` `{email,password}` → 200 **returns the user object** (frontend reads it) + sets cookies; 401 invalid.
- `POST /refresh` → rotates refresh, new cookies; 401 missing/expired.
- `POST /logout` → delete session row, clear cookies; 200.
- `POST /password-reset/request` `{email}` → always 200 (anti-enumeration); email is a no-op
  without Resend (log the token in dev). `POST /password-reset/confirm` `{token,new_password}` → 200.
- `GET /me` and `GET /api/user/me` → `{id,email,email_verified,display_name}`; 401 if no/invalid cookie.

My Bar (`/api/user/bar`) — **slug-keyed** (see Ingredient identity):
- `GET ""` → `{items:[{id,name,category,description}],total}` (id = slug).
- `POST /{slug}` → 204 idempotent; 404 unknown ingredient.
- `DELETE /{slug}` → 204; 404 if not in bar.

Favourites (`/api/user`):
- `GET /favourites` → `Cocktail[]` (full cards).
- `POST /favourites/{slug}` / `DELETE /favourites/{slug}` → 204 idempotent (cocktails already have `slug`).

Catalog (keep, unchanged behavior): `GET /health`, `/api/v1/cocktails`, `/api/v1/cocktails/{slug}`,
`/api/v1/ingredients`, `/api/v1/ingredients/{id}`.

**CORS:** credentialed — reflect the specific frontend origin (from `FRONTEND_ORIGIN` var) and send
`Access-Control-Allow-Credentials: true` (not `*`).

## D1 migrations (new)
- `0006_add_user_display_name.sql` — `ALTER TABLE users ADD COLUMN display_name TEXT;`
- `0007_add_ingredient_slug.sql` — `ALTER TABLE ingredients ADD COLUMN slug TEXT;` + unique index;
  backfill deterministically from `name` (same slugify as the frontend). Bar endpoints resolve
  slug → ingredient row.

## Ingredient identity (fixes P1-4 / P0-2 migration)
Make **slug** the stable public ingredient id. `user_bar` still stores the ingredient UUID
internally (FK), but the API accepts/returns slugs and resolves via the new `ingredients.slug`.
This lets the guest bar (keyed by name→slug) and `AddIngredientSheet` (slug ids) work, and
unblocks `migrateGuestBar`.

## Frontend rewire (`apps/web`)
- `lib/api.ts`: keep the existing paths/shapes (the Worker matches them). Canonicalize: `login`
  returns the user object; error bodies use `error`. Set `NEXT_PUBLIC_API_URL` to the Worker.
- `lib/auth-context.tsx`: send `displayName` on register (now persisted); enable `migrateGuestBar`
  to POST guest bar by **slug** (remove the `TODO(DECISION-1)` guard now that slugs resolve);
  keep the P0-2 "only clear localStorage after success" behavior.
- `AddIngredientSheet.tsx`: its slug ids now resolve server-side (no change required, or load the
  list from `/api/v1/ingredients` — optional).

## Error handling
- Missing `JWT_SECRET` → 500 with a clear message (never run with a default).
- All bar/favourites/me routes 401 without a valid access cookie.
- Anti-enumeration on register/reset (generic messages; reset always 200).
- D1 errors → 500 without leaking internals.

## Testing (vitest)
- `auth/password.test.ts` — hash→verify round-trip; wrong password fails; format stable.
- `auth/jwt.test.ts` — sign→verify; tampered token fails; expired fails; type mismatch fails.
- `auth/session.test.ts` — create/rotate/revoke against a fake/in-memory D1.
- Route handler tests with an in-memory D1 stub (a small object implementing `prepare().bind().all()/first()/run()`):
  register→login→me happy path; login wrong pw → 401; me without cookie → 401; bar add/list/remove
  by slug; favourite add/list/remove. Prefer a lightweight D1 fake over the workers test pool to
  keep CI simple; use `@cloudflare/vitest-pool-workers` only if a fake proves insufficient.
- Do NOT require a live D1 or deploy to pass tests.

## Out of scope (this pass)
Google OAuth; Resend email *delivery* + email-verification enforcement; deleting the old Python
Worker files (leave them; cleanup later); deployment; the frontend `verify-email` stub (P2-5) beyond
not-regressing it.

## Secrets the owner must set later (documented, not blocking the build)
`JWT_SECRET` (required), and — when OAuth/email land — `RESEND_API_KEY`, `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`,
via `wrangler secret put` for staging + production.
