from typing import Optional, Tuple, List
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from app.models import (
    Passage, Language, Teacher, GradeLevel,
    PassageVisibility, TeacherAssignment,
)
from app.schema import PassageCreate, PassageUpdate
from app.services.log_service import log_activity


def _compute_word_count(text: str) -> int:
    return len(text.split())


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _get_teacher_assigned_grade(
    db: AsyncSession, teacher_id: int
) -> Optional[GradeLevel]:
    """
    Return the grade level from the teacher's most recent active assignment.
    Falls back across school years if no current-year assignment exists
    (carry-forward behaviour).
    """
    result = await db.execute(
        select(TeacherAssignment.grade_level)
        .where(
            TeacherAssignment.teacher_id == teacher_id,
            TeacherAssignment.is_active == True,
        )
        .order_by(TeacherAssignment.school_year.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return row


async def _get_teacher_school_id(
    db: AsyncSession, teacher_id: int
) -> Optional[int]:
    result = await db.execute(
        select(Teacher.school_id).where(Teacher.id == teacher_id)
    )
    return result.scalar_one_or_none()


# ── Passage services ─────────────────────────────────────────────────────────

async def get_passages(
    db: AsyncSession,
    teacher_id: int,
    page: int,
    page_size: int,
    language: Optional[Language],
    grade_level: Optional[GradeLevel],
    include_archived: bool,
    assessment_type: Optional[int] = None,
) -> Tuple[int, List[Passage]]:
    """
    Returns the teacher's own passages (private) PLUS public passages that
    match the teacher's assigned grade level and belong to the same school.
    """
    # Determine the teacher's assigned grade level and school
    assigned_grade = await _get_teacher_assigned_grade(db, teacher_id)
    school_id = await _get_teacher_school_id(db, teacher_id)

    # -- Build the ownership / visibility filter --
    # Always include the teacher's own passages (any visibility)
    own_filter = Passage.teacher_id == teacher_id

    # Public passages: match grade level AND same school
    if assigned_grade and school_id:
        public_filter = and_(
            Passage.visibility == PassageVisibility.public,
            Passage.grade_level == assigned_grade,
            Passage.teacher_id.in_(
                select(Teacher.id).where(Teacher.school_id == school_id)
            ),
        )
        visibility_filter = or_(own_filter, public_filter)
    else:
        # Teacher has no assignment yet — only show their own passages
        visibility_filter = own_filter

    # -- Common filters (applied to both own and public) --
    common_filters = [visibility_filter]
    if not include_archived:
        common_filters.append(Passage.is_archived == False)
    if language:
        common_filters.append(Passage.language == language)
    if grade_level:
        common_filters.append(Passage.grade_level == grade_level)
    if assessment_type is not None:
        common_filters.append(Passage.assessment_type == assessment_type)

    count_result = await db.execute(
        select(func.count()).select_from(Passage).where(and_(*common_filters))
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(Passage)
        .where(and_(*common_filters))
        .order_by(Passage.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    passages = result.scalars().all()
    return total, passages


async def get_passage_by_id(
    db: AsyncSession, passage_id: int, teacher_id: int
) -> Passage:
    """
    Allow fetching a passage if:
    - The teacher owns it, OR
    - It's a public passage in the same school
    """
    result = await db.execute(
        select(Passage).where(Passage.id == passage_id)
    )
    passage = result.scalar_one_or_none()
    if not passage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passage not found")

    # Owner can always access
    if passage.teacher_id == teacher_id:
        return passage

    # Public passage — verify same school
    if passage.visibility == PassageVisibility.public:
        school_id = await _get_teacher_school_id(db, teacher_id)
        owner_school_id = await _get_teacher_school_id(db, passage.teacher_id)
        if school_id and school_id == owner_school_id:
            return passage

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passage not found")


async def create_passage(db: AsyncSession, data: PassageCreate, teacher_id: int) -> Passage:
    passage = Passage(
        teacher_id=teacher_id,
        title=data.title,
        content=data.content,
        language=data.language,
        grade_level=data.grade_level,
        word_count=_compute_word_count(data.content or ""),
        visibility=PassageVisibility.private,   # teacher-created = always private
        assessment_type=data.assessment_type,
        task1_content=data.task1_content,
        task2_words=data.task2_words,
        task2_sentences=data.task2_sentences,
    )
    db.add(passage)
    await db.commit()
    await db.refresh(passage)
    teacher_result = await db.execute(select(Teacher).where(Teacher.id == teacher_id))
    _teacher = teacher_result.scalar_one_or_none()
    if _teacher and _teacher.school_id:
        await log_activity(
            db, teacher_id, _teacher.school_id,
            action="uploaded_passage",
            entity_type="passage",
            entity_id=passage.id,
            metadata={"title": passage.title or "Untitled"},
        )
    return passage


async def create_passage_from_docx(
    db: AsyncSession,
    title: str,
    language: Language,
    grade_level: GradeLevel,
    content: str,
    teacher_id: int,
) -> Passage:
    passage = Passage(
        teacher_id=teacher_id,
        title=title,
        content=content,
        language=language,
        grade_level=grade_level,
        word_count=_compute_word_count(content),
        visibility=PassageVisibility.private,   # teacher-created = always private
    )
    db.add(passage)
    await db.commit()
    await db.refresh(passage)
    teacher_result = await db.execute(select(Teacher).where(Teacher.id == teacher_id))
    _teacher = teacher_result.scalar_one_or_none()
    if _teacher and _teacher.school_id:
        await log_activity(
            db, teacher_id, _teacher.school_id,
            action="uploaded_passage",
            entity_type="passage",
            entity_id=passage.id,
            metadata={"title": passage.title or "Untitled"},
        )
    return passage


def _ensure_private(passage: Passage) -> None:
    """Block edit/delete/archive on public (read-only) passages."""
    if passage.visibility == PassageVisibility.public:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public passages are read-only and cannot be modified.",
        )


async def update_passage(
    db: AsyncSession, passage_id: int, data: PassageUpdate, teacher_id: int
) -> Passage:
    passage = await get_passage_by_id(db, passage_id, teacher_id)
    _ensure_private(passage)

    if data.title is not None:
        passage.title = data.title
    if data.content is not None:
        passage.content = data.content
        passage.word_count = _compute_word_count(data.content)
    if data.language is not None:
        passage.language = data.language
    if data.grade_level is not None:
        passage.grade_level = data.grade_level
    if data.assessment_type is not None:
        passage.assessment_type = data.assessment_type
    if data.task1_content is not None:
        passage.task1_content = data.task1_content
    if data.task2_words is not None:
        passage.task2_words = data.task2_words
    if data.task2_sentences is not None:
        passage.task2_sentences = data.task2_sentences

    await db.commit()
    await db.refresh(passage)
    return passage


async def archive_passage(db: AsyncSession, passage_id: int, teacher_id: int) -> None:
    passage = await get_passage_by_id(db, passage_id, teacher_id)
    _ensure_private(passage)
    passage.is_archived = True
    await db.commit()