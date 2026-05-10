from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import cocktails, ingredients, health

if settings.sentry_dsn:
    import sentry_sdk
    sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.environment)

app = FastAPI(
    title="Barchive API",
    description="The bartender's recipe companion",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production via env
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(cocktails.router, prefix="/api/v1")
app.include_router(ingredients.router, prefix="/api/v1")
