from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.v1.router import api_router
from app.db.session import engine, Base

# Import all models so Alembic and Base.metadata.create_all can find them
from app.models import teacher, student  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # On startup — create tables if they don't exist (dev convenience)
    # In production, use Alembic migrations instead
    Base.metadata.create_all(bind=engine)
    yield
    # On shutdown — nothing needed for now


app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for the HearMeRead oral reading assessment PWA",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — allow the React PWA frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API routes
app.include_router(api_router)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
