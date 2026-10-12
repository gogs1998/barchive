# BarIQ (barchive) — Fix Backlog

Execution-ready task list derived from the adversarial review of `work/claude @ 65fde0b`.
Each item has: severity, evidence (`file:line`), repro/verification, and a proposed fix.
Findings were verified against the real data/code, not the review brief.

**Conventions for the implementer**
- Work on `work/claude` (or a branch off it). Repo root: `D:\VM\BarIQ PC\barchive`, web app in `apps/web/`.
- After each data/logic change: `npm run test` (expect 174+ pass) and `npx tsc --noEmit` (clean).
- The clean build currently **fails to produce `out/`** on this network share (see OPS-1) — don't treat that as your regression until OPS-1 is addressed.
- Items are ordered by do-first value. P0 = ship-blocking data loss / user-facing breakage that's cheap to fix. DECISION items need product/architecture input before coding.

---

## P0 — fix first (safe, high-value, mostly mechanical)

### P0-1 · Image-dedup silently drops 67 real cocktails — CRITICAL
- **Where:** `apps/web/src/lib/cocktails.ts:653` (`mergeUnique`).
- **What's wrong:** `if (slugs.has(c.slug) || ids.has(c.id) || (c.img && imgs.has(c.img))) continue;` — dedups on shared `img` URL. 69 Difford's records share the placeholder `"/assets/images/themes/default_v5/cocktails/pixelated.jpg"`, so 67 distinct cocktails collide and vanish from `COCKTAILS` (Blue Lagoon, Blue Lady, Brighton Punch, Citrus Martini, Choc and Nut Martini, …).
- **Verify:** `grep -c "pixelated.jpg" apps/web/src/lib/cocktails.diffords.ts` → 69. Count `COCKTAILS.length` before/after fix.
- **Fix:** Remove the `img` clause from the dedup key (slug + id are sufficient), OR treat the known placeholder as non-deduping and blank/replace it. Prefer removing the img clause — it was the only thing causing this. Also set `img` on the placeholder records to a real fallback or empty so the surviving "Apple Pie Cocktail" doesn't render a broken relative path.
- **Expect:** `COCKTAILS.length` rises by ~67; page count in a build rises correspondingly.

### P0-2 · Guest bar destroyed on sign-in — CRITICAL (data loss)
- **Where:** `apps/web/src/lib/auth-context.tsx:193-212` (`migrateGuestBar`), called from `login()` at `:214-226`. Guest items created with `id = display name` at `apps/web/src/components/OnboardingWizard.tsx:26-28`.
- **What's wrong:** `addUserBarIngredient(item.id)` sends the display name (`"Lime Juice"`); backend expects a UUID → every request 422s → `catch {}` swallows → then `localStorage.removeItem(GUEST_BAR_KEY)` runs **unconditionally** (`:203-205`). Bar is wiped locally and never persisted server-side. Also: `register()` and Google OAuth never call migration at all.
- **Verify:** Trace `toGuestItems` → `migrateGuestBar` → `api.ts` `addUserBarIngredient` → backend param type (`apps/api/app/routers/bar.py:65-67` expects `uuid.UUID`).
- **Fix:**
  1. Resolve guest ingredient names to real ingredient ids before POST (needs a name→id lookup — reuse whatever the authenticated "add ingredient" flow should use; note `AddIngredientSheet` uses slug ids and hits the same UUID wall — see P1-4).
  2. Only `removeItem(GUEST_BAR_KEY)` **after** confirmed successful writes; on failure, keep the guest bar so it isn't lost.
  3. Wire migration into `register()` and the OAuth return path (or document why not).
- **Caveat:** This depends on the auth backend actually existing at runtime. See DECISION-1 — the deployed Worker has no bar endpoints, so this fix is only meaningful once the auth stack is settled. At minimum, make the localStorage clear conditional so no data is lost regardless.

