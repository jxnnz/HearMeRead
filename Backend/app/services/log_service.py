"""
log_service.py
Thin helper — call after any meaningful teacher action succeeds.
Never raises: log failures must not break the main operation.
"""
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import ActivityLog

logger = logging.getLogger(__name__)


async def log_activity(
    db: AsyncSession,
    teacher_id: int,
    school_id: int,
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    metadata: Optional[dict] = None,
) -> None:
    """
    Insert one activity log row. Silently swallows all errors so
    a logging failure never breaks the caller's response.

    action values (keep consistent):
        logged_in | created_student | archived_student |
        uploaded_passage | archived_passage |
        started_session | completed_session | archived_session

    entity_type values:
        auth | student | passage | session
    """
    try:
        log = ActivityLog(
            teacher_id=teacher_id,
            school_id=school_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            log_metadata=metadata or {},
        )
        db.add(log)
        await db.commit()
    except Exception as exc:
        logger.warning("log_activity failed silently: %s", exc)
