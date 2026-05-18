# Backend development shortcuts
# Usage: make <target>
# Requires: bash, python in venv, psycopg2-binary installed

# Run the app locally (no Docker)
dev:
	ENV_FILE=.env.dev uvicorn app.main:app --reload --port 8000

test-server:
	ENV_FILE=.env.test uvicorn app.main:app --reload --port 8001

# Alembic migrations
migrate-dev:
	ENV_FILE=.env.dev alembic upgrade head

migrate-test:
	ENV_FILE=.env.test alembic upgrade head

migrate-prod:
	ENV_FILE=.env.prod alembic upgrade head

# Create a new migration (targets dev schema; same migration file is applied to all envs)
migration:
	ENV_FILE=.env.dev alembic revision --autogenerate -m "$(msg)"
# Usage: make migration msg="add_word_count_to_passages"

# Show current migration state per environment
status-dev:
	ENV_FILE=.env.dev alembic current

status-test:
	ENV_FILE=.env.test alembic current

status-prod:
	ENV_FILE=.env.prod alembic current

# Tests
test:
	ENV_FILE=.env.test python -m pytest -v --tb=short

# Reset test schema (DANGEROUS — wipes all test data)
reset-test:
	@echo "WARNING: This will drop and recreate the 'test' schema. All test data will be lost."
	@read -p "Type 'yes' to confirm: " confirm && [ "$$confirm" = "yes" ]
	ENV_FILE=.env.test python -c "\
	import asyncio, asyncpg, os; \
	from dotenv import load_dotenv; \
	load_dotenv('.env.test'); \
	url = os.environ['DATABASE_URL'].replace('postgresql+asyncpg://', ''); \
	print('Dropping test schema...')"
	ENV_FILE=.env.test alembic downgrade base
	ENV_FILE=.env.test alembic upgrade head
	@echo "Test schema reset complete."

.PHONY: dev test-server migrate-dev migrate-test migrate-prod migration \
        status-dev status-test status-prod test reset-test
