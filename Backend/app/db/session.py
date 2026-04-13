from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    # psycopg2 requires this for connection pooling with multiple threads
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All SQLAlchemy models inherit from this base
Base = declarative_base()


# --------------------------------------------------------------------------- #
#  Dependency — yields a DB session, closes it after the request               #
# --------------------------------------------------------------------------- #

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
