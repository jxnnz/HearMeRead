# Backend development and testing shortcuts
# Usage: make <target>
# Requires: bash, python in venv, psycopg2-binary installed

# Run the app locally with development environment
dev:
	ENV_FILE=.env uvicorn app.main:app --reload --port 8000

# Run testing mode server explicitly loading development .env
test-server:
	ENV_FILE=.env uvicorn app.main:app --reload --port 8000

# Alembic migrations (dev schema)
migrate-dev:
	ENV_FILE=.env alembic upgrade head

# Create a new migration (targets dev schema)
migration:
	ENV_FILE=.env alembic revision --autogenerate -m "$(msg)"

# Show current migration state
status-dev:
	ENV_FILE=.env alembic current

# Run backend automated pytest suite (explicitly using .env)
test:
	ENV_FILE=.env python -m pytest tests -v --tb=short

# Seed fictional test data (students, passages, assessments) into dev DB with [TEST] prefix
seed-test-data:
	ENV_FILE=.env python -m app.scripts.seed_test_data

# Safely reset ONLY records tagged as test data ([TEST] prefix or @hearmeread.test)
reset-test-data:
	ENV_FILE=.env python -m app.scripts.reset_test_data

.PHONY: dev test-server migrate-dev migration status-dev test seed-test-data reset-test-data
