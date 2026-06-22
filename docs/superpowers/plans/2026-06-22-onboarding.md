# Onboarding Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or executing-plans. TDD where logic is pure; integration tasks specify exact behavior against real files. Steps use `- [ ]`.

**Goal:** A 3-step `/welcome` onboarding wizard (Welcome → Build your bar → Payoff) that works for guests via localStorage and migrates into the account on sign-up; unlock "What Can I Make?" for guests.

**Architecture:** All client-side over the static cocktail data. A reusable `IngredientPicker`, a curated starter ingredient set, a shared `makeable` helper, guest-bar support in `auth-context`, and a first-visit banner on the home page. No backend required to run; best-effort migration when the user signs in.

**Tech Stack:** Next.js 14 (App Router, `output: 'export'`), TypeScript, CSS Modules, Vitest.

**Run all commands from** `cd "/d/VM/BarIQ PC/barchive/apps/web"`. Git `core.fsync` is `none` (network share — retry once on a transient `fsync`/`Bad file descriptor` error). Do NOT run `npm run build` in place (the dev server locks `.next/trace`); use `npx tsc --noEmit` and `npm run test`. Stay on branch `work/claude`.

Read the spec first: `docs/superpowers/specs/2026-06-22-onboarding-design.md`.

---

### Task 1: Extract the `makeable` helper (TDD)

Today the makeable predicate is inline in `CocktailsClient`. Extract it so the payoff and the client reuse one implementation.

**Files:** Create `src/lib/makeable.ts`, `src/lib/makeable.test.ts`.

- [ ] **Write the failing test** `src/lib/makeable.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { isMakeable, countMakeable } from "./makeable";
import type { Cocktail } from "./cocktails";

const c = (names: string[]): Cocktail => ({
  id: names.join(), name: "T", category: "Gin", glass: "Coupe", img: "", color: "#000",
  ingredients: names.map((n) => ({ name: n, amount: "1 oz", qty: 1, unit: "oz" })),
  steps: [], tags: [], abv: "", time: "", vegan: false, glutenFree: false, lowAbv: false, slug: "t",
});

describe("makeable", () => {
  const bar = new Set(["gin", "lime juice", "simple syrup"]);
  it("isMakeable true when all ingredients are in the bar", () => {
    expect(isMakeable(c(["Gin", "Lime Juice"]), bar)).toBe(true);
  });
  it("isMakeable false when one is missing", () => {
    expect(isMakeable(c(["Gin", "Campari"]), bar)).toBe(false);
  });
  it("countMakeable counts only fully-makeable cocktails", () => {
    expect(countMakeable([c(["Gin"]), c(["Gin", "Campari"])], bar)).toBe(1);
  });
});
```
- [ ] **Run** `npx vitest run src/lib/makeable.test.ts` → FAIL (module missing).
- [ ] **Implement** `src/lib/makeable.ts`:
```ts
import type { Cocktail } from "./cocktails";

/** True when every ingredient of the cocktail is present in the bar (lowercased names). */
export function isMakeable(cocktail: Cocktail, barNames: Set<string>): boolean {
  return cocktail.ingredients.every((i) => barNames.has(i.name.toLowerCase()));
}

/** Count cocktails fully makeable from the given bar. */
export function countMakeable(cocktails: Cocktail[], barNames: Set<string>): number {
  let n = 0;
  for (const c of cocktails) if (isMakeable(c, barNames)) n++;
  return n;
}
```
- [ ] **Run** the test → PASS.
- [ ] **Refactor `CocktailsClient`** to import `isMakeable` from `@/lib/makeable` instead of its inline `isMakeable` (keep the `barIngredientNames` Set it already builds; pass it to the helper). Run `npx tsc --noEmit` → clean; `npm run test` → existing tests still pass.
- [ ] **Commit:** `git add src/lib/makeable.ts src/lib/makeable.test.ts src/app/cocktails/CocktailsClient.tsx && git commit -m "refactor(makeable): extract shared makeable helper"`

---

### Task 2: Starter ingredient set (TDD)

**Files:** Create `src/lib/onboarding-ingredients.ts`, `src/lib/onboarding-ingredients.test.ts`.

