# BarIQ (barchive) — Handoff for Adversarial Review

**Prepared:** 2026-08-23 · **Branch:** `work/claude` @ `74afd53` (local == GitHub, in sync)

You (the reviewer) are doing a **"try to break it" adversarial pass** — correctness bugs,
security/licensing risk, data-integrity problems, untested paths, shaky assumptions. Be
skeptical; verify against the code, not this doc.

## Repos
- **Local:** `D:\VM\BarIQ PC\barchive` (Windows; it's on a UNC network share `\\192.168.50.50\...` — see build gotcha).
- **GitHub:** `https://github.com/gogs1998/barchive` — review branch **`work/claude`** (NOT `main`; `main` + `feat/bar-60-*` branches are separate, older Paperclip-agent activity).
- Working tree clean; local and `origin/work/claude` both at `74afd53`.

## What BarIQ is
A bartender/drinks web app (live domain bariq.co.uk, **not currently deployed from this branch**).
Next.js 14 App Router + TypeScript, **static export** (`output: 'export'`) for Cloudflare Pages;
backend is a **Cloudflare Worker + D1 (SQLite)**. Monorepo: `apps/web` (frontend), `apps/api` (worker).

## What's been built (all on this branch)
1. **Cocktail data 79 → ~3,468**, all imaged: 79 hand-curated + TheCocktailDB import + a Difford's
   Guide quality subset (scraped). Importers in `apps/web/tools/`.
2. **CocktailIQ** flavor layer: a build-time balance/harmony meter (toggle-able "Flavor Science"
   panel, gated) + data-driven substitutions. `apps/web/src/lib/cocktailiq/`.
3. **Onboarding**: `/welcome` 3-step wizard, guest bar in localStorage, "What Can I Make?" for guests.
4. **User accounts (NEWEST, security-critical — focus here)**: the backend was **ported from a
   Python/Pyodide Worker to TypeScript + Hono**, with email+password auth + My Bar + Favourites.
   `apps/api/src/`.
5. **WhiskyIQ + WineIQ** — a *design spec only* (not built): `docs/superpowers/specs/2026-08-18-drinksiq-whisky-wine-design.md`.

## Prior review — already done, don't re-flag
An earlier adversarial pass (`docs/ADVERSARIAL-REVIEW-BRIEF.md` → `docs/FIXES.md`) found 16 issues
(P0-1..P0-7, P1-1..P1-7, P2-1..P2-3). **All 16 are fixed and committed.** A security review of the
auth build found **no critical/high** and its Medium items (M1–M4) were fixed. So: focus on what's
**new since** those, especially the TS auth Worker. Still-open items are the DECISIONS in FIXES.md
(dead hero images, substitution-model quality, ingredient-vocab reconciliation) + OPS-1 (build env).

---

## Attack surface — prioritized

### A. The TS/Hono auth Worker (highest value — newest, security-critical) — `apps/api/src/`
- `auth/password.ts` — PBKDF2-SHA256 (600k iters, random salt, constant-time verify). Check params + timing.
- `auth/jwt.ts` — HS256; confirm `alg` confusion rejected, `exp` enforced, token `type` checked.
- `auth/session.ts` — opaque refresh tokens in `sessions`; rotation invalidates old? expiry checked?
- `auth/cookies.ts` — httpOnly/Secure/SameSite; refresh cookie path-scoped to `/api/v1/auth/refresh`. Note: `SameSite=Lax` breaks if the SPA and API are on different registrable domains in prod.
- `auth/middleware.ts` (`requireUser`) — any protected route reachable without a valid access cookie? IDOR: is every bar/favourites query scoped by the authenticated `user_id`?
- `routes/auth.ts`, `routes/user.ts`, `routes/catalog.ts`, `index.ts` (CORS — credentialed, single origin, never `*`).
- `db.ts` — parameterized queries only? `env.ts`, `users.ts`.
- Tests: `apps/api/test/` (in-memory `node:sqlite` D1 fake). Are they meaningful or do they stub the thing under test? Is there a JWT_SECRET-unset fail-closed test?
- **Known residual (Low, from the security review):** stateless reset tokens are replayable within their 1h window (partially mitigated by session-eviction on reset); concurrent-duplicate-register maps UNIQUE violation to 409. Confirm/attack.
- **Old Python worker (`apps/api/src/worker.py`) and the whole `apps/api/app/*` FastAPI tree still exist** (dead, not deleted). Note `apps/api/app/config.py` had a hardcoded JWT default — that was the *reference* code, fixed separately; confirm nothing live uses it.

### B. Data integrity — `apps/web/src/lib/cocktails*.ts`, `apps/web/tools/`
- **Licensing/ToS:** ~3,156 recipes scraped from diffordsguide.com committed into the repo — is this shippable? TheCocktailDB images + Difford's CDN images at scale (dead links?).
- Category derived from ingredient keywords (`tools/shared.mjs`, `import-*.mjs`) — mis-categorized drinks? Glass normalization, dedup (`mergeUnique` in `cocktails.ts`), measure parsing (`import-cocktaildb.mjs` `parseMeasure`).
- Data files: `cocktails.ts` (curated + merge), `cocktails.imported.ts` (TheCocktailDB), `cocktails.diffords.ts` (Difford's).

### C. CocktailIQ correctness — `apps/web/src/lib/cocktailiq/`
- `data/ingredient_aliases.json` + `ingredient_categories.json` — the fuzzy-join corruption class was fixed (~45 entries) but **assume more remain**; each corrupts balance scores + the `isBalanceEligible` gate. Audit them.
- `resolver.ts` (fuzzy fallback mis-resolution), `adapter.ts` (chemistry handling — borrowing was removed; missing compounds now neutral), `balance.ts` (heuristic, taste-unvalidated thresholds), `substitutes.ts` (curated 17 + model fallback).
- Re-verify **bundle isolation**: `grep -r "substitution_scores\|flavordb" apps/web/out/_next/static` must be empty (data must stay build-time only).

### D. Onboarding — `apps/web/src/app/welcome/`, `components/OnboardingWizard.tsx`, `lib/makeable.ts`, `lib/onboarding-ingredients.ts`, `lib/auth-context.tsx`
- Exact-match makeable (`makeable.ts`) is brittle — DECISION-4: three ingredient-naming vocabularies (wizard/curated/backend) don't reconcile, so "You can make N" understates for curated classics. Stress it.
- `migrateGuestBar` in `auth-context.tsx` (guest→account on sign-in): data-loss safe? double-adds? 404-skip logic?

### E. Ops / build
- **OPS-1:** clean `npm run build` compiles all pages then dies with `EPERM unlink 'out\...'` on the UNC share (the `output:'export'` copy step). Not reproducible from a clean checkout on this filesystem — build off the share / on CI. Not a code bug, but it breaks CI/repro claims.

---

## Full asset map
```
docs/
  HANDOFF-GROK.md                  ← this file
  ADVERSARIAL-REVIEW-BRIEF.md      ← prior review brief
  FIXES.md                         ← prior verified fix backlog (all P0/P1/P2 done; DECISIONS open)
  superpowers/specs/               ← design specs: cocktailiq, onboarding, worker-auth-ts, drinksiq(whisky/wine)
  superpowers/plans/               ← impl plans: cocktailiq, onboarding, worker-auth-ts

apps/api/                          ← Cloudflare Worker backend
  src/index.ts                     ← Hono app + CORS
  src/env.ts  src/db.ts  src/users.ts
  src/auth/{password,jwt,session,cookies,middleware}.ts
  src/routes/{auth,user,catalog}.ts
  src/worker.py                    ← OLD Python worker (dead, kept)
  app/**                           ← OLD FastAPI reference (dead, kept)
  test/                            ← vitest + node:sqlite D1 fake (43 tests)
  migrations/d1/0001..0008.sql     ← 0006 display_name, 0007 ingredient slug, 0008 email NOCASE
  wrangler.toml                    ← main → src/index.ts, D1 binding DB, staging/prod ids
  tools/backfill-ingredient-slugs.mjs   ← run before My Bar works on real D1

apps/web/                          ← Next.js frontend (static export)
  src/lib/
    cocktails.ts / cocktails.imported.ts / cocktails.diffords.ts   ← ~3,468 cocktails
    cocktailiq/{resolver,adapter,balance,substitutes,types}.ts + data/
    onboarding-ingredients.ts  makeable.ts  scaler.ts  substitutions.ts
    auth-context.tsx  api.ts  themes.ts
  src/app/                         ← routes: cocktails, ingredients, bar, my-bar, favourites,
                                     profile, reset-password, verify-email, welcome, not-found
  src/components/                  ← CocktailCard, BalanceMeter, FlavorSciencePanel,
                                     OnboardingWizard, IngredientPicker, AuthForm/Modal, etc.
  tools/                           ← import-cocktaildb.mjs, import-diffords.mjs, shared.mjs, diffords/
```

## How to verify / run
```
# Frontend (from apps/web)
npm install
npm run test        # ~194 pass
npx tsc --noEmit    # clean
# Build: STOP any `next dev` first (locks .next/trace on the share); build off the share if EPERM:
rm -rf .next out && npm run build
npx serve out -l 3000     # preview the static export (dev server is unreliable on the share)

# Backend auth worker (from apps/api)
npm install
npm test            # 43 pass (offline, fake D1)
npm run typecheck   # clean
```

## Not done / needs owner decisions (don't waste time re-flagging)
- **Deferred by scope:** Google OAuth; Resend email delivery + email-verification enforcement;
  deleting the dead Python/FastAPI files; **deploy** (parked).
- **Open DECISIONS (FIXES.md):** replacement URLs for ~9 dead curated hero images; substitution-model /
  balance-threshold quality (taste-validation); ingredient-vocabulary reconciliation (DECISION-4).
- **Before accounts run on real D1:** set `JWT_SECRET` (`wrangler secret put`); apply migrations 0006–0008;
  run `apps/api/tools/backfill-ingredient-slugs.mjs`. Nothing here is deployed or hitting a live DB.

**New findings beyond the above are what's valuable.**
