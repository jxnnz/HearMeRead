from typing import List
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.question import Question
from app.models.passage import Passage
from app.schemas.passage import QuestionCreate, QuestionUpdate


async def _verify_passage_ownership(db: AsyncSession, passage_id: int, teacher_id: int) -> Passage:
    """Ensure passage exists and belongs to this teacher."""
    result = await db.execute(
        select(Passage).where(
            Passage.id == passage_id,
            Passage.teacher_id == teacher_id,
            Passage.is_archived == False,
        )
    )
    passage = result.scalar_one_or_none()
    if not passage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passage not found")
    return passage


async def get_questions(
    db: AsyncSession, passage_id: int, teacher_id: int, include_archived: bool = False
) -> List[Question]:
    await _verify_passage_ownership(db, passage_id, teacher_id)

    filters = [Question.passage_id == passage_id]
    if not include_archived:
        filters.append(Question.is_archived == False)

    result = await db.execute(
        select(Question).where(*filters).order_by(Question.order.asc(), Question.id.asc())
    )
    return result.scalars().all()


async def create_question(
    db: AsyncSession, passage_id: int, data: QuestionCreate, teacher_id: int
) -> Question:
    await _verify_passage_ownership(db, passage_id, teacher_id)

    question = Question(
        passage_id=passage_id,
        text=data.text,
        order=data.order,
    )
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


async def bulk_create_questions(
    db: AsyncSession, passage_id: int, texts: List[str], teacher_id: int
) -> List[Question]:
    await _verify_passage_ownership(db, passage_id, teacher_id)

    questions = [
        Question(passage_id=passage_id, text=text.strip(), order=idx)
        for idx, text in enumerate(texts)
        if text.strip()
    ]
    db.add_all(questions)
    await db.commit()

    # Refresh each to get DB-generated fields
    for q in questions:
        await db.refresh(q)
    return questions


async def get_question_by_id(db: AsyncSession, question_id: int, teacher_id: int) -> Question:
    result = await db.execute(
        select(Question)
        .join(Passage, Passage.id == Question.passage_id)
        .where(
            Question.id == question_id,
            Passage.teacher_id == teacher_id,
        )
    )
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return question


async def update_question(
    db: AsyncSession, question_id: int, data: QuestionUpdate, teacher_id: int
) -> Question:
    question = await get_question_by_id(db, question_id, teacher_id)

    if data.text is not None:
        question.text = data.text
    if data.order is not None:
        question.order = data.order

    await db.commit()
    await db.refresh(question)
    return question


async def archive_question(db: AsyncSession, question_id: int, teacher_id: int) -> None:
    question = await get_question_by_id(db, question_id, teacher_id)
    question.is_archived = True
    await db.commit()