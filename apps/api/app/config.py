from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://barchive:barchive@localhost:5432/barchive"
    environment: str = "development"
    sentry_dsn: str = ""

    # Auth — all secrets via environment; never committed. JWT_SECRET has NO
    # default: it is required, and the app fails fast at startup if it is unset
    # or empty (a hardcoded default would let anyone forge tokens for any user).
    jwt_secret: str
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

    @field_validator("jwt_secret")
    @classmethod
    def _require_nonempty_jwt_secret(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(
                "JWT_SECRET must be set to a strong, non-empty value via the "
                "environment (no default is permitted)."
            )
        return v

    class Config:
        env_file = ".env"


settings = Settings()
