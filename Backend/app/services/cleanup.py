import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.db import AsyncSessionLocal
from app.models import ReadingResult
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


def create_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(delete_expired_audio, "cron", hour=2, minute=0, timezone="UTC")
    return scheduler
