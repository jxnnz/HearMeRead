from typing import Optional, Tuple, List
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.models.assessment_session import AssessmentSession, AssessmentPeriod
from app.models.student import Student
from app.models.passage import Passage
from app.schemas.session import SessionCreate, SessionComplete, SessionUpdate


# ── Helpers ───────────────────────────────────────────────────────────────────

def _compute_cwpm(total_words: int, miscue_count: int, reading_time_seconds: float) -> float:
    correct_words = total_words - miscue_count
    minutes = reading_time_seconds / 60
    return round(correct_words / minutes, 2) if minutes > 0 else 0.0


async def _verify_student_ownership(db: AsyncSession, student_id: int, teacher_id: int) -> None:
    result = await db.execute(
        select(Student).where(Student.id == student_id, Student.teacher_id == teacher_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")


async def _verify_passage_ownership(db: AsyncSession, passage_id: int, teacher_id: int) -> None:
    result = await db.execute(
        select(Passage).where(
            Passage.id == passage_id,
            Passage.teacher_id == teacher_id,
            Passage.is_archived == False,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passage not found")


async def check_duplicate(
    db: AsyncSession,
    teacher_id: int,
    student_id: int,
    school_year: str,
    period: AssessmentPeriod,
    exclude_session_id: Optional[int] = None,
) -> Optional[AssessmentSession]:
    """
    Returns an existing session if this student already has one
    for the same school_year + period. Used to warn (not block).
    """
    filters = [
        AssessmentSession.teacher_id == teacher_id,
        AssessmentSession.student_id == student_id,
        AssessmentSession.school_year == school_year,
        AssessmentSession.period == period,
        AssessmentSession.is_archived == False,
    ]
    if exclude_session_id:
        filters.append(AssessmentSession.id != exclude_session_id)

    result = await db.execute(
        select(AssessmentSession).where(and_(*filters)).limit(1)
    )
    return result.scalar_one_or_none()


# ── CRUD ──────────────────────────────────────────────────────────────────────

async def get_sessions(
    db: AsyncSession,
    teacher_id: int,
    page: int,
    page_size: int,
    student_id: Optional[int],
    school_year: Optional[str],
    period: Optional[AssessmentPeriod],
    is_completed: Optional[bool],
    include_archived: bool,
) -> Tuple[int, List[AssessmentSession]]:
    filters = [AssessmentSession.teacher_id == teacher_id]

    if not include_archived:
        filters.append(AssessmentSession.is_archived == False)
    if student_id:
        filters.append(AssessmentSession.student_id == student_id)
    if school_year:
        filters.append(AssessmentSession.school_year == school_year)
    if period:
        filters.append(AssessmentSession.period == period)
    if is_completed is not None:
        filters.append(AssessmentSession.is_completed == is_completed)

    count_result = await db.execute(
        select(func.count()).select_from(AssessmentSession).where(and_(*filters))
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(AssessmentSession)
        .where(and_(*filters))
        .order_by(AssessmentSession.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return total, result.scalars().all()


async def get_session_by_id(
    db: AsyncSession, session_id: int, teacher_id: int
) -> AssessmentSession:
    result = await db.execute(
        select(AssessmentSession).where(
            AssessmentSession.id == teacher_id,
            AssessmentSession.teacher_id == teacher_id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


async def create_session(
    db: AsyncSession,
    data: SessionCreate,
    teacher_id: int,
) -> Tuple[AssessmentSession, Optional[AssessmentSession]]:
    """
    Creates a new session. Also returns any duplicate found (same student +
    school_year + period) so the route can attach a warning to the response.
    """
    await _verify_student_ownership(db, data.student_id, teacher_id)
    await _verify_passage_ownership(db, data.passage_id, teacher_id)

    duplicate = await check_duplicate(
        db=db,
        teacher_id=teacher_id,
        student_id=data.student_id,
        school_year=data.school_year,
        period=data.period,
    )

    session = AssessmentSession(
        teacher_id=teacher_id,
        student_id=data.student_id,
        passage_id=data.passage_id,
        school_year=data.school_year,
        period=data.period,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session, duplicate


async def complete_session(
    db: AsyncSession,
    session_id: int,
    data: SessionComplete,
    teacher_id: int,
) -> AssessmentSession:
    """Fills in all assessment results and marks the session as completed."""
    session = await get_session_by_id(db, session_id, teacher_id)

    if session.is_completed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This session has already been completed.",
        )

    session.reading_time_seconds  = data.reading_time_seconds
    session.total_words           = data.total_words
    session.miscue_count          = data.miscue_count
    session.comprehension_correct = data.comprehension_correct
    session.comprehension_total   = data.comprehension_total
    session.fluency_level         = data.fluency_level
    session.learner_experience    = data.learner_experience
    session.teacher_remarks       = data.teacher_remarks
    session.cwpm                  = _compute_cwpm(
        data.total_words, data.miscue_count, data.reading_time_seconds
    )
    session.is_completed = True

    await db.commit()
    await db.refresh(session)
    return session


async def update_session(
    db: AsyncSession,
    session_id: int,
    data: SessionUpdate,
    teacher_id: int,
) -> Tuple[AssessmentSession, Optional[AssessmentSession]]:
    session = await get_session_by_id(db, session_id, teacher_id)
    duplicate = None

    # Check for new duplicate if school_year or period is being changed
    new_year   = data.school_year if data.school_year is not None else session.school_year
    new_period = data.period      if data.period      is not None else session.period

    if data.school_year is not None or data.period is not None:
        duplicate = await check_duplicate(
            db=db,
            teacher_id=teacher_id,
            student_id=session.student_id,
            school_year=new_year,
            period=new_period,
            exclude_session_id=session_id,
        )

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(session, field, value)

    # Recompute CWPM if any relevant field changed
    if session.total_words and session.reading_time_seconds:
        session.cwpm = _compute_cwpm(
            session.total_words,
            session.miscue_count or 0,
            session.reading_time_seconds,
        )

    await db.commit()
    await db.refresh(session)
    return session, duplicate


async def archive_session(
    db: AsyncSession, session_id: int, teacher_id: int
) -> None:
    session = await get_session_by_id(db, session_id, teacher_id)
    session.is_archived = True
    await db.commit()