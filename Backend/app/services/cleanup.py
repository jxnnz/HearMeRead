import logging
from datetime import datetime, timezone, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.db import AsyncSessionLocal
from app.models import ReadingResult, AssessmentSession
from app.services.audio_storage import delete_audio
from app.services.storage_service import delete_file

logger = logging.getLogger(__name__)


async def delete_expired_audio() -> None:
    async with AsyncSessionLocal() as db:
        now = datetime.now(tz=timezone.utc)
        result = await db.execute(
            select(ReadingResult).where(
                (
                    (ReadingResult.audio_path.is_not(None)) &
                    (ReadingResult.audio_expires_at <= now)
                ) |
                (
                    (ReadingResult.part1_audio_path.is_not(None)) &
                    (ReadingResult.part1_audio_expires_at <= now)
                )
            )
        )
        rows = result.scalars().all()
        for row in rows:
            if row.audio_path and row.audio_expires_at and row.audio_expires_at <= now:
                try:
                    await delete_file(row.audio_path)
                except Exception as e:
                    logger.warning(f"Failed to delete R2 audio file {row.audio_path}: {e}")
                try:
                    delete_audio(row.audio_path)
                except Exception:
                    pass
                row.audio_path = None
                row.audio_expires_at = None

            if row.part1_audio_path and row.part1_audio_expires_at and row.part1_audio_expires_at <= now:
                try:
                    await delete_file(row.part1_audio_path)
                except Exception as e:
                    logger.warning(f"Failed to delete R2 audio file {row.part1_audio_path}: {e}")
                try:
                    delete_audio(row.part1_audio_path)
                except Exception:
                    pass
                row.part1_audio_path = None
                row.part1_audio_expires_at = None
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
