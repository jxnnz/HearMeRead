from typing import Optional, Tuple, List
from datetime import datetime, timezone
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


# ---------------------------------------------------------------------------
# A1 auto-title helpers
# ---------------------------------------------------------------------------

_GRADE_LABELS = {
    "grade_1": "Grade 1",
    "grade_2": "Grade 2",
    "grade_3": "Grade 3",
    "kindergarten": "Kindergarten",
}

_LANG_LABELS = {
    "filipino": "Filipino",
    "english":  "English",
}


def _a1_base_title(language: str, grade_level: str) -> str:
    """
    Returns the canonical Assessment 1 title for a given grade + language,
    e.g. "Grade 2 Filipino — Assessment 1".
    """
    lang  = _LANG_LABELS.get(str(language),   str(language).title())
    grade = _GRADE_LABELS.get(str(grade_level), str(grade_level).replace("_", " ").title())
    return f"{grade} {lang} — Assessment 1"


async def _a1_title(
    db: AsyncSession,
    teacher_id: int,
    language: str,
    grade_level: str,
) -> str:
    """
    Generates a unique display title for a new A1 passage.

    - First passage for this grade+language → canonical base title,
      e.g. "Grade 2 Filipino — Assessment 1".
    - Any subsequent passage for the same grade+language → appends a short
      datestamp so duplicates are distinguishable without manual naming,
      e.g. "Grade 2 Filipino — Assessment 1 (Jul 2026)".

    This means if a teacher accidentally uploads the same A1 twice, the second
    one gets a datestamp and neither clobbers the other.
    """
    base = _a1_base_title(language, grade_level)

    # Count existing A1 passages for this teacher + grade + language
    existing = await db.execute(
        select(func.count(Passage.id)).where(
            Passage.teacher_id    == teacher_id,
            Passage.assessment_type == 1,
            Passage.language      == language,
            Passage.grade_level   == grade_level,
            Passage.is_archived   == False,
        )
    )
    count = existing.scalar_one() or 0

    if count == 0:
        return base

    # Already have one — append month + year so it's distinguishable
    now = datetime.now(timezone.utc)
    suffix = now.strftime("%b %Y")   # e.g. "Jul 2026"
    return f"{base} ({suffix})"


# ---------------------------------------------------------------------------
# Teacher-grade helpers
# ---------------------------------------------------------------------------

async def _get_teacher_assigned_grade(
    db: AsyncSession, teacher_id: int
) -> Optional[GradeLevel]:
    """
    Return the teacher's current assigned grade level from Teacher.grade_level,
    which is the admin-maintained field and always reflects the latest assignment.
    Falls back to the most recent active TeacherAssignment if grade_level is unset.
    """
    result = await db.execute(
        select(Teacher.grade_level).where(Teacher.id == teacher_id)
    )
    grade = result.scalar_one_or_none()
    if grade:
        return grade

    # Fallback: TeacherAssignment carry-forward for teachers with no grade set directly
    result = await db.execute(
        select(TeacherAssignment.grade_level)
        .where(
            TeacherAssignment.teacher_id == teacher_id,
            TeacherAssignment.is_active  == True,
        )
        .order_by(TeacherAssignment.school_year.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _get_teacher_school_id(
    db: AsyncSession, teacher_id: int
) -> Optional[int]:
    result = await db.execute(
        select(Teacher.school_id).where(Teacher.id == teacher_id)
    )
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Passage services
# ---------------------------------------------------------------------------

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
    assigned_grade = await _get_teacher_assigned_grade(db, teacher_id)
    school_id      = await _get_teacher_school_id(db, teacher_id)

    own_filter = Passage.teacher_id == teacher_id

    if assigned_grade and school_id:
        public_filter = and_(
            Passage.visibility  == PassageVisibility.public,
            Passage.grade_level == assigned_grade,
            Passage.teacher_id.in_(
                select(Teacher.id).where(Teacher.school_id == school_id)
            ),
        )
        visibility_filter = or_(own_filter, public_filter)
    else:
        visibility_filter = own_filter

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

    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Passage)
        .options(selectinload(Passage.questions))
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
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Passage)
        .options(selectinload(Passage.questions))
        .where(Passage.id == passage_id)
    )
    passage = result.scalar_one_or_none()
    if not passage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passage not found")

    if passage.teacher_id == teacher_id:
        return passage

    if passage.visibility == PassageVisibility.public:
        school_id       = await _get_teacher_school_id(db, teacher_id)
        owner_school_id = await _get_teacher_school_id(db, passage.teacher_id)
        if school_id and school_id == owner_school_id:
            return passage

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passage not found")


async def create_passage(db: AsyncSession, data: PassageCreate, teacher_id: int) -> Passage:
    # ── A1 auto-title ───────────────────────────────────────────────────────
    # Assessment 1 passages are never given a title by the teacher (the
    # AddAssessment1Page form has no title field). Auto-generate a meaningful
    # label here so the passage-selection dropdown during an assessment session
    # is never blank.
    title = data.title
    if data.assessment_type == 1 and not title and data.grade_level and data.language:
        title = await _a1_title(
            db=db,
            teacher_id=teacher_id,
            language=str(data.language.value if hasattr(data.language, "value") else data.language),
            grade_level=str(data.grade_level.value if hasattr(data.grade_level, "value") else data.grade_level),
        )

    passage = Passage(
        teacher_id      = teacher_id,
        title           = title,
        content         = data.content,
        language        = data.language,
        grade_level     = data.grade_level,
        word_count      = _compute_word_count(data.content or ""),
        visibility      = PassageVisibility.private,
        assessment_type = data.assessment_type,
        task1_content   = data.task1_content,
        task2_words     = data.task2_words,
        task2_sentences = data.task2_sentences,
        file_path       = data.file_path,
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
        teacher_id  = teacher_id,
        title       = title,
        content     = content,
        language    = language,
        grade_level = grade_level,
        word_count  = _compute_word_count(content),
        visibility  = PassageVisibility.private,
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
        passage.content    = data.content
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
    if data.file_path is not None:
        passage.file_path = data.file_path

    await db.commit()
    await db.refresh(passage)
    return passage


async def archive_passage(db: AsyncSession, passage_id: int, teacher_id: int) -> None:
    passage = await get_passage_by_id(db, passage_id, teacher_id)
    _ensure_private(passage)
    passage.is_archived = True
    await db.commit()