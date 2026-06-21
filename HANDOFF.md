# Project Handoff — BarIQ (bariq.co.uk)

## What this is

A bartender assistant website built on Cloudflare. Browse 79+ cocktails, use Bar Mode during service, manage your personal bar inventory, and get ingredient substitutions.

**Live site:** https://bariq.co.uk  
**GitHub:** https://github.com/gogs1998/barchive  
**Paperclip company:** BAR prefix (this company)

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (TypeScript) on Cloudflare Pages |
| Backend | Cloudflare Workers (Python) |
| Database | Cloudflare D1 (SQLite) |
| Auth | Better Auth — email+password + Google OAuth, JWT + httpOnly cookies |
| Email | Resend (transactional: verification, password reset) |
| CI/CD | GitHub Actions → Cloudflare deploy |

---

## Team

All agents are currently **paused (manual)**. To resume work, unpause them from the Paperclip UI.

| Agent | Role | Reports to |
|-------|------|------------|
| CEO | Strategy, delegation, board comms | — |
| CTO | Full technical stack, architecture | CEO |
| UXDesigner | UX, design system, accessibility | CEO |
| FrontendEngineer | Next.js components, UI, mobile | CTO |
| BackendEngineer | Cloudflare Worker API, D1 schema | CTO |
| DevOpsEngineer | CI/CD, Cloudflare infra, deploys | CTO |
| QAEngineer | E2E tests, browser QA, sign-off | CTO |

---

## Features shipped

### Phase 1 — Core site
- 79+ cocktail library (`cocktails.ts`)
- Cocktail browse, search (autocomplete + Enter key navigation), category filter
- Cocktail detail pages with full recipe steps
- Ingredient detail pages (`/ingredients/[slug]`)
- **Bar Mode** — full-screen 10-tile grid for service; PIN-locked exit; per-category boards; live clock; 86-aware dimming
- **Build View** — step-by-step guided build with timers and batch multiplier
- Mobile bottom tab bar, responsive header search
- Custom domain `bariq.co.uk` on Cloudflare

### Phase 2 — Personalization
- **User auth** — email+password registration, Google OAuth, email verification, password reset
- **My Bar** (`/my-bar`) — manage your personal ingredient inventory
- **Favourites** (`/my-bar/favourites`) — save cocktails; unauthenticated click opens auth modal
- **What Can I Make?** — filter recipe list to cocktails you can make with your current bar

### Post-Phase 2 — Additional features
- **Batch scaling + unit conversion** — scale recipes from 1–10 servings; oz/ml/cl toggle on recipe detail page
- **Ingredient substitutions** — `IngredientSubstitutes` component on cocktail detail page; static curated data for 17 key ingredients

---

## Current open issues

### BAR-51 — Category filter broken `?category=` (BLOCKED, CTO)
Server-side category filtering is broken. The fix is **code-complete and CI is green**. Blocked because GitHub branch protection requires a human reviewer to approve and merge [PR #12](https://github.com/gogs1998/barchive/pull/12).

**To unblock:** Approve and merge PR #12 on GitHub.

### BAR-46 — Phase 2 board review (IN_REVIEW, CEO)
Board confirmed site is working as an alpha but flagged "lots of problems." Board wants a fresh browser QA pass with findings and a feedback loop before next sprint.

**To resume:** Unpause agents, then comment on BAR-46 to kick off a fresh QA pass or provide direction on priorities.

---

## How to resume

1. **Approve PR #12** — https://github.com/gogs1998/barchive/pull/12 (fixes BAR-51 category filter)
2. **Unpause agents** from Paperclip UI — start with CTO; QAEngineer and FrontendEngineer will follow
3. **Comment on BAR-46** to give direction on next priorities (the board asked for more QA; the QAEngineer will do a browser pass and report back)
4. Optional: run `wrangler dev` locally from `apps/api/` or browse live at https://bariq.co.uk

---

## Costs

$3.64 spent this month, no hard budget limit set. All agents are on `github-copilot/claude-sonnet-4.6` via the opencode_local adapter.

---

## Key issue history (for context)

| Issue | What | Status |
|-------|------|--------|
| BAR-3 | Phase 1 architecture + repo setup | done |
| BAR-6 | CI/CD, staging + prod environments | done |
| BAR-15 | Deploy to bariq.co.uk custom domain | done |
| BAR-16 | Bar Mode + Build View PR merge | done |
| BAR-32 | Phase 2 kickoff + scoping | done |
| BAR-35 | Auth backend (Better Auth) | done |
| BAR-41 | Auth UI + My Bar + Favourites frontend | done |
| BAR-44 | Phase 2 production deploy | done |
| BAR-48 | Phase 2 QA fix batch | done |
| BAR-55/BAR-56 | Batch scaling backend + frontend | done |
| BAR-65 | Ingredient substitutions component | done |
| BAR-51 | Category URL filter (PR #12 pending merge) | blocked |
| BAR-46 | Phase 2 board review / next QA | in_review |
