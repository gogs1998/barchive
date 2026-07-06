# BarIQ (barchive) — Adversarial Review Brief

**Goal for the reviewer:** find what's *wrong* — correctness bugs, data-integrity problems,
security/licensing risk, untested paths, and shaky assumptions. This is a "try to break it"
pass, not a rubber stamp. Be skeptical; verify claims against the code rather than trusting
this brief.

_As of branch `work/claude` @ `65fde0b` (2026-07)._

## 1. Orientation
- **Repo:** `D:\VM\BarIQ PC\barchive`, branch `work/claude`. Web app in `apps/web/`, backend in `apps/api/`.
- **Stack (real):** Next.js 14 App Router + TypeScript, **static export** (`output: 'export'`)
  on Cloudflare Pages; a Python **Cloudflare Worker** (`apps/api/src/worker.py`) + **D1** (SQLite)
  for auth / My Bar / favourites. ⚠️ The `README.md` describes a *different* stack
  (FastAPI/Postgres/Vercel) — it's stale, and `apps/api` contains **both** a FastAPI app *and*
  the Worker, so it's genuinely unclear which auth is deployed. Worth untangling.
- **State:** 174 unit tests pass, type-check clean, production build exits 0 (~3,468 cocktail
  + ~900 ingredient static pages). **Not deployed** (parked by the owner). Design docs in
  `docs/superpowers/specs|plans/`.

## 2. What's been built (3 workstreams, all on this branch)
1. **Cocktail data 79 → 3,468** (commits `c939502`, `01aa50c`): 79 hand-curated + TheCocktailDB
   import + a Difford's Guide **quality subset** (3,156 of a 6,351-recipe scrape, filtered to
   real-glass + ≥2 ingredients + rating ≥4). Importers in `apps/web/tools/`. Data in
   `apps/web/src/lib/cocktails.ts` / `.imported.ts` / `.diffords.ts`.
2. **CocktailIQ flavor layer** (`b942097..de44d74`): a build-time balance/harmony meter in a
   toggle-able "Flavor Science" panel (gated) + data-driven substitutions. Modules in
   `apps/web/src/lib/cocktailiq/`.
3. **Onboarding Phase 1** (`c59ed90..65fde0b`): `/welcome` 3-step wizard, guest bar in
   localStorage, "What Can I Make?" unlocked for guests, best-effort migration on sign-in.

## 3. Attack surface (prioritized — start here)

### A. Data integrity (highest-value target)
- **Scraped Difford's data — licensing/ToS risk.** ~3,156 recipes scraped from
  diffordsguide.com (a commercial site) and committed into the repo. Is this legally
  shippable? Real exposure, not a nit.
- **Category is *derived* from ingredient keyword matching** (`tools/import-*.mjs`) — hunt for
  mis-categorized drinks (rum drink tagged "Gin", non-alcoholic tagged as a spirit, etc.).
- **Glass detection was weak** (regex over instructions; ~42% "unknown" in the full scrape,
  defaulted to "Coupe"). The quality subset requires a real glass — verify the glasses are
  actually *correct*, not just present.
- **Ingredient-name cleanup** decoded HTML entities and re-parsed countable garnishes; ~1
  known edge case remains. Grep the data for junk names, leftover entities (`&…;`), or measures
  leaking into names.
- **Images:** TheCocktailDB + `cdn.diffordsguide.com` URLs. Check for dead/placeholder/
  hotlink-broken images at scale. Dedup was by slug/id/img — look for near-duplicate cocktails
  that slipped through.

### B. CocktailIQ correctness
- **Donor data is dirty.** We fixed two defects (`ginger ale` mis-tagged as spirit; a
  `cranberry juice → ice` alias) — **assume more exist.** Audit
  `apps/web/src/lib/cocktailiq/data/ingredient_aliases.json` and `ingredient_categories.json`
  for nonsense mappings; each one silently corrupts balance scores and the eligibility gate
  (`isBalanceEligible` trusts `category_group === "spirit"`).
- **`getCompoundsWithFallback`** (`adapter.ts`) borrows a *different* ingredient's chemistry
  when an ingredient has 0 compounds — muddies the "chemistry" dimension. Judge acceptability.
- **The resolver's fuzzy fallback** (qualifier-strip → last word → first word, `resolver.ts`)
  can mis-resolve (e.g. "Orange Bitters", "Orange Juice", "…Cream"). Find bad resolutions.
- **Balance scoring is heuristic and taste-unvalidated** — thresholds are the donor's guesses.
  The meter is gated to ~2,340 recipes; check the gate isn't letting through drinks it scores
  nonsensically.
- **Substitution model is imperfect** (e.g. gin's top model sub is "ginger ale"). Curated
  overrides exist for only 17 ingredients.
- **Re-verify bundle isolation:** no CocktailIQ JSON should be in `.next/static` / `out/_next`
  (grep for `substitution_scores`/`flavordb`). A leak = ~860 KB shipped to every user.

### C. Onboarding
- **Makeable matching is exact lowercased-name** — brittle. A near-miss already shipped once
  (starter names didn't match the data → payoff showed ~5 instead of ~44). Stress the
  real-world "You can make N" number: honest across varied bars, or does one oddly-named
  ingredient tank it?
- **Migration is best-effort and login-only**; `migrateGuestBar` is exposed on context but has
  no external caller (dead public surface). Check for double-adds / lost bars on the
  guest→account transition.
- SSR guards on `localStorage`/`window`, and the empty-bar `?make=1` guard — try to break them.

### D. Auth & backend (may be the weakest area)
- Frontend needs the Worker at `NEXT_PUBLIC_API_URL` (defaults `localhost:8000`); **accounts
  can't be exercised without it running**, so these paths are largely untested end-to-end.
  Review the Worker auth (`apps/api`): JWT/refresh rotation, cookie flags
  (httpOnly/SameSite/Secure), OAuth redirect handling, anti-enumeration, reset-token expiry.
- **Known gaps (Phase 2, not built):** `display_name` collected at signup but never persisted
  (faked from email); verify-email frontend is a **stub** that doesn't call the real endpoint;
  favourites use localStorage, not the existing backend; email verification isn't enforced.
  Confirm these and look for related holes (e.g. can an unverified user reach protected data?).
- **Secret hygiene:** the donor projects hardcoded OpenAI/Unsplash keys. Grep barchive to
  confirm **no keys/secrets leaked** into the repo or client bundle.

### E. Ops
- Network-share/UNC build fragility (dev server 404s everything; build needs the dev server
  stopped, which locks `.next/trace`). Not a product bug, but it undermines CI/repro — check
  whether a clean-checkout build is reliable.

## 4. How to verify / reproduce
```
cd "D:/VM/BarIQ PC/barchive/apps/web"
npm run test          # expect 174 pass
npx tsc --noEmit      # expect clean
# Build: STOP any `next dev` first (it locks .next/trace on the share), then:
rm -rf .next out && npm run build       # expect exit 0, /welcome + ~3,468 pages
# Preview the static build (the dev server is unreliable on this share):
npx serve out -l 3000     # /welcome, /cocktails, /cocktails/margarita
grep -r "substitution_scores\|flavordb" out/_next/static   # must be empty (bundle isolation)
```

## 5. Already known — don't spend time re-flagging
Stale README / dead FastAPI files in `apps/api`; deploy is intentionally parked; the Phase-2
account gaps above are scoped-not-built; makeable is deliberately exact-match for now;
"I'm Feeling Lucky" is a parked idea. **New findings beyond these are what's valuable.**
