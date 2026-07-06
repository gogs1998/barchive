# Worker Auth (TS/Hono) Implementation Plan

> Use superpowers:subagent-driven-development or executing-plans. Security-critical — TDD the crypto/token primitives. Steps use `- [ ]`.

**Goal:** Port `apps/api` from a Python/Pyodide Worker to TypeScript + Hono on the same D1, and implement email+password auth core + My Bar + Favourites, then rewire the frontend.

**Read first:** the spec `docs/superpowers/specs/2026-07-06-worker-auth-ts-design.md`; the current `apps/api/src/worker.py` (port its 5 GETs + its `d1_all/d1_first` semantics + query parsing); the FastAPI reference `apps/api/app/routers/{auth,user,bar,favourites}.py`, `app/auth/{tokens,dependencies,email}.py`, `app/config.py` (endpoint contracts, status codes, cookie flags); `apps/api/wrangler.toml`; `apps/api/migrations/d1/*.sql`; and the frontend `apps/web/src/lib/api.ts` + `auth-context.tsx` + `components/AddIngredientSheet.tsx` (contracts to match).

**Environment:** work from `apps/api`. Node/npm available. Git `core.fsync` is `none` (network share — retry once on transient fsync errors). Do NOT deploy. Tests run via `vitest` with a lightweight in-memory D1 fake (avoid the workers pool unless necessary). Stay on branch `work/claude`.

---

### Task 1: Scaffold the TS/Hono Worker

**Files:** `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/src/index.ts`, `apps/api/wrangler.toml` (edit), `apps/api/.dev.vars` (+ add to root `.gitignore`), `apps/api/vitest.config.ts`.

- [ ] `package.json`: deps `hono`; devDeps `wrangler`, `typescript`, `vitest`, `@cloudflare/workers-types`. Scripts: `dev`:`wrangler dev`, `test`:`vitest run`, `typecheck`:`tsc --noEmit`. `npm install`.
- [ ] `tsconfig.json`: `target ES2022`, `module ESNext`, `moduleResolution Bundler`, `types: ["@cloudflare/workers-types"]`, `strict: true`, `noEmit: true`.
- [ ] `wrangler.toml`: set `main = "src/index.ts"`; **remove** `compatibility_flags = ["python_workers"]` (keep a recent `compatibility_date`); keep the `[[d1_databases]]` binding `DB` with the staging/prod ids and the `bariq.co.uk/api/*` routes; add `[vars]` `ENVIRONMENT = "development"` and `FRONTEND_ORIGIN = "http://localhost:3000"`.
- [ ] `.dev.vars`: `JWT_SECRET="dev-only-not-for-prod-<random>"`. Add `apps/api/.dev.vars` to `.gitignore`.
- [ ] `src/index.ts`: a Hono app with an `Env` type (`{ DB: D1Database; JWT_SECRET: string; ENVIRONMENT: string; FRONTEND_ORIGIN: string }`), CORS middleware (reflect `FRONTEND_ORIGIN`, `Access-Control-Allow-Credentials: true`, allow methods/headers), and a `GET /health` → `{status:"ok"}`. Export `default app`.
- [ ] **Commit:** `chore(api): scaffold TS/Hono worker`.

### Task 2: Typed D1 helpers + in-memory fake for tests

**Files:** `apps/api/src/db.ts`, `apps/api/test/fake-d1.ts`.

- [ ] `db.ts`: `first<T>(db, sql, ...params): Promise<T|null>`, `all<T>(db, sql, ...params): Promise<T[]>`, `run(db, sql, ...params): Promise<void>` wrapping `db.prepare(sql).bind(...params).first()/.all()/.run()`.
- [ ] `test/fake-d1.ts`: a minimal in-memory `D1Database` implementing `prepare().bind().first()/all()/run()` over JS arrays of rows for the tables used (users, sessions, oauth_accounts, ingredients, cocktails, cocktail_ingredients, user_bar, user_favourites). Support the handful of SQL shapes the handlers use (insert, select-by-column, delete). Keep it simple — pattern-match the specific queries, not a general SQL engine.
- [ ] Small test that the fake round-trips an insert + select. **Commit:** `test(api): in-memory D1 fake`.

