from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://barchive:barchive@localhost:5432/barchive"
    environment: str = "development"
    sentry_dsn: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
