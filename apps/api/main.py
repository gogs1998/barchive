from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import cocktails, ingredients, health, auth, user

if settings.sentry_dsn:
    import sentry_sdk
    sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.environment)

app = FastAPI(
    title="Barchive API",
    description="The bartender's recipe companion",
    version="0.1.0",
)

# Tighter CORS: restrict origins in production via ALLOWED_ORIGINS env var.
# In development we fall back to localhost; never allow wildcard in production.
_allowed_origins = (
    ["http://localhost:3000", "http://127.0.0.1:3000"]
    if settings.environment == "development"
    else [settings.frontend_url]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,  # required for httpOnly cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(cocktails.router, prefix="/api/v1")
app.include_router(ingredients.router, prefix="/api/v1")
app.include_router(auth.router)   # prefix: /api/v1/auth
app.include_router(user.router)   # prefix: /api/user  (canonical profile endpoint)
