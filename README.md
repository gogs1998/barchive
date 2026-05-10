# Barchive

> The bartender's recipe companion — search, browse, and mix drinks.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL 16 |
| ORM | SQLAlchemy 2 + Alembic |
| Hosting (FE) | Vercel |
| Hosting (BE) | Railway |
| CI/CD | GitHub Actions |
| Testing (FE) | Vitest + React Testing Library + Playwright |
| Testing (BE) | pytest + httpx |
| Errors | Sentry |
| Analytics | Plausible |

## Repo Structure

```
barchive/
├── apps/
│   ├── web/          # Next.js 14 frontend
│   └── api/          # FastAPI backend
├── packages/
│   └── shared/       # Shared types/constants
├── .github/
│   └── workflows/    # CI/CD pipelines
├── docker-compose.yml
└── README.md
```

## Local Development

### Prerequisites

- Node.js 20+
- Python 3.12+
- Docker + Docker Compose

### Start everything

```bash
docker-compose up -d          # Start PostgreSQL
cd apps/api && pip install -r requirements.txt && uvicorn main:app --reload
cd apps/web && npm install && npm run dev
```

### Environment Variables

Copy `.env.example` files in each app — **never commit real secrets**.

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

## Branch Strategy

- `main` → production (branch-protected, requires 1 review + CI)
- `staging` → staging environment (auto-deploy)
- Feature branches → PR → squash merge to `main`

## Quality Gates

- 80% unit test coverage enforced in CI
- E2E (Playwright) must pass on every merge
- WCAG AA accessibility checked via axe-playwright
- Lighthouse CI performance budget: LCP < 2s on simulated 3G

## Architecture Decision Record

See [ADR on BAR-3](/BAR/issues/BAR-3#document-adr).
