from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

from app.core.config import settings

# asyncpg requires the postgresql+asyncpg:// scheme in DATABASE_URL
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DEBUG,
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

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
