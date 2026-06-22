# CocktailIQ Integration — Design Spec

**Date:** 2026-06-22
**Branch:** `work/claude`
**Status:** Approved design, pending implementation plan

## Goal

Add a "flavor science" layer to BarIQ (barchive) by porting two features from the
CocktailIQ donor project (`D:\Cursor\CocktailIQ`, the `supernova` + `claude/bartabiq`
sub-projects):

1. **Balance/harmony meter** — a 4-dimension flavor analysis (diversity, proportions,
   chemistry, harmony + overall rating), shown on cocktail detail pages inside a
   **toggle-able "Flavor Science" panel** (opt-in, off by default).
2. **Smarter ingredient substitutions** — upgrade the existing per-ingredient
   substitutions with CocktailIQ's data-driven model (191 canonical ingredients).

Both were chosen together by the user. The balance meter is **gated** to recipes it
can judge fairly.

## Key constraint & core principle

barchive is a **static export** (`output: 'export'`) on Cloudflare Pages — no Node
server at runtime. CocktailIQ's balance + substitution logic is **pure TypeScript
over precomputed static JSON** (verified: no runtime backend dependency; the Python
FastAPI/SQLite in `supernova` is only an offline data generator whose outputs were
already exported to JSON).

**Core principle: compute at build time.** Cocktail detail pages are statically
generated (SSG). All CocktailIQ logic runs during `next build`, and only the small
results (scores, substitute lists) ship to the browser. The ~860 KB of CocktailIQ
data **never enters the client bundle.**

## Source assets (from the donor)

Copied into barchive under `apps/web/src/lib/cocktailiq/data/`:

| File | From | Size | Purpose |
|---|---|---|---|
| `ingredient_categories.json` | `bartabiq/data/cocktailiq/` | 35 KB | `category_group` per ingredient → balance meter diversity/proportions/harmony |
| `flavordb_join.json` | `bartabiq/data/cocktailiq/` | 438 KB | `compounds[]` per ingredient → chemistry dimension (Jaccard overlap) |
| `substitution_model.json` | `bartabiq/data/cocktailiq/` | 385 KB → ~halved | `substitution_scores[name] = [[sub, score], …]`. **Drop the unused `embeddings` block.** |
| `ingredient_aliases.json` | `supernova/data/processed/` | 15 KB | `alias_to_canonical` maps barchive names ("white rum") → canonical ("rum"). 324 entries. |

Ported source (from `bartabiq/`): `lib/balance-calculator.ts` logic and the
`BalanceMeter.tsx` layout (rewritten without framer-motion — barchive has no such dep).

## Architecture

New module group `apps/web/src/lib/cocktailiq/`:

- **`resolver.ts`** — name resolution + data access:
  - `resolveCanonical(name: string): string | null` — lowercase → `alias_to_canonical`
    lookup → fallback to direct lowercase key if present in the vocab → else `null`.
  - `getCategoryGroup(canonical): string | null`, `getCompounds(canonical): string[]`,
    `getSubstituteScores(canonical): [string, number][]`.
  - Fixes the donor bug where `ingredient_categories.json` nesting (`{ ingredients: {…} }`)
    was read at the wrong level.
- **`balance.ts`** — ported `calculateBalance(build: SelectedIngredient[]): BalanceScores`
  and types (`SelectedIngredient`, `BalanceScores`, `CategoryGroup`). Pure, synchronous.
  Weights: `proportions*0.30 + harmony*0.25 + diversity*0.25 + chemistry*0.20`.
  Rating bands: Excellent ≥80 / Good ≥65 / Fair ≥50 / Needs Work.
- **`adapter.ts`** — barchive ↔ CocktailIQ glue:
  - `cocktailToBuild(cocktail): SelectedIngredient[]` — for each ingredient resolve
    canonical, attach `category_group` + `compounds`, convert `qty`/`unit` → `volumeMl`
    using the scaler's `TO_ML` table. Unresolved ingredients still contribute `volumeMl`
    (so proportions stay sane) but no category/compounds.
  - `isBalanceEligible(cocktail): boolean` — the gate.

### Balance meter gate (`isBalanceEligible`)

Show the meter only when ALL hold:
- recipe is alcoholic (≥1 spirit/liqueur/fortified ingredient), AND
- ingredient count is 2–6, AND
- has a base spirit (≥1 ingredient whose `category_group` is `spirit`), AND
- at least half the ingredients resolve to a known canonical (so the score is meaningful).

Ineligible recipes don't render the Flavor Science toggle at all.

## Features

### Feature 1 — Balance meter in a toggle-able "Flavor Science" panel