- [ ] **Write the failing test** — every starter name should appear in the cocktail dataset (guard against dead picks; allow up to 20% misses to stay pragmatic):
```ts
import { describe, it, expect } from "vitest";
import { STARTER_INGREDIENTS } from "./onboarding-ingredients";
import { ALL_INGREDIENTS } from "./cocktails";

describe("STARTER_INGREDIENTS", () => {
  const lib = new Set(ALL_INGREDIENTS.map((n) => n.toLowerCase()));
  it("has a reasonable size", () => {
    expect(STARTER_INGREDIENTS.length).toBeGreaterThanOrEqual(30);
    expect(STARTER_INGREDIENTS.length).toBeLessThanOrEqual(60);
  });
  it("mostly maps to real dataset ingredient names", () => {
    const hits = STARTER_INGREDIENTS.filter((s) => lib.has(s.name.toLowerCase())).length;
    expect(hits / STARTER_INGREDIENTS.length).toBeGreaterThanOrEqual(0.8);
  });
});
```
- [ ] **Run** → FAIL.
- [ ] **Implement** `src/lib/onboarding-ingredients.ts`. First inspect the dataset to pick names that actually occur — run:
  `node -e "const {ALL_INGREDIENTS}=require('./src/lib/cocktails.ts')" ` will NOT work (TS); instead grep the most common ingredient names from the data via:
  `node -e "const fs=require('fs');const s=fs.readFileSync('src/lib/cocktails.imported.ts','utf8')+fs.readFileSync('src/lib/cocktails.diffords.ts','utf8');const m=s.match(/\"name\":\s*\"[^\"]+\"/g)||[];const c={};for(const x of m){const n=x.split(':')[1].trim().replace(/\"/g,'');c[n]=(c[n]||0)+1;}console.log(Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,80).map(e=>e[0]+' '+e[1]).join('\n'))"`
  Use the most common real names. Define ~40–50 across the six `StarterCategory` groups from the spec. Export `StarterIngredient`, `StarterCategory`, `STARTER_INGREDIENTS`.
- [ ] **Run** the test → PASS.
- [ ] **Commit:** `git add src/lib/onboarding-ingredients.* && git commit -m "feat(onboarding): curated starter ingredient set"`

---

### Task 3: Guest bar in `auth-context`

**Files:** Modify `src/lib/auth-context.tsx`.

- [ ] Add a localStorage key `const GUEST_BAR_KEY = "bariq_guest_bar";` and load/save helpers reusing the existing `loadStringSet`/`saveStringSet` pattern but for `BarIngredientAPI[]` (add `loadJSON`/`saveJSON` helpers, SSR-guarded).
- [ ] In the user-change effect: when `user` is null, initialise `barIngredientData` from `GUEST_BAR_KEY` (instead of clearing to `[]`).
- [ ] Make `addBarIngredient(id)` / `removeBarIngredient(id)`: when `user` is null, mutate state + persist to `GUEST_BAR_KEY` (guest item shape `{ id, name: id, category: "Other" }`); when `user` is set, keep current backend behavior.
- [ ] Add to context value: `setGuestBar(items: BarIngredientAPI[])` — guest-only; writes state + `GUEST_BAR_KEY`. Add it to `AuthContextValue` and the provider value.
- [ ] **Migration:** add `async function migrateGuestBar()` that reads `GUEST_BAR_KEY`, and for each item calls `addUserBarIngredient(item.id)` (best-effort, swallow errors), then removes `GUEST_BAR_KEY` and refetches `getUserBar()`. Call it inside `login` after `setUser(...)`, and expose it so the post-register/verify path can call it. (Favourites are already localStorage and survive sign-up — no migration in Phase 1.)
- [ ] `npx tsc --noEmit` → clean. `npm run test` → existing pass.
- [ ] **Commit:** `git add src/lib/auth-context.tsx && git commit -m "feat(onboarding): guest bar in localStorage + migration on sign-in"`

---

### Task 4: "What Can I Make?" for guests

**Files:** Modify `src/app/cocktails/CocktailsClient.tsx`.

- [ ] Change the toggle's render gate from `user && (…)` to `barIngredientData.length > 0 && (…)` so guests with a bar see it.
- [ ] On mount, read `?make=1` from `useSearchParams()` and initialise `canMakeFilter` to `true` when present (mirror the existing `?category=` initialisation pattern; keep it in sync if desired but at minimum initialise).
- [ ] `npx tsc --noEmit` → clean; `npm run test` → pass.
- [ ] **Commit:** `git add src/app/cocktails/CocktailsClient.tsx && git commit -m "feat(onboarding): unlock What Can I Make for guests + ?make=1"`

---

### Task 5: `IngredientPicker` component (TDD)

A reusable grouped, searchable multi-select.

**Files:** Create `src/components/IngredientPicker.tsx`, `.module.css`, `IngredientPicker.test.tsx`.

- [ ] **Write the failing test** — render with the starter set, type in the search box to filter, click an item to toggle, assert `onChange` fires with the selected name and the count updates. Props contract:
```ts
interface Props {
  items: { name: string; category: string }[];
  selected: string[];                 // selected names
  onToggle: (name: string) => void;
  searchPlaceholder?: string;
}
```
- [ ] **Run** → FAIL.
- [ ] **Implement**: group `items` by `category`, render a search `<input>` (filters by name, case-insensitive), and per group a list of toggle buttons (`aria-pressed`), showing a header count. Pure presentational; selection state is owned by the parent. CSS module matching existing tokens (chips/pills like the cocktails filters).
- [ ] **Run** the test → PASS.
- [ ] **Commit:** `git add src/components/IngredientPicker.* && git commit -m "feat(onboarding): reusable IngredientPicker"`

