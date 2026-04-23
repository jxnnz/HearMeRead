import os
from logging.config import fileConfig

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool, text
from alembic import context

# Load the correct .env file before importing settings.
# ENV_FILE must be set in the shell before running alembic, e.g.:
#   ENV_FILE=.env.dev  alembic upgrade head   ← targets 'dev' schema
#   ENV_FILE=.env.test alembic upgrade head   ← targets 'test' schema
#   ENV_FILE=.env.prod alembic upgrade head   ← targets 'public' schema on prod
load_dotenv(os.environ.get("ENV_FILE", ".env"))

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from app.db import Base  # noqa: E402 — must be after load_dotenv
target_metadata = Base.metadata


def _get_schema() -> str:
    return os.environ.get("DB_SCHEMA", "dev")


def _get_sync_url() -> str:
    """Convert asyncpg URL → psycopg2 URL for Alembic (sync driver required)."""
    url = os.environ["DATABASE_URL"]
    url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    return url.split("?")[0] + "?sslmode=require"


def run_migrations_online() -> None:
    schema = _get_schema()
    cfg = config.get_section(config.config_ini_section, {})
    cfg["sqlalchemy.url"] = _get_sync_url()

    connectable = engine_from_config(
        cfg,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        # Tell psycopg2 to SET search_path for every connection in this run.
        connect_args={"options": f"-c search_path={schema}"},
    )

    with connectable.connect() as connection:
        # One-time schema bootstrap: safe to run on every migration pass.
        with connection.execution_options(isolation_level="AUTOCOMMIT"):
            connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # Store alembic_version inside the target schema so dev and test
            # each track their own migration history independently.
            version_table_schema=schema,
        )
        with context.begin_transaction():
            context.run_migrations()


def run_migrations_offline() -> None:
    schema = _get_schema()
    context.configure(
        url=_get_sync_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table_schema=schema,
    )
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
