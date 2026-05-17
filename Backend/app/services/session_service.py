import json
from datetime import datetime, timezone
from typing import Optional, Tuple, List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, and_
from sqlalchemy.orm import selectinload

from app.models import (
    AssessmentSession, AssessmentPeriod,
    Student, Passage, Teacher,
    ReadingResult, SessionObservation,
)
from app.schema import SessionCreate, SessionComplete, SessionUpdate
from app.schemas.session_schemas import (
    CompleteSessionIn, CompleteSessionOut,
    Part1ResultOut, Part2ResultOut, WordAlignmentOut,
)
from app.services.levenshtein_service import score_part1, score_part2
from app.services.log_service import log_activity


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
    from sqlalchemy import or_
    from app.models import PassageVisibility
    result = await db.execute(
        select(Passage).where(
            Passage.id == passage_id,
            or_(
                Passage.teacher_id == teacher_id,
                Passage.visibility == PassageVisibility.public
            ),
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
    grade_level: Optional[str] = None,
    section: Optional[str] = None,
    include_archived: bool = False,
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

    query = select(AssessmentSession)

    if grade_level or section is not None:
        from app.models import Student
        query = query.join(Student, Student.id == AssessmentSession.student_id)
        if grade_level:
            filters.append(Student.grade_level == grade_level)
        if section is not None:
            if section == "":
                from sqlalchemy import or_
                filters.append(or_(Student.section == None, Student.section == ""))
            else:
                filters.append(Student.section == section)

    count_result = await db.execute(
        select(func.count()).select_from(query.where(and_(*filters)).subquery())
    )
    total = count_result.scalar_one()

    result = await db.execute(
        query
        .options(
            selectinload(AssessmentSession.reading_result),
            selectinload(AssessmentSession.observation),
            selectinload(AssessmentSession.passage),
        )
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
        select(AssessmentSession)
        .options(
            selectinload(AssessmentSession.reading_result),
            selectinload(AssessmentSession.observation),
            selectinload(AssessmentSession.passage),
        )
        .where(
            AssessmentSession.id == session_id,
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

    result = await db.execute(
        select(AssessmentSession)
        .options(
            selectinload(AssessmentSession.reading_result),
            selectinload(AssessmentSession.observation),
            selectinload(AssessmentSession.passage),
        )
        .where(AssessmentSession.id == session.id)
    )
    session = result.scalar_one()
    teacher_result = await db.execute(select(Teacher).where(Teacher.id == teacher_id))
    _teacher = teacher_result.scalar_one_or_none()
    if _teacher and _teacher.school_id:
        await log_activity(
            db, teacher_id, _teacher.school_id,
            action="started_session",
            entity_type="session",
            entity_id=session.id,
            metadata={
                "student_id": session.student_id,
                "period": session.period.value,
                "school_year": session.school_year,
            },
        )
    return session, duplicate


# ── complete_session helpers ──────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _alignments_to_schema(alignments) -> list[WordAlignmentOut]:
    return [
        WordAlignmentOut(
            reference=a.reference_word,
            transcribed=a.transcribed_word,
            miscue_type=a.miscue_type.value,
        )
        for a in alignments
    ]


def _alignments_to_json(alignments) -> str:
    return json.dumps([
        {
            "reference": a.reference_word,
            "transcribed": a.transcribed_word,
            "miscue_type": a.miscue_type.value,
        }
        for a in alignments
    ])


def _safe_enum(enum_cls, value):
    if value is None:
        return None
    try:
        return enum_cls(value)
    except ValueError:
        return None


async def complete_session(
    session_id: int,
    teacher_id: int,
    payload: CompleteSessionIn,
    db: AsyncSession,
) -> CompleteSessionOut:
    """
    Complete an assessment session by running Levenshtein scoring for Part 1
    (and Part 2 if provided), persisting results, and marking session complete.

    Raises:
      ValueError  — session not found or not owned by this teacher
      RuntimeError — session already completed
    """
    # ── 1. Fetch and validate session ────────────────────────────────────
    result = await db.execute(
        select(AssessmentSession).where(
            AssessmentSession.id == session_id,
            AssessmentSession.teacher_id == teacher_id,
        )
    )
    session: Optional[AssessmentSession] = result.scalar_one_or_none()

    if session is None:
        raise ValueError(f"Session {session_id} not found or access denied.")

    if session.is_completed:
        raise RuntimeError(f"Session {session_id} is already completed.")

    # ── 2. Score Part 1 ──────────────────────────────────────────────────
    p1_input = payload.part1
    p1 = score_part1(
        task1_reference_text=p1_input.task1_reference_text,
        task1_transcribed_text=p1_input.task1_transcribed_text,
        task2_reference_text=p1_input.task2_reference_text,
        task2_transcribed_text=p1_input.task2_transcribed_text,
    )

    part1_out = Part1ResultOut(
        task1_correct=p1.task1_correct,
        task1_miscues=p1.task1_miscues,
        route=p1.route.value if p1.route else "",
        task2_type=p1.task2_type or "",
        task2_correct=p1.task2_correct,
        task2_miscues=p1.task2_miscues,
        total_score=p1.total_score,
        classification=p1.classification.value if p1.classification else "",
        task1_alignments=_alignments_to_schema(p1.task1_alignments),
        task2_alignments=_alignments_to_schema(p1.task2_alignments),
    )

    # ── 3. Score Part 2 (optional) ───────────────────────────────────────
    part2_out: Optional[Part2ResultOut] = None
    p2 = None

    if payload.part2 is not None:
        p2_input = payload.part2

        if getattr(p2_input, "passage_id", None) is not None:
            session.passage_id = p2_input.passage_id

        p2 = score_part2(
            reference_text=p2_input.reference_text,
            transcribed_text=p2_input.transcribed_text,
            reading_time_sec=p2_input.reading_time_sec,
            grade_level=p2_input.grade_level,
            comprehension_correct=p2_input.comprehension_correct,
            part1_total_score=p1.total_score,
            whisper_word_timestamps=p2_input.whisper_word_timestamps,
            observation_level=p2_input.fluency_level,
            learner_experience=p2_input.learner_experience,
        )

        part2_out = Part2ResultOut(
            total_words_in_passage=p2.total_words_in_passage,
            total_words_spoken=p2.total_words_spoken,
            words_read_within_time=p2.words_read_within_time,
            substitutions=p2.substitutions,
            insertions=p2.insertions,
            deletions=p2.deletions,
            total_miscues=p2.total_miscues,
            reading_time_sec=p2.reading_time_sec,
            grade_time_limit_sec=p2.grade_time_limit_sec,
            cwpm=p2.cwpm,
            accuracy_pct=p2.accuracy_pct,
            comprehension_correct=p2.comprehension_correct,
            reading_profile=p2.reading_profile.value if p2.reading_profile else "",
            observation_level=p2.observation_level,
            learner_experience=p2.learner_experience,
            alignments=_alignments_to_schema(p2.alignments),
        )

    # ── 4. Persist to reading_results (upsert — transcribe may have inserted a row already) ──
    rr_query = await db.execute(
        select(ReadingResult).where(ReadingResult.session_id == session_id)
    )
    reading_result = rr_query.scalar_one_or_none()

    from app.services.levenshtein_service import ReadingProfile
    final_reading_profile = None
    if p2 and p2.reading_profile:
        final_reading_profile = p2.reading_profile.value
    elif p1.total_score <= 10:
        final_reading_profile = ReadingProfile.LOW_EMERGING.value

    scoring_fields = dict(
        part1_task1_correct=p1.task1_correct,
        part1_task2_correct=p1.task2_correct,
        part1_total_score=p1.total_score,
        part1_classification=p1.classification.value if p1.classification else None,
        part1_route=p1.route.value if p1.route else None,
        part1_task1_alignments_json=_alignments_to_json(p1.task1_alignments),
        part1_task2_alignments_json=_alignments_to_json(p1.task2_alignments),
        reading_time_seconds=p2.reading_time_sec if p2 else None,
        total_words=p2.total_words_in_passage if p2 else None,
        miscue_count=p2.total_miscues if p2 else None,
        cwpm=p2.cwpm if p2 else None,
        reading_profile=final_reading_profile,
        part2_alignments_json=_alignments_to_json(p2.alignments) if p2 else None,
        updated_at=_now(),
    )

    if reading_result:
        for field, value in scoring_fields.items():
            setattr(reading_result, field, value)
    else:
        reading_result = ReadingResult(session_id=session_id, **scoring_fields)
        db.add(reading_result)

    # ── 5. Upsert session_observations (only if Part 2 provided) ──────────
    if payload.part2 is not None and p2 is not None:
        p2_input = payload.part2
        obs_query = await db.execute(
            select(SessionObservation).where(SessionObservation.session_id == session_id)
        )
        observation = obs_query.scalar_one_or_none()
        if observation:
            observation.comprehension_correct = p2_input.comprehension_correct
            observation.comprehension_total   = p2_input.comprehension_total
            observation.fluency_level         = p2_input.fluency_level
            observation.learner_experience    = p2_input.learner_experience
            observation.teacher_remarks       = p2_input.teacher_remarks
            observation.updated_at            = _now()
        else:
            observation = SessionObservation(
                session_id=session_id,
                comprehension_correct=p2_input.comprehension_correct,
                comprehension_total=p2_input.comprehension_total,
                fluency_level=p2_input.fluency_level,
                learner_experience=p2_input.learner_experience,
                teacher_remarks=p2_input.teacher_remarks,
                updated_at=_now(),
            )
            db.add(observation)

    # ── 6. Mark session completed ─────────────────────────────────────────
    await db.execute(
        update(AssessmentSession)
        .where(AssessmentSession.id == session_id)
        .values(is_completed=True, updated_at=_now())
    )

    # Capture values before commit expires ORM attributes
    _log_student_id = session.student_id
    _log_period = session.period.value
    _log_cwpm = scoring_fields.get("cwpm")
    _log_profile = scoring_fields.get("reading_profile")

    await db.commit()

    teacher_result = await db.execute(select(Teacher).where(Teacher.id == teacher_id))
    _teacher = teacher_result.scalar_one_or_none()
    if _teacher and _teacher.school_id:
        await log_activity(
            db, teacher_id, _teacher.school_id,
            action="completed_session",
            entity_type="session",
            entity_id=session_id,
            metadata={
                "student_id": _log_student_id,
                "cwpm": _log_cwpm,
                "reading_profile": _log_profile,
                "period": _log_period,
            },
        )

    return CompleteSessionOut(
        session_id=session_id,
        status="completed",
        part1=part1_out,
        part2=part2_out,
    )


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


async def save_observation(
    db:                 AsyncSession,
    session_id:         int,
    observation_level:  int,
    teacher_remarks:    Optional[str],
    learner_experience: Optional[int] = None,
) -> SessionObservation:
    result = await db.execute(
        select(SessionObservation).where(SessionObservation.session_id == session_id)
    )
    obs = result.scalar_one_or_none()
    if obs:
        obs.fluency_level   = observation_level
        obs.teacher_remarks = teacher_remarks
        if learner_experience is not None:
            obs.learner_experience = learner_experience
    else:
        obs = SessionObservation(
            session_id         = session_id,
            fluency_level      = observation_level,
            teacher_remarks    = teacher_remarks,
            learner_experience = learner_experience,
        )
        db.add(obs)
    await db.commit()
    await db.refresh(obs)
    return obs