---

### Task 6: `OnboardingWizard` + `/welcome` route (TDD for nav)

**Files:** Create `src/components/OnboardingWizard.tsx`, `.module.css`, `OnboardingWizard.test.tsx`, `src/app/welcome/page.tsx`.

- [ ] **Write the failing test** — render `<OnboardingWizard />` (wrapped in `AuthProvider`), assert step 1 shows a "Get started" button; click it → step 2 shows the picker; select an ingredient and click "Continue" → step 3 shows a "You can make" count; clicking "Skip" sets `localStorage["biq_onboarded"]`.
- [ ] **Run** → FAIL.
- [ ] **Implement `OnboardingWizard.tsx`** (client):
  - `const ONBOARDED_KEY = "biq_onboarded";`
  - Local `step` state (1|2|3) and `selected: string[]` (ingredient names).
  - Step 1: copy + "Get started" / "Skip".
  - Step 2: `<IngredientPicker items={STARTER_INGREDIENTS} selected={selected} onToggle={…} />` + Continue/Skip + "N selected".
  - Step 3: compute `count = countMakeable(COCKTAILS, new Set(selected.map(s=>s.toLowerCase())))`; show the number; render up to 6 example makeable cocktail cards (reuse `CocktailCard`); CTAs: "Browse what I can make" → on click, persist the bar for guests via `setGuestBar(selected.map(n => ({ id: n, name: n, category: "Other" })))`, set onboarded flag, `router.push("/cocktails?make=1")`; "Save my bar" → `setGuestBar(...)`, set flag, `openAuthModal("register")`.
  - "Skip"/finish always sets `ONBOARDED_KEY`.
  - Use `useAuth()` for `setGuestBar` + `openAuthModal`, `useRouter` for navigation. SSR-guard localStorage.
- [ ] **Implement `app/welcome/page.tsx`** — a route rendering `<PageShell><OnboardingWizard /></PageShell>` with `export const metadata = { title: "Welcome — BarIQ" }`.
- [ ] **Run** the wizard test → PASS. `npx tsc --noEmit` → clean.
- [ ] **Commit:** `git add src/components/OnboardingWizard.* src/app/welcome/page.tsx && git commit -m "feat(onboarding): 3-step welcome wizard"`

---

### Task 7: First-visit banner on the home page

**Files:** Modify `src/app/page.tsx` (read it first; follow its structure/patterns). Possibly a small client `OnboardingBanner.tsx` if the home page is a server component.

- [ ] Read `src/app/page.tsx`. If it's a server component, create `src/components/OnboardingBanner.tsx` (client): on mount, if `localStorage["biq_onboarded"]` is unset, render a dismissible card "New here? Set up your bar in 30 seconds" with a link to `/welcome` and a dismiss "×" that sets the flag. Render nothing once onboarded/dismissed. Place `<OnboardingBanner />` near the top of the home page.
- [ ] `npx tsc --noEmit` → clean; `npm run test` → pass.
- [ ] **Commit:** `git add -A && git commit -m "feat(onboarding): first-visit banner on home"`

---

### Task 8: Post-register redirect to `/welcome`

**Files:** Modify the register-success path. Inspect `src/components/AuthForm.tsx` / `EmailVerifyView.tsx` / `auth-context` to find where registration completes and where the verify-email view shows.

- [ ] After a successful `register(...)`, if `localStorage["biq_onboarded"]` is unset, navigate to `/welcome` (or surface a "set up your bar" CTA on the verify-email view). Keep it non-blocking — the user can still verify their email. Choose the least invasive integration point; document it in the commit.
- [ ] `npx tsc --noEmit` → clean; `npm run test` → pass.
- [ ] **Commit:** `git add -A && git commit -m "feat(onboarding): send new sign-ups to /welcome"`

---

### Task 9: Full verify + final review

- [ ] `npm run test` → all green (existing 158 + new onboarding tests).
- [ ] `npx tsc --noEmit` → no errors.
- [ ] `npm run lint` if configured → clean (or note warnings).
- [ ] Sanity: grep that no client component imports server-only data (n/a here — onboarding is all client over static cocktail data, which is already client-available).
- [ ] If everything is green, the implementation is complete. Report commits, test counts, and any deviations.

---

## Notes for the implementer
- Keep everything client-side; the onboarding must work with the backend offline.
- Reuse existing visual tokens (CSS variables in `globals.css`) and component patterns (the cocktails filter chips are a good reference for the picker).
- Don't change the makeable matching semantics (exact lowercased name) — just extract it.
- localStorage keys: `biq_onboarded`, `bariq_guest_bar` (and existing `bariq_stub_favs`).
- SSR-guard every `localStorage`/`window` access (`typeof window === "undefined"` early-returns), matching existing code.
