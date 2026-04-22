from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "HearMeRead"
    DEBUG: bool = True
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    RESEND_API_KEY: str
    EMAIL_FROM: str
    EMAIL_FROM_NAME: str
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()