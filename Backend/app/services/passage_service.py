from typing import Optional, Tuple, List
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.models.passage import Passage, Language
from app.models.student import GradeLevel
from app.schemas.passage import PassageCreate, PassageUpdate


def _compute_word_count(text: str) -> int:
    return len(text.split())


# ── Passage services ─────────────────────────────────────────────────────────

async def get_passages(
    db: AsyncSession,
    teacher_id: int,
    page: int,
    page_size: int,
    language: Optional[Language],
    grade_level: Optional[GradeLevel],
    include_archived: bool,
) -> Tuple[int, List[Passage]]:
    filters = [Passage.teacher_id == teacher_id]

    if not include_archived:
        filters.append(Passage.is_archived == False)
    if language:
        filters.append(Passage.language == language)
    if grade_level:
        filters.append(Passage.grade_level == grade_level)

    count_result = await db.execute(
        select(func.count()).select_from(Passage).where(and_(*filters))
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(Passage)
        .where(and_(*filters))
        .order_by(Passage.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    passages = result.scalars().all()
    return total, passages


async def get_passage_by_id(db: AsyncSession, passage_id: int, teacher_id: int) -> Passage:
    result = await db.execute(
        select(Passage).where(
            Passage.id == passage_id,
            Passage.teacher_id == teacher_id,
        )
    )
    passage = result.scalar_one_or_none()
    if not passage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passage not found")
    return passage


async def create_passage(db: AsyncSession, data: PassageCreate, teacher_id: int) -> Passage:
    passage = Passage(
        teacher_id=teacher_id,
        title=data.title,
        content=data.content,
        language=data.language,
        grade_level=data.grade_level,
        word_count=_compute_word_count(data.content),
    )
    db.add(passage)
    await db.commit()
    await db.refresh(passage)
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
    )
    db.add(passage)
    await db.commit()
    await db.refresh(passage)
    return passage


async def update_passage(
    db: AsyncSession, passage_id: int, data: PassageUpdate, teacher_id: int
) -> Passage:
    passage = await get_passage_by_id(db, passage_id, teacher_id)

    if data.title is not None:
        passage.title = data.title
    if data.content is not None:
        passage.content = data.content
        passage.word_count = _compute_word_count(data.content)
    if data.language is not None:
        passage.language = data.language
    if data.grade_level is not None:
        passage.grade_level = data.grade_level

    await db.commit()
    await db.refresh(passage)
    return passage


async def archive_passage(db: AsyncSession, passage_id: int, teacher_id: int) -> None:
    passage = await get_passage_by_id(db, passage_id, teacher_id)
    passage.is_archived = True
    await db.commit()