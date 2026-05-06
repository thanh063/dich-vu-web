from pydantic import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Ebook2LaTeX"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@postgres:5432/ebook2latex"
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    class Config:
        env_file = ".env"


settings = Settings()
