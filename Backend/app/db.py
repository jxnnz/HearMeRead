from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings


# ── Declarative base (imported by all models) ─────────────────────────────────

class Base(DeclarativeBase):
    pass


# ── Engine ────────────────────────────────────────────────────────────────────
#
# Previously used NullPool, which created a NEW TCP+SSL connection for every
# single request (~200-500ms overhead each time). Switching to the default
# AsyncAdaptedQueuePool keeps a small pool of persistent connections open,
# so subsequent requests reuse them instantly.
#
# Supabase uses PgBouncer on port 6543 for server-side pooling, so our local
# pool simply maintains warm TCP tunnels to the pooler — no conflicts.

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    # ── Connection pool settings ──────────────────────────────────────────
    pool_size=5,              # 5 persistent connections kept open
    max_overflow=10,          # up to 15 total under load spikes
    pool_recycle=300,         # recycle connections every 5 min (avoids stale)
    pool_pre_ping=True,       # verify connection is alive before using it
    pool_timeout=30,          # wait up to 30s for a connection from the pool
    connect_args={
        "ssl": "require",
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        # Route all queries to the schema for this environment.
        # dev and test share the same Supabase project but different schemas.
        "server_settings": {"search_path": settings.DB_SCHEMA},
    },
)

# ── Session factory ───────────────────────────────────────────────────────────

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Dependency ────────────────────────────────────────────────────────────────

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session