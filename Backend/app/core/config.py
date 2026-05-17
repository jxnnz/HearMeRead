import os
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # ENV_FILE lets you point at .env.dev / .env.test / .env.prod from
        # outside the process (e.g. ENV_FILE=.env.dev uvicorn ...).
        # Docker injects vars directly, so ENV_FILE is only needed locally.
        env_file=os.getenv("ENV_FILE", ".env"),
        case_sensitive=True,
    )

    APP_NAME: str = "HearMeRead"
    ENVIRONMENT: Literal["development", "test", "production"] = "development"

    # DB_SCHEMA controls which PostgreSQL schema the app reads/writes.
    # dev + test share Supabase Project 1 via different schemas.
    # prod uses the default 'public' schema on Supabase Project 2.
    DB_SCHEMA: str = "dev"

    DEBUG: bool = True
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    RESEND_API_KEY: str

    # Cloudflare R2 (optional — leave blank in dev if not yet configured)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""
    R2_PUBLIC_URL: str = ""
    EMAIL_ADDRESS: str
    EMAIL_NAME: str
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"

    # Field-level encryption key for student PII (Fernet key — generate with:
    # python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
    ENCRYPTION_KEY: str

    # Groq API (for Whisper speech-to-text)
    GROQ_API_KEY: str = ""

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


settings = Settings()