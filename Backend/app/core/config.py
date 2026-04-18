from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "HearMeRead"
    DEBUG: bool = True

    # Database — must use asyncpg+postgresql scheme for async SQLAlchemy
    # Port 6543 = Supabase Transaction Pooler (PgBouncer)
    DATABASE_URL: str = "postgresql+asyncpg://postgres.bqdgomkpemjqokkoudww:wK6YVFQ8p0z1po58@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?ssl=require"

    # Security
    SECRET_KEY: str = "sb_secret_Hg3tLTatRgZhJMykT9K60g_auTdH7AQ"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()