### P0-3 · `?make=1` deep-link disabled on every hard load — HIGH
- **Where:** `apps/web/src/app/cocktails/CocktailsClient.tsx:40-42` (init from `?make=1`) and `:77-79` (empty-bar guard).
- **What's wrong:** The guard `useEffect(() => { if (barIngredientData.length === 0) setCanMakeFilter(false); }, [barIngredientData.length])` fires on first commit when the bar is still `[]` (guest hydration is post-mount / signed-in fetch is async), forcing the filter off. When the bar populates it never re-enables. Refresh or a shared `/cocktails?make=1` link silently shows everything unfiltered. Only in-app `router.push` from the wizard works.
- **Verify:** Effect-ordering trace; no test exists (`git show 65fde0b --stat`).
- **Fix:** Distinguish "bar not yet hydrated" from "bar genuinely empty." Options: gate the guard behind a `hasHydrated`/`isLoading` flag from the auth context, or only force the filter off when the bar is empty **and** hydration has completed. Add a regression test.

### P0-4 · `titleCase` mangles accented ingredient names — HIGH (569 instances)
- **Where:** `apps/web/tools/import-diffords.mjs:17-19` (`titleCase` uses `/\b\w/g`). Output baked into `apps/web/src/lib/cocktails.diffords.ts`.
- **What's wrong:** JS `\b\w` treats accented chars and apostrophes as word boundaries → "Orange CuraçAo" (137×), "CrèMe De Cacao" (219×), "CachaçA" (56×), "BéNéDictine" (82×), "Boker'S Style Bitters". Pollutes `ALL_INGREDIENTS` (filter UI) with garbage duplicates.
- **Verify:** `grep -o "CuraçAo\|BéNéDictine\|CachaçA\|CrèMe" apps/web/src/lib/cocktails.diffords.ts | sort | uniq -c`.
- **Fix:** Replace the boundary regex with a Unicode-aware capitalizer that only uppercases the first letter of each whitespace-separated token and doesn't re-capitalize after `'`/accents (e.g. split on spaces, uppercase first code point, lowercase remainder — or `/(^|\s)(\p{L})/gu`). Then **re-derive the data file.** If the raw Difford's scrape source is available, re-run the importer; if not, do a targeted find/replace on the 26 distinct mangled names in `cocktails.diffords.ts` (safe, they're unambiguous) and fix the importer so it doesn't recur.

### P0-5 · CocktailIQ alias/category corruption feeds wrong balance advice — CRITICAL (data)
- **Where:** `apps/web/src/lib/cocktailiq/data/ingredient_aliases.json` and `ingredient_categories.json`.
- **What's wrong:** Substring/fuzzy-join errors (same class as the already-fixed cranberry→ice and ginger-ale bugs), ~45 bad entries. Concretely:
  - Aliases: `pineapple juice / apple juice / tomato juice / pomegranate juice → ice` (346 uses total); `ginger → gin`, `ginger syrup → gin`; `applejack / pineapple / pineapple syrup → apple`; liqueurs collapsed to bare fruit (`coffee liqueur → coffee`, `banana liqueur → banana`, `cherry brandy → cherry`).
  - Categories: `"ice"` tagged as **citrus juice** (`juice_citrus_lemon`); `"apple"` tagged as a **base spirit**; `"firewater"` (cinnamon schnapps) as the sole `ice`-group member; `"whisky"` (British spelling) tagged `other/unknown` so Scotch loses base-spirit status.
- **Downstream impact:** In the ~2,314 gated recipes, **364 (15.7%) carry fake-citrus volume** and **27 have no real spirit** (a non-alcoholic smoothie is gated because Ginger→gin). Balance suggestions are wrong, e.g. Jungle Bird → "Too much citrus — reduce it" (the pineapple is fine).
- **Verify:** Dump both JSONs and audit every entry; re-run the resolver over the dataset and count fake-citrus / no-spirit gated drinks.
- **Fix:** Do a full manual audit of both files. Correct or remove the bad aliases/categories. Add a guard against substring-based aliasing (the generator that produced these should require whole-token or exact matches). Re-verify the gated-set stats afterward. Consider a unit test asserting a few known-good mappings (pineapple juice is juice not ice; ginger is not gin; apple juice is not a spirit).

### P0-6 · Curated cocktails all falsely `vegan: true` / `glutenFree: true` — HIGH
- **Where:** `apps/web/src/lib/cocktails.ts` — the `C()` factory (~line 217) defaults `dietary.vegan !== false` → true; no curated record passes `vegan: false`.
- **What's wrong:** All 79 curated drinks are vegan+GF, including egg/dairy/honey drinks (Whiskey Sour, White Russian, Grasshopper, Pink Lady, Irish Coffee, Penicillin). Both importers hardcode `vegan: false`, so the flag is also inconsistent across sources.
- **Fix:** Set correct dietary flags on the affected curated records (egg white, cream/dairy, honey → not vegan; check gluten for beer/certain liqueurs). Consider deriving the flag from an ingredient blocklist instead of hand-flagging, so it stays correct as data grows. Reconcile the importer default so all three sources use the same logic.

### P0-7 · JWT hardcoded default secret — CRITICAL if the FastAPI stack is ever run
- **Where:** `apps/api/app/config.py:10` → `jwt_secret: str = "dev-secret-change-in-production"`.
- **What's wrong:** Committed default with env fallback; `docker-compose.yml` never sets `JWT_SECRET`. Anyone can forge tokens for any user. Currently inert (deployed Worker has no auth), but ships in a runnable app.
- **Fix:** Remove the default; require `JWT_SECRET` from env and fail fast at startup if unset (raise on empty). Same treatment for any other signing/secret config. (Low effort; do it regardless of DECISION-1.)

---

## P1 — user-facing quality, needs a bit more work

### P1-1 · Absurd substitutions render on every recipe page — HIGH
- **Where:** `apps/web/src/lib/cocktailiq/substitutes.ts:14-20` (`curatedFor` matches raw display names only) and `:9-11` (`parityForScore` labels score ≥3 as "close"). Surfaced via `app/cocktails/[slug]/page.tsx` → `RecipeScaler` → `IngredientSubstitutes`.
- **What's wrong:** Only 17 curated overrides, matched against raw names, so most Difford's spellings fall through to raw model output: "Lemon Juice" → "Ice (close)", "Ginger Beer" → "Gin (close)" (the fixed bug reversed and un-fixed), "Egg White → Milk", "Bourbon Whiskey → Gin". No minimum-score filter; nonsense gets a trust-inducing "(close)" label.
- **Fix (mechanical part):**
  1. Run the resolver to a canonical name **before** the curated-override lookup, so "Bourbon Whiskey"/"Fresh Lemon Juice"/"Cognac (Brandy)" hit the existing overrides.
  2. Add a minimum-score filter so 0.0–0.5 model subs (bitters → "Fruit"/"Chocolate") are suppressed.
  3. Don't label sub-threshold scores "close."
- **Note:** Genuinely improving the model's substitution quality (vs just suppressing the worst) is DECISION-3.

### P1-2 · `getCompoundsWithFallback` corrupts the chemistry dimension — HIGH
- **Where:** `apps/web/src/lib/cocktailiq/adapter.ts:19-28`.
- **What's wrong:** When an ingredient has 0 FlavorDB compounds it borrows the first substitute's chemistry. Core spirits (whiskey, tequila, mezcal, bitters, triple sec, egg) have no entry, so **28.8% of gated ingredient slots** use borrowed chemistry — whiskey scored with gin's 17 compounds, every bitters dash with chocolate's, etc. Chemistry is the dimension that most varies between gated drinks, so it's effectively noise deciding Good vs Excellent.
- **Fix (judgment):** Either (a) stop borrowing and treat missing-chemistry ingredients as neutral/unknown so the dimension isn't silently faked, or (b) add real compound data for the core spirits. Prefer (a) as the safe short-term fix; flag drinks with too many unknown-chemistry ingredients as "chemistry not scored" rather than inventing a number.

### P1-3 · Resolver fuzzy fallback mis-resolves — HIGH
- **Where:** `apps/web/src/lib/cocktailiq/resolver.ts:42-57` (qualifier-strip → last word → first word).
- **What's wrong:** "Rye Whiskey 50% Abv" → "rye" (no category, base spirit lost); "Orange CuraçAo" → "orange juice" (citrus — the ç defeats the exact alias, so also fix via P0-4); "Scotch Whisky" → "whisky" (other/unknown, not spirit); "Ginger Liqueur" → gin; "Apple Schnapps" → apple[spirit]; "Passion Fruit" → fruit[citrus]; "Brut Sparkling Wine" → red wine.
- **Fix:** Extend the alias/category tables (P0-5) to cover these canonical spirit spellings (rye, scotch whisky, sparkling wine variants). Tighten the first-word/last-word fallback so it won't resolve a liqueur/schnapps to a base spirit — e.g. never let the fallback land on a `category_group === "spirit"` unless the qualifier confirms it. Add resolver tests for the worst cases.

### P1-4 · Authenticated "add ingredient" uses slug ids the backend rejects — MEDIUM
- **Where:** `apps/web/src/components/AddIngredientSheet.tsx:9-45` (slug ids like `"gin"`, `"lime-juice"`).
- **What's wrong:** Same UUID wall as P0-2 — POSTs slug, backend wants UUID → 422 → revert. The whole add-to-bar path for signed-in users is broken independent of migration.
- **Fix:** Resolve to real ingredient UUIDs (fetch the ingredient list from the API and map name/slug → id). Shares the name→id resolver work with P0-2. Blocked on DECISION-1 (which backend).

### P1-5 · Signed-in user visiting `/welcome` clobbers their account bar — MEDIUM
- **Where:** `apps/web/src/app/welcome/page.tsx` (no auth guard); `apps/web/src/components/OnboardingWizard.tsx:62,68` call `setGuestBar` unconditionally.
- **What's wrong:** `setGuestBar` overwrites the in-memory account bar with name-id guest items and writes `bariq_guest_bar`; subsequent `removeBarIngredient` DELETEs `/api/user/bar/Lime%20Juice` → 422. `finishAndSave` also opens the register modal for an already-signed-in user.
- **Fix:** Guard `/welcome` for authenticated users (redirect, or branch the wizard to merge into the account bar via the real API rather than the guest key). Don't call `setGuestBar` when a user is signed in.

### P1-6 · Wizard re-run replaces the guest bar instead of merging — MEDIUM
- **Where:** `apps/web/src/components/OnboardingWizard.tsx:36` (`selected` inits to `[]`) and `:62/68` (whole-bar replace).
- **What's wrong:** A returning guest with 10 items who re-enters `/welcome` and taps 2 ends with a 2-item bar, no warning. (The empty-selection step-3 branch correctly blocks a 0-item wipe — that guard holds.)
- **Fix:** Seed `selected` from the existing `barIngredientData` on mount, and/or merge rather than replace on finish.

### P1-7 · Measure-parser defects in the TheCocktailDB import — MEDIUM
- **Where:** `apps/web/tools/import-cocktaildb.mjs` (`parseMeasure`); data in `apps/web/src/lib/cocktails.imported.ts`.
- **What's wrong:** "Dirty Martini" imports `"70ml/2fl oz"` as `qty:70, unit:"oz"` → scaler treats it as 70 oz (~2.1 L). 33 amounts leak brand/descriptor fragments ("1 oz Bacardi", "1 fifth Smirnoff red label"). 115/1,724 ingredients have empty amounts. Punch-bowl recipes (1750 ml pours: Pink Penocha, Mudslinger, Frosé) mixed into the single-serve catalog.
- **Fix:** Handle `Nml/Nfl oz` dual-unit strings (prefer the ml value); strip trailing brand/color descriptors into the ingredient name or drop them; decide policy for empty amounts and batch recipes (flag/exclude, or scale down). Re-derive the imported file.

---

## P2 — lower severity / data hygiene

### P2-1 · Category derivation misfires — HIGH (data quality, not breakage)
- **Where:** `apps/web/tools/import-*.mjs` (fixed-priority spirit regex, keyword `beer/ale`, liqueur list).
- **What's wrong:** 36 drinks tagged by a minority spirit (cachaça "Electro Batida" tagged Mezcal off 10 ml); 13 non-alcoholic/spirit drinks tagged **"Beer"** via `ginger ale`/`root beer` substring (non-alcoholic "Ginger No-jito" tagged Beer); 58 alcoholic drinks dumped in "Other" (B-52, absinthe, genever, aquavit).
- **Fix:** Derive category from the **dominant** spirit by volume, not first-regex-match; use word-boundary matches that exclude "ginger ale"/"root beer"; extend the liqueur/spirit vocabulary (Kahlúa, Baileys, Grand Marnier, absinthe, genever, amaro, aquavit). Re-derive; spot-check the worst 15 from the review.

### P2-2 · Glass taxonomy fragmented across sources — MEDIUM
- **Where:** merged `GLASSES` (`cocktails.ts:674`); `normalizeGlass` in the CocktailDB importer.
- **What's wrong:** 35 distinct glass values with dupes/junk: "Martini"(471) vs "Cocktail"(74), "Rocks"(51) vs "Old-Fashioned"(30), "Flute"(63) vs "Champagne Flute"(4), plus "Whiskey Sour"(12), "Beer"(3), "Jar", "Balloon". Degrades any glass filter.
- **Fix:** Normalize to a canonical glass vocabulary across all three sources (single mapping table). Re-derive.

### P2-3 · Near-duplicate cocktails survive dedup — MEDIUM
- **Where:** `mergeUnique` + Difford's naming.
- **What's wrong:** 50 variant-name groups (Daiquiri vs "Daiquiri (Difford's recipe)", same for Gimlet/French 75/Sidecar/Bellini/Clover Club…) and 36 identical-ingredient-set groups (imported "Bumble Bee" ≡ "Dirty Nipple").
- **Fix:** Normalize slugs by stripping "(Difford's recipe)" and similar suffixes before dedup; optionally add an ingredient-set signature as a secondary dedup key (carefully — the Dry Martini ratio family is intentionally distinct).

### P2-4 · 9 of 22 curated hero images 404 — HIGH visibility, but needs new URLs
- **Where:** `apps/web/src/lib/cocktails.ts` IMG map.
- **Dead:** Jalapeño Margarita, Paper Plane, Gold Rush, Jungle Bird, Toronto, El Diablo, Naked and Famous, Garibaldi, Aperol Hugo (all Unsplash). See DECISION-2 — needs replacement image URLs chosen.

### P2-5 · `verify-email` stub marks any token verified — MEDIUM
- **Where:** `apps/web/src/app/verify-email/page.tsx:18-21` (`token === "expired" ? "expired" : "success"`).
- **What's wrong:** No backend call; asserts verification with zero proof.
- **Fix:** Either wire it to the real endpoint or gate the page behind a "not implemented" state — don't render a false "Email verified!". Tied to DECISION-1 (which backend / whether verification is in scope).

---

## DECISIONS NEEDED (don't code until resolved)

### DECISION-1 · Which auth backend is real?
The frontend (`apps/web/src/lib/api.ts`) is wired to FastAPI-scheme routes (`/api/v1/auth/*`, `/api/user/*`) that the **deployed Cloudflare Worker (`apps/api/src/worker.py`) does not implement** — it has 5 read-only GET routes and zero auth. So every account action 404s in production. Pick one:
- (a) Finish/deploy the FastAPI stack (then P0-7 and the MEDIUM auth gaps below become live must-fixes), or
- (b) Implement auth in the Worker (then rewire `api.ts` to Worker routes), or
- (c) Keep accounts parked and disable/hide the auth UI so it doesn't silently fail.
Everything in P0-2, P1-4, P1-5, P2-5 depends on this. **FastAPI auth gaps to fix if (a):** refresh tokens stored plaintext at rest (`auth.py:176-184`); OAuth `state` generated but never validated / login-CSRF (`auth.py:271-294`); reset tokens replayable for the full 1h window and don't revoke sessions (`auth.py:365-383`); email enumeration on register + login timing oracle; no rate limiting; `Secure` cookie flag depends on `ENVIRONMENT` being set (`auth.py:41`).

### DECISION-2 · Replacement images for the 9 dead curated heroes.
Need chosen URLs (Unsplash or the CDN pattern used elsewhere). Once provided this is a trivial data edit.

### DECISION-3 · Substitution model + balance thresholds quality.
P1-1 suppresses the worst visible garbage, but the underlying model (gin's top sub is ginger ale) and the heuristic, taste-unvalidated balance thresholds need product judgment / taste validation, not a code patch. Decide whether to expand curated overrides broadly, retrain/regenerate the model, or scope the "Flavor Science" feature down.

### DECISION-4 · Wizard starter names vs dataset vocabulary.
"You can make N" is dishonest for the flagship recipes: with all 50 starter ingredients selected only **1 of 61 curated classics** is makeable, because the wizard offers "Lime Juice"/"Triple Sec" while the curated data uses "Fresh Lime Juice"/"Cointreau" (three different naming vocabularies exist: wizard, curated, backend seed). This is a product decision about the canonical ingredient vocabulary before it can be reconciled. Evidence: `apps/web/src/lib/onboarding-ingredients.ts:23-87`, `makeable.ts:4-6`. Related: exact-match makeable is deliberate for now, so the *fix* is name reconciliation, not fuzzy matching — but that's a call to make.

---

## OPS-1 · Clean build cannot produce `out/` on the network share
- **Symptom:** `npm run build` compiles and generates all 4,382 static pages successfully, then dies with `EPERM: operation not permitted, unlink 'out\.0003…'` — exit 1, `out/` left with only orphaned lock files. The pages exist in `.next/server/app/` but the `output: 'export'` copy to `out/` fails on the UNC share.
- **Impact:** The deployable artifact is not reproducible from a clean checkout on this environment; CI/repro is unreliable. The brief's "build exits 0" only holds for incremental builds over an already-populated `out/`.
- **Fix (environment, not product):** Build off the network share (local disk / CI runner), or investigate the export step's atomic-rename behavior on this filesystem. Not a code fix — flag to whoever owns the build environment.

---

## Confirmed clean (no action)
Bundle isolation (CocktailIQ JSON stays build-time — imported only via a server component); secrets (no keys, no committed `.env`); SQL injection & IDOR (parameterized D1 / ORM, all user-scoped); SSR/prerender guards; Difford's quality-subset glasses (only ~12 exceptions at scale); HTML-entity decoding (the accent damage in P0-4 is a separate titleCase bug).

---
---

# Post-fix findings (second pass @ `74afd53`, TS/Hono auth worker)

The 16 items above are reported fixed. The following is **new** since then — a light second pass
focused on the TS auth worker (`apps/api/src/`) and the guest-bar migration. The auth worker itself
verified well: 43 backend tests pass, typecheck clean; `hono@4.12.28` JWT rejects `alg:none` /
tampered payloads / wrong secret and enforces `exp` (tested directly); every bar/favourites query is
scoped to the authenticated `user.id` (no IDOR); login uses a dummy-hash to defeat timing enumeration;
`requireUser` fails closed (500) when `JWT_SECRET` is unset; D1 schema has a NOCASE-unique email index,
cascading FKs, and indexed session tokens.

## NEW-1 · Wizard-built guest bars are silently dropped on sign-in — MEDIUM (partial regression of the old P0-2)
- **Where:** `apps/web/src/components/OnboardingWizard.tsx:26` (`toGuestItems` → `{ id: name, name, category: "Other" }`) vs `apps/web/src/lib/auth-context.tsx:210-238` (`migrateGuestBar`).
- **What's wrong:** The migration was fixed (L5/P0-2) to resolve guest items **by ingredient slug** and to only clear `bariq_guest_bar` once every item is written or terminally skipped — so the old *whole-bar wipe* is gone. But `migrateGuestBar` assumes guest `id` is a **slug** (its comment: "Guest items are keyed by ingredient slug (AddIngredientSheet ids)"), and the **/welcome wizard still keys guest items by display name** (`id: name`, e.g. `"Lime Juice"`, `"Blanco Tequila"`). On sign-in each wizard item POSTs its name as a slug → server 404 → the 404 branch treats it as a **terminal skip** (`status === 404` does *not* set `allResolved = false`) → the guest bar is cleared with those items **silently lost and never migrated**. Items added via `AddIngredientSheet` (which uses real slugs like `lime-juice`) migrate fine; wizard items do not.
- **Verify:** `grep -n "id: name\|id:" apps/web/src/components/OnboardingWizard.tsx` shows `toGuestItems` uses the name as id; `AddIngredientSheet.tsx:10-29` uses slugs. Trace the `status !== 404` branch in `auth-context.tsx:227-230`.
- **Fix:** Make the wizard emit slugs — slugify names in `toGuestItems` (reuse the same `slugify`/slug vocabulary the backend `ingredients.slug` uses), or map wizard selections to their slug ids at selection time. Then confirm those slugs actually exist in D1 (needs `apps/api/tools/backfill-ingredient-slugs.mjs` to have been run). Consider surfacing skipped items to the user ("N ingredients couldn't be added") instead of dropping them silently.
- **Note:** This is gated by DECISION-4 (three ingredient-naming vocabularies don't reconcile) — the wizard names must resolve to real ingredient slugs for migration to actually land, not just stop erroring.

## NEW-2 · No rate limiting on auth endpoints + PBKDF2 cost amplification — MEDIUM
- **Where:** `apps/api/src/routes/auth.ts` (`/login`, `/register`, `/password-reset/request`); no throttling anywhere (`index.ts` adds only CORS).
- **What's wrong:** `/login` runs a **600k-iteration PBKDF2 on every call** — by design, against a dummy hash even for non-existent emails (the anti-enumeration fix). With no rate limiting or lockout, an attacker can flood `/login` (or `/register` with novel emails) to force unbounded expensive hashing → CPU-time exhaustion / per-request cost amplification on Workers, and unthrottled credential stuffing.
- **Fix:** Add rate limiting on the auth routes (Cloudflare Rate Limiting rules, or a KV/Durable-Object counter keyed by IP + email) and consider per-account lockout/backoff. Cap password length (see NEW-4) so the hash input is bounded.

## NEW-3 · CSRF has no defense-in-depth beyond `SameSite=Lax` — MEDIUM (latent; triggers at cross-domain deploy)
- **Where:** `apps/api/src/auth/cookies.ts` (Lax cookies), state-changing routes in `routes/user.ts` / `routes/auth.ts`; frontend POSTs send no custom headers (`apps/web/src/lib/api.ts:295-366`).
- **What's wrong:** Protection against cross-site POST/DELETE relies **entirely** on `SameSite=Lax`. There is no CSRF token and no Origin/Referer check on mutations, and CORS doesn't stop CSRF (it only blocks *reading* the response; a slug-in-path POST like `/api/user/favourites/:slug` needs no body). The code already documents (L4) that a cross-**registrable-domain** prod deploy (e.g. Pages at `bariq.co.uk` + Worker at `*.workers.dev`) requires `SameSite=None; Secure` — at which point **all** CSRF protection disappears. Same-registrable-domain deploy (`bariq.co.uk` + `api.bariq.co.uk`) keeps Lax working and is safe.
- **Fix:** Prefer deploying the API on a subdomain of the site's registrable domain so `SameSite=Lax` stays effective. If cross-domain (`SameSite=None`) is unavoidable, add an Origin-header allowlist check (you already have `FRONTEND_ORIGIN`) or a CSRF token on state-changing requests.

## NEW-4 · Minor auth hardening (LOW — batch these)
- **No email format validation** (`routes/auth.ts:54,61`): register accepts any non-empty string as an email; garbage/невalid accounts possible. Add a basic format check.
- **No max password length** (`routes/auth.ts:62`): only a min-8 check; unbounded input feeds PBKDF2 (see NEW-2). Cap at e.g. 128 chars.
- **`verifyToken` accepts tokens without an `exp` claim** (`auth/jwt.ts:36-46`): not exploitable today (the signer always sets `exp`), but require `exp` presence for `access` tokens as defense-in-depth.
- **Refresh tokens stored plaintext at rest** (`auth/session.ts:27-35`, `sessions.token`): opaque random UUIDs, but a DB read yields directly usable tokens for up to 30 days. Consider storing a hash of the token.
- **Access token not revocable on logout** (`auth/middleware.ts` verifies signature + user existence only): logout revokes the refresh session but the access JWT stays valid for its ≤30-min TTL. Acceptable for stateless JWT; note it.
- **`/health` echoes the raw DB error string** (`index.ts:38`): minor internal-detail disclosure; return a generic status.
- **`getGoogleOAuthUrl` calls `/api/v1/auth/google`, which the worker doesn't implement** (`api.ts:247`): OAuth is deferred, so any "Sign in with Google" affordance wired to this will 404. Hide the button until the route exists, or implement the route.

## Not re-verified this pass
Data/CocktailIQ fixes (P0-1, P0-4, P0-5, P0-6, P1-*, P2-*) and the substantially-rewritten
`cocktails.diffords.ts` / `ingredient_*.json` were **not** independently re-checked in this pass —
the re-verification was stopped early. Treat those fixes as reported-but-unconfirmed.