- `components/BalanceMeter.tsx` — **server component**, CSS bars (no framer-motion).
  Props: `{ scores: BalanceScores }`. Renders overall number, rating label, 4 dimension
  bars, and the rule-based suggestions list. Pure presentational.
- `components/FlavorSciencePanel.tsx` — **client component** (`'use client'`), the
  toggle. Receives the precomputed `scores` as a prop. Renders a labelled toggle
  button/segmented control ("Flavor Science" — off by default); when on, reveals the
  meter. State is local `useState`; default collapsed so the recipe view stays clean.
  Accessible: button with `aria-expanded`/`aria-controls`. (Because the meter markup
  must be passed from a server context into a client toggle, the panel takes the meter
  as `children` — the server page renders `<FlavorSciencePanel><BalanceMeter …/></…>`.)
- Cocktail detail page (`app/cocktails/[slug]/page.tsx`, server/SSG): compute
  `isBalanceEligible(cocktail)`; if true, `calculateBalance(cocktailToBuild(cocktail))`
  and render the panel in a new section. The score computation runs at build time; only
  the small `scores` object (rendered into the meter markup) crosses to the client.

> Rationale for the toggle: keeps the default recipe page focused; flavor analysis is an
> opt-in "nerd mode" the user can switch on per recipe.

### Feature 2 — Smarter substitutions (augment, not replace)

- Keep the 17 curated `SUBSTITUTIONS` entries as high-quality overrides (notes + parity).
- For any ingredient not in the curated map, fall back to the model: resolve →
  `getSubstituteScores` → top-K (default 5) → map canonical sub names to Title-Case
  display names → `SubstituteEntry[]` (parity derived from score band; generic note).
- The detail page precomputes `substitutesByIngredient: Record<string, SubstituteEntry[]>`
  at build and passes it through `RecipeScaler` (new prop) to `IngredientSubstitutes`.
  This keeps `substitution_model.json` out of the client bundle.
- `IngredientSubstitutes.tsx` changes from doing its own lookup to receiving its
  substitutes via prop, with the curated map still as the default when no prop is given
  (backward compatible).

## Data flow

```
next build (server/SSG)
  └─ app/cocktails/[slug]/page.tsx
       ├─ cocktailToBuild(cocktail) ─┬─ isBalanceEligible? ─ calculateBalance ─→ <FlavorSciencePanel><BalanceMeter scores/></…> (client toggle wraps server-rendered meter)
       │                             └─ (reads categories + flavordb JSON, build-time only)
       └─ substitutesByIngredient = merge(curated, model lookups)  (reads substitution + alias JSON, build-time only)
            └─ <RecipeScaler substitutesByIngredient> ─→ <IngredientSubstitutes substitutes>
```
Client receives only: `scores` (a dozen numbers + strings) and the substitute lists for
the recipe's ingredients. No CocktailIQ JSON in the client bundle.

## Error handling

- Unknown ingredient → `resolveCanonical` returns `null` → omitted from category/chemistry
  contributions; no crash.
- Recipe with too few resolvable ingredients → fails the gate → no Flavor Science panel.
- Empty substitute list → `IngredientSubstitutes` renders nothing (existing behavior).

## Testing (Vitest, matching existing style)

- `resolver.test.ts` — alias hit ("White Rum"→"rum"), direct lowercase hit, miss→null.
- `adapter.test.ts` — ml conversion correctness; `isBalanceEligible` true for a classic
  3-ingredient spirit drink, false for a 1-ingredient shot / non-alcoholic / 8-ingredient punch.
- `balance.test.ts` — a known classic (e.g. Margarita-like build) scores each dimension
  in a sane range and produces a rating.
- `substitutions.test.ts` (extend) — curated entry overrides model; model fills a gap for
  a non-curated ingredient; unknown ingredient → empty.
- Component smoke test — `FlavorSciencePanel` toggles open/closed and shows the meter.

## Out of scope (YAGNI)

- The Python/FastAPI backend, GAT inference, SQLite, calibration/feedback subsystems.
- Recalibrating the balance bands for the full dataset (gating handles the mismatch).
- CocktailIQ's own recipe dataset (barchive has its own ~3,468).
- Price/ABV bar-management features from bartabiq.

## Open implementation details (decide during plan)

- Exact parity mapping from substitution score → equal/close/different bands.
- Top-K for model substitutes (default 5).
- Whether the toggle is a single disclosure button or a small two-tab segmented control
  ("Recipe" / "Flavor") — leaning single "Flavor Science" disclosure button for MVP.
