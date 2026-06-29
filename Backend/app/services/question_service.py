from typing import List
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Question
from app.models import Passage
from app.schema import QuestionCreate, QuestionUpdate


async def _verify_passage_ownership(
    db: AsyncSession, passage_id: int, teacher_id: int, write_access: bool = False
) -> Passage:
    """Ensure passage exists and belongs to this teacher (or is public for school admins/teachers)."""
    from app.models import Teacher, UserRole, PassageVisibility
    
    # 1. Get the current user
    user_result = await db.execute(select(Teacher).where(Teacher.id == teacher_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    # 2. Get the passage
    passage_result = await db.execute(
        select(Passage).where(
            Passage.id == passage_id,
            Passage.is_archived == False,
        )
    )
    passage = passage_result.scalar_one_or_none()
    if not passage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passage not found")
        
    # 3. Check ownership
    if passage.teacher_id == teacher_id:
        return passage
        
    # 4. Check global public passage access
    if passage.visibility == PassageVisibility.public:
        if write_access:
            # Every admin can edit public passages
            if user.role == UserRole.admin:
                return passage
        else:
            # Every teacher / admin can read public passages
            return passage
                
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passage not found")


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
    await _verify_passage_ownership(db, passage_id, teacher_id, write_access=True)

    question = Question(
        passage_id=passage_id,
        text=data.text,
        answer_key=data.answer_key,
        order=data.order,
    )
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


async def bulk_create_questions(
    db: AsyncSession, passage_id: int, texts: List[str], teacher_id: int
) -> List[Question]:
    await _verify_passage_ownership(db, passage_id, teacher_id, write_access=True)

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
    from app.models import Teacher, UserRole, PassageVisibility
    
    # Get user
    user_result = await db.execute(select(Teacher).where(Teacher.id == teacher_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Get question
    q_result = await db.execute(select(Question).where(Question.id == question_id))
    question = q_result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
        
    # Get passage
    passage_result = await db.execute(select(Passage).where(Passage.id == question.passage_id))
    passage = passage_result.scalar_one_or_none()
    if not passage or passage.is_archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    # Check write access (since get_question_by_id is used for updates and archiving)
    if passage.teacher_id == teacher_id:
        return question
        
    if passage.visibility == PassageVisibility.public:
        # Every admin can update/delete questions for public passages
        if user.role == UserRole.admin:
            return question
                
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")


async def update_question(
    db: AsyncSession, question_id: int, data: QuestionUpdate, teacher_id: int
) -> Question:
    question = await get_question_by_id(db, question_id, teacher_id)

    if data.text is not None:
        question.text = data.text
    if data.order is not None:
        question.order = data.order
    question.answer_key = data.answer_key

    await db.commit()
    await db.refresh(question)
    return question


async def archive_question(db: AsyncSession, question_id: int, teacher_id: int) -> None:
    question = await get_question_by_id(db, question_id, teacher_id)
    question.is_archived = True
    await db.commit()