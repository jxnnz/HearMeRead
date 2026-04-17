from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

from app.core.config import settings

# asyncpg requires the postgresql+asyncpg:// scheme in DATABASE_URL
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=False,      # not supported with transaction pooler
    pool_size=5,
    max_overflow=10,
    echo=settings.DEBUG,
    connect_args={
        "ssl": "require",
        "statement_cache_size": 0,   # required for pgBouncer/transaction pooler
    },
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# All SQLAlchemy models inherit from this base
Base = declarative_base()


# --------------------------------------------------------------------------- #
#  Dependency — yields an async DB session, closes it after the request        #
# --------------------------------------------------------------------------- #

from typing import AsyncGenerator

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session