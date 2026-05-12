from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://barchive:barchive@localhost:5432/barchive"
    environment: str = "development"
    sentry_dsn: str = ""

    # Auth — all secrets via environment; never committed
    jwt_secret: str = "dev-secret-change-in-production"  # override with strong secret in prod
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/google/callback"

    # Resend (transactional email)
    resend_api_key: str = ""
    email_from: str = "noreply@bariq.co.uk"
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
