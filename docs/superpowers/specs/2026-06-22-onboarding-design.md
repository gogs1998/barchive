# Onboarding (Build-Your-Bar) — Design Spec

**Date:** 2026-06-22
**Branch:** `work/claude`
**Status:** Approved (user authorized build), pending implementation plan

## Goal

Give first-time BarIQ users a guided first run that personalizes the app immediately:
a 3-step `/welcome` wizard that ends with "you can make N cocktails right now." Works
for guests with **no backend** (localStorage), and migrates into the account on sign-up.

This is **Phase 1**. The account-completion gaps (persist display name, wire verify-email,
favourites-to-backend, verification enforcement) are **Phase 2** — a separate spec, not built here.

## Constraints / context

- Frontend is a static export (`output: 'export'`) on Cloudflare Pages. Onboarding is
  client-side; it must work with the Worker backend offline.
- Existing `auth-context` (`apps/web/src/lib/auth-context.tsx`) owns user/session, the
  bar (`barIngredientData: BarIngredientAPI[]`, backend-backed when logged in, **empty for
  guests today**), and favourites (localStorage, key `bariq_stub_favs`).
- "What Can I Make?" lives in `CocktailsClient` and today only renders for logged-in users.
  It matches `cocktail.ingredients.every(i => barNames.has(i.name.toLowerCase()))`.
- `BarIngredientAPI = { id: string; name: string; category: string; description?: string }`.

## The flow — `/welcome` (3 steps, client wizard)

A new route `app/welcome/page.tsx` rendering a client `OnboardingWizard` with local step state:

1. **Welcome** — what BarIQ is (browse 3,468 cocktails, build your bar, see what you can make).
   Buttons: "Get started" → step 2; "Skip" → sets the onboarded flag and goes home.
2. **Build your bar** — a `IngredientPicker` over a curated **starter ingredient set**
   (~40–50 common items grouped by category: Spirits, Liqueurs, Mixers & Soda, Citrus & Juice,
   Syrups & Sweeteners, Bitters & Garnish). Tap to toggle; a search box filters; a running
   "N selected" count. "Continue" → step 3; "Skip" allowed.
3. **Payoff** — computes "**You can make N cocktails right now**" from the selected bar using
   the existing makeable logic, shows a few example cards, and two CTAs:
   - **Browse what I can make** → `/cocktails?make=1` (the can-make filter pre-enabled).
   - **Save my bar** → opens the existing auth modal in `register` view (migration happens on success).
   Finishing (either CTA, or "Done") sets the onboarded flag.

The wizard is fully skippable at every step and never blocks the app.

## Starter ingredient set

New data module `apps/web/src/lib/onboarding-ingredients.ts`:
```ts
export interface StarterIngredient { name: string; category: StarterCategory }
export type StarterCategory =
  | "Spirits" | "Liqueurs" | "Mixers & Soda" | "Citrus & Juice"
  | "Syrups & Sweeteners" | "Bitters & Garnish";
export const STARTER_INGREDIENTS: StarterIngredient[];
```
Names are chosen to be **common in the cocktail dataset** so selections produce meaningful
makeable matches (the matcher is exact-by-lowercased-name). Examples: "Gin", "Vodka",
"White Rum", "Tequila Blanco", "Bourbon", "Sweet Vermouth", "Dry Vermouth", "Campari",
"Cointreau", "Simple Syrup", "Fresh Lime Juice", "Fresh Lemon Juice", "Soda Water",
"Angostura Bitters", etc. (~40–50 total).

> Note: makeable matching stays exact (lowercased name). A fuzzier/alias-based match is a
> future improvement (the CocktailIQ alias resolver could power it) — out of scope here.

## Guest bar in `auth-context`

Extend `auth-context` so the bar works for logged-out users via localStorage:
- New key `bariq_guest_bar` storing `BarIngredientAPI[]` (for a guest, `id === name`).
- When `user` is null: initialise `barIngredientData` from the guest-bar localStorage, and
  make `addBarIngredient(id)` / `removeBarIngredient(id)` operate on localStorage (no API call).
  When `user` is set: keep today's backend-backed behavior.
