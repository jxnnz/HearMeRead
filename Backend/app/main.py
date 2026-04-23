
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text

from app.core.config import settings
from app.router import api_router
from app.db import engine
from app.routes.asr import router as asr_router

from app import models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    import logging
    logger = logging.getLogger("uvicorn.error")
    logger.info("=" * 50)
    logger.info(f"  APP        : {settings.APP_NAME}")
    logger.info(f"  ENVIRONMENT: {settings.ENVIRONMENT}")
    logger.info(f"  DB_SCHEMA  : {settings.DB_SCHEMA}")
    logger.info(f"  DEBUG      : {settings.DEBUG}")
    logger.info(f"  BACKEND    : {settings.BACKEND_URL}")
    logger.info(f"  FRONTEND   : {settings.FRONTEND_URL}")
    logger.info("=" * 50)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for the HearMeRead oral reading assessment PWA",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

_cors_origins = [settings.FRONTEND_URL]
if not settings.is_production:
    # Allow common local ports during development and testing
    _cors_origins += ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(asr_router)


@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME}