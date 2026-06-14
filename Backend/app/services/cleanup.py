import logging
from datetime import datetime, timezone, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.db import AsyncSessionLocal
from app.models import ReadingResult, AssessmentSession
from app.services.audio_storage import delete_audio

logger = logging.getLogger(__name__)


async def delete_expired_audio() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ReadingResult).where(
                ReadingResult.audio_path.is_not(None),
                ReadingResult.audio_expires_at <= datetime.now(tz=timezone.utc),
            )
        )
        rows = result.scalars().all()
        for row in rows:
            try:
                delete_audio(row.audio_path)
            except Exception as e:
                logger.warning(f"Failed to delete audio file {row.audio_path}: {e}")
            row.audio_path = None
            row.audio_expires_at = None
        await db.commit()
        logger.info(f"Cleaned up {len(rows)} expired audio file(s).")


async def archive_stale_sessions() -> None:
    async with AsyncSessionLocal() as db:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        result = await db.execute(
            select(AssessmentSession).where(
                AssessmentSession.is_completed == False,
                AssessmentSession.is_archived == False,
                AssessmentSession.created_at <= cutoff
            )
        )
        sessions = result.scalars().all()
        for session in sessions:
            session.is_archived = True
        await db.commit()
        logger.info(f"Auto-archived {len(sessions)} stale incomplete session(s) older than 24 hours.")


def create_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(delete_expired_audio, "cron", hour=2, minute=0, timezone="UTC")
    scheduler.add_job(archive_stale_sessions, "interval", hours=1, timezone="UTC")
    return scheduler