- Add a helper the wizard uses to set the whole bar at once for guests:
  `setGuestBar(items: BarIngredientAPI[])` (writes localStorage + state; guest only).

## "What Can I Make?" for guests

In `CocktailsClient`, change the gate from `user && …` to **show the toggle whenever
`barIngredientData.length > 0`** (so guests with a bar can use it). Read `?make=1` from the
URL on mount to pre-enable the filter (parallels the existing `?category=` handling).

## Trigger

- First visit: if `localStorage["biq_onboarded"]` is unset, the home page shows a prominent
  "New here? Set up your bar" entry (a dismissible banner/card). (No forced redirect — a
  banner is less intrusive and SSG-safe.) Clicking it → `/welcome`.
- After registration completes, redirect to `/welcome` if not yet onboarded.
- Completing or skipping the wizard sets `biq_onboarded`. My Bar remains the place to edit
  the bar later; the wizard is re-runnable by visiting `/welcome` directly.

## Migration on sign-up / login

In `auth-context`'s `login` and post-register success path: if a guest bar exists in
localStorage, POST each ingredient to the backend (`addUserBarIngredient`), then clear the
guest-bar key and refetch `getUserBar()`. Favourites already persist in localStorage across
the guest→user transition (no migration needed in Phase 1; favourites-to-backend is Phase 2).
Migration is best-effort: failures are swallowed and the localStorage copy is retained.

## Components / files

- Create `app/welcome/page.tsx` (route; renders the wizard inside `PageShell` or standalone).
- Create `components/OnboardingWizard.tsx` (client; step state, Welcome/Bar/Payoff).
- Create `components/IngredientPicker.tsx` (client; grouped, searchable multi-select; reusable).
- Create `lib/onboarding-ingredients.ts` (starter set).
- Create `lib/makeable.ts` — extract the makeable predicate (`countMakeable(barNames, cocktails)`
  and `isMakeable(cocktail, barNames)`) so both `CocktailsClient` and the payoff reuse it
  (today the logic is inline in `CocktailsClient`).
- Modify `lib/auth-context.tsx` (guest bar + setGuestBar + migration).
- Modify `app/cocktails/CocktailsClient.tsx` (gate change + `?make=1`, use `lib/makeable.ts`).
- Modify `app/page.tsx` (first-visit banner) — read existing structure and follow its patterns.
- Module CSS for each new component, matching existing tokens.

## Error handling

- Backend offline → guest flow fully works; "Save my bar" still creates an account when the
  backend is up, otherwise surfaces the auth modal's normal error. Migration failures non-fatal.
- Empty bar at payoff → "Add a few ingredients to see what you can make" + back to step 2.
- `biq_onboarded` / localStorage access guarded for SSR (`typeof window` checks, as existing code does).

## Testing (Vitest)

- `lib/makeable.test.ts` — `isMakeable`/`countMakeable` for a known bar vs known cocktails
  (all-present → makeable; one missing → not).
- `lib/onboarding-ingredients.test.ts` — every starter ingredient name appears in at least
  one cocktail in the dataset (guards against dead picks) — or at least ≥80% do.
- `components/IngredientPicker.test.tsx` — toggling selection, search filtering, count.
- `components/OnboardingWizard.test.tsx` — step navigation (welcome→bar→payoff), skip sets flag,
  payoff shows a count.
- auth-context guest-bar: add/remove persists to localStorage when logged out (unit-level).

## Out of scope (this cycle)

- Phase 2 account gaps (display name persistence, verify-email endpoint wiring + resend,
  favourites-to-backend, email-verification enforcement).
- The "I'm Feeling Lucky" spin (parked idea, not part of onboarding).
- Changing makeable matching to fuzzy/alias-based.
