from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os
from dotenv import load_dotenv

load_dotenv()

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import your Base so Alembic can detect models
from app.db import Base  # adjust import path if needed
target_metadata = Base.metadata

def get_sync_url():
    """Convert asyncpg URL to psycopg2 URL for Alembic."""
    url = os.environ["DATABASE_URL"]
    # Replace async driver with sync driver
    url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    # Strip asyncpg-specific query params psycopg2 doesn't understand
    url = url.split("?")[0]
    # Re-append only SSL (psycopg2 format)
    return url + "?sslmode=require"

def run_migrations_online():
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_sync_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()

def run_migrations_offline():
    url = get_sync_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()