### Task 3: Password hashing (WebCrypto PBKDF2) — TDD

**Files:** `apps/api/src/auth/password.ts`, `apps/api/test/password.test.ts`.

- [ ] **Failing test:** `hashPassword(pw)` returns a string of form `pbkdf2$<iters>$<saltB64>$<hashB64>`; `verifyPassword(pw, hash)` true for the right pw, false for wrong; two hashes of the same pw differ (random salt).
- [ ] **Implement:** PBKDF2-SHA256, 100_000 iterations, 16-byte random salt (`crypto.getRandomValues`), 32-byte derived key via `crypto.subtle.importKey("raw", …, "PBKDF2")` + `deriveBits`. Constant-time compare on verify. Base64 encode salt+hash.
- [ ] Test passes. **Commit:** `feat(api): PBKDF2 password hashing`.

### Task 4: JWT (HS256) — TDD

**Files:** `apps/api/src/auth/jwt.ts`, `apps/api/test/jwt.test.ts`.

- [ ] **Failing test:** `signToken({sub, type}, secret, ttlSeconds)` → string; `verifyToken(token, secret)` returns the payload; tampered token throws/returns null; expired returns null; wrong secret fails.
- [ ] **Implement:** use `hono/jwt` (`sign`/`verify`, HS256) or a small WebCrypto HMAC implementation. Payload `{sub, type, exp}`. Provide typed helpers `signAccess(userId)`, `signReset(userId)`, `verifyOfType(token, type)`.
- [ ] Test passes. **Commit:** `feat(api): HS256 JWT helpers`.

### Task 5: Sessions / refresh tokens — TDD

**Files:** `apps/api/src/auth/session.ts`, `apps/api/test/session.test.ts`.

- [ ] **Failing test (fake D1):** `createSession(db,userId)` inserts a row + returns an opaque token; `rotateSession(db,oldToken)` invalidates old + returns new (null if missing/expired); `revokeSession(db,token)` deletes.
- [ ] **Implement:** opaque `crypto.randomUUID()` token, `sessions(id,user_id,token,expires_at,created_at)`, 30-day expiry, rotation = delete old + insert new in one logical step.
- [ ] Test passes. **Commit:** `feat(api): refresh-token sessions`.

### Task 6: Cookies + auth middleware

**Files:** `apps/api/src/auth/cookies.ts`, `apps/api/src/auth/middleware.ts`.

- [ ] `cookies.ts`: `setAuthCookies(c, accessJwt, refreshToken)` and `clearAuthCookies(c)` using `hono/cookie` `setCookie`. Flags: httpOnly; `SameSite=Lax`; `Secure` when `c.env.ENVIRONMENT !== "development"`; access `path=/` maxAge 1800; refresh `path=/api/v1/auth/refresh` maxAge 2592000.
- [ ] `middleware.ts`: `requireUser` — read `access_token` cookie, `verifyOfType(...,"access")`, load user from D1; on failure `c.json({error:"unauthorized"},401)`. Attach user to context.
- [ ] `typecheck` clean. **Commit:** `feat(api): auth cookies + requireUser middleware`.

### Task 7: Catalog routes (port the 5 GETs)

**Files:** `apps/api/src/routes/catalog.ts` (+ mount in `index.ts`).

- [ ] Port `GET /health`, `/api/v1/cocktails` (q/page/per_page), `/api/v1/cocktails/{slug}` (join ingredients+tags), `/api/v1/ingredients` (category/page/per_page), `/api/v1/ingredients/{id}` from `worker.py` — same response shapes. Use `db.ts`.
- [ ] Handler test against the fake D1 for `/api/v1/cocktails` + `/api/v1/cocktails/{slug}`. **Commit:** `feat(api): port catalog GET routes to TS`.

### Task 8: Migrations 0006 + 0007

**Files:** `apps/api/migrations/d1/0006_add_user_display_name.sql`, `0007_add_ingredient_slug.sql`.

- [ ] `0006`: `ALTER TABLE users ADD COLUMN display_name TEXT;`
- [ ] `0007`: `ALTER TABLE ingredients ADD COLUMN slug TEXT;` + `CREATE UNIQUE INDEX ... ON ingredients(slug);` + a backfill `UPDATE` deriving slug from name (document that the exact slugify must match the frontend's; if SQL can't do it cleanly, note a one-off Node backfill script `tools/backfill-ingredient-slugs.mjs` that reads the D1 via wrangler — but do NOT run it here, deploy is parked). Keep the SQL applyable.
- [ ] **Commit:** `feat(api): D1 migrations for display_name + ingredient slug`.

### Task 9: Auth routes — register/login/logout/refresh/me — TDD

**Files:** `apps/api/src/routes/auth.ts`, `apps/api/src/routes/user.ts` (me), tests.

- [ ] **Failing handler tests (fake D1):** register creates a user (hashed pw, display_name) → 201 user json; duplicate email → 409; pw<8 → 400. login right pw → 200 returns user + sets cookies; wrong pw → 401. me with valid access cookie → user; without → 401. refresh rotates. logout clears + deletes session.
- [ ] **Implement** per the spec contracts. `register` `{email,password,displayName?}`; `login` returns the **user object** (frontend reads it); cookies via Task 6; sessions via Task 5. `GET /me` at both `/api/v1/auth/me` and `/api/user/me`. Enforce `JWT_SECRET` present (500 if missing).
- [ ] Tests pass; typecheck clean. **Commit:** `feat(api): email+password auth (register/login/logout/refresh/me)`.

### Task 10: Password reset (endpoints; email no-op)

**Files:** `apps/api/src/routes/auth.ts` (extend), test.

- [ ] `POST /password-reset/request {email}` → always 200 (anti-enumeration); generate a reset JWT; if no `RESEND_API_KEY`, log it (no send). `POST /password-reset/confirm {token,new_password}` → verify reset JWT, set new password hash, 200; invalid token/pw<8 → 400.
- [ ] Test confirm-with-valid-token updates the hash. **Commit:** `feat(api): password reset endpoints (email delivery deferred)`.

### Task 11: My Bar + Favourites (slug-keyed) — TDD

**Files:** `apps/api/src/routes/user.ts` (extend), tests.

- [ ] **Failing tests:** bar GET (empty→`{items:[],total:0}`); POST `/api/user/bar/{slug}` resolves slug→ingredient, inserts, 204 idempotent, unknown slug→404; DELETE 204 / 404-if-absent. favourites GET returns full cards; POST/DELETE `/api/user/favourites/{slug}` 204 idempotent (cocktails have slug).
- [ ] **Implement** with `requireUser`; resolve ingredient slug → id via `ingredients.slug`; favourites resolve cocktail slug → id.
- [ ] Tests pass. **Commit:** `feat(api): My Bar + Favourites endpoints (slug-keyed)`.

### Task 12: Frontend rewire

**Files:** `apps/web/src/lib/api.ts`, `apps/web/src/lib/auth-context.tsx`, `apps/web/.env.example`.

- [ ] `api.ts`: confirm paths match the Worker; ensure `login` reads the returned user; error bodies read `error`. Document `NEXT_PUBLIC_API_URL` in `.env.example`.
- [ ] `auth-context.tsx`: send `displayName` on register; enable `migrateGuestBar` to POST guest items by **slug** (remove the `TODO(DECISION-1)` guard; keep the P0-2 clear-only-on-success). 
- [ ] Web `npx tsc --noEmit` + `npm run test` (from `apps/web`) stay green.
- [ ] **Commit:** `feat(web): wire frontend to the TS worker auth`.

### Task 13: Verify

- [ ] `apps/api`: `npm run test` (all green), `npm run typecheck` clean.
- [ ] `apps/web`: `npm run test` (still ≥194), `npx tsc --noEmit` clean.
- [ ] Document in the final report: required secrets (`JWT_SECRET` via `wrangler secret put`), the ingredient-slug backfill step needed before bar works against a real D1, and that deploy is intentionally not done.

## Notes
- Do NOT delete the Python `worker.py`/FastAPI files yet (separate cleanup).
- Do NOT run `wrangler deploy` or hit a live D1. All tests use the fake D1.
- Security: never hardcode `JWT_SECRET`; PBKDF2 ≥100k iters; constant-time hash compare; anti-enumeration on register/reset; `Secure`+`SameSite` cookies; credentialed CORS with a specific origin.
