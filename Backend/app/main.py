from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from sqlalchemy import text

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.rate_limit import limiter
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

    from app.services.audio_storage import ensure_audio_dir
    from app.services.cleanup import create_scheduler
    ensure_audio_dir()
    scheduler = create_scheduler()
    scheduler.start()

    yield

    scheduler.shutdown(wait=False)
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for the HearMeRead oral reading assessment PWA",
    version="1.0.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
    lifespan=lifespan,
)

#Rate limiter registration 
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_cors_origins = [settings.FRONTEND_URL]
if not settings.is_production:
    _cors_origins += ["http://localhost:5173", "http://localhost:3000", "http://localhost:8000", "https://hearmeread.pages.dev", "https://www.hearmeread.site", "https://hearmeread.site"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(api_router)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    import traceback, logging
    logging.getLogger("uvicorn.error").error(
        "Unhandled exception: %s\n%s", exc, traceback.format_exc()
    )
    detail = str(exc) if settings.DEBUG else "Internal server error"
    return JSONResponse(status_code=500, content={"detail": detail})


@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME}