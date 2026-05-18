from fastapi import APIRouter, Depends, Query, UploadFile, File, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.dependencies import get_current_teacher
from app.db import get_db
from app.models import Teacher
from app.schema import QuestionCreate, QuestionUpdate, QuestionResponse
from app.services import question_service
from app.utils.docx_parser import validate_upload, parse_questions_only

router = APIRouter(tags=["Questions"])


# List questions for a passage
@router.get(
    "/passages/{passage_id}/questions",
    response_model=List[QuestionResponse],
    summary="List questions for a passage",
)
async def list_questions(
    passage_id: int,
    include_archived: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    return await question_service.get_questions(
        db=db,
        passage_id=passage_id,
        teacher_id=current_teacher.id,
        include_archived=include_archived,
    )


# Add a single question manually
@router.post(
    "/passages/{passage_id}/questions",
    response_model=QuestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a question to a passage",
)
async def create_question(
    passage_id: int,
    data: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    return await question_service.create_question(
        db=db, passage_id=passage_id, data=data, teacher_id=current_teacher.id
    )


# Bulk upload questions from .docx
@router.post(
    "/passages/{passage_id}/questions/upload",
    response_model=List[QuestionResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Upload a .docx or .txt file to bulk-add questions",
    description=(
        "Each non-empty paragraph in the document becomes one question. "
        "Numbering prefixes like '1.', '2)', 'Q1:' are stripped automatically."
    ),
)
async def upload_questions(
    passage_id: int,
    file: UploadFile = File(..., description="A .docx or .txt file where each paragraph is a question"),
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    file_bytes = await file.read()

    # validate_upload checks both size (5 MB) and file type (.docx / .txt)
    validate_upload(file_bytes, file.filename)

    question_texts = parse_questions_only(file_bytes, file.filename)

    return await question_service.bulk_create_questions(
        db=db,
        passage_id=passage_id,
        texts=question_texts,
        teacher_id=current_teacher.id,
    )


# Update a question
@router.patch(
    "/questions/{question_id}",
    response_model=QuestionResponse,
    summary="Update a question",
)
async def update_question(
    question_id: int,
    data: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    return await question_service.update_question(
        db=db, question_id=question_id, data=data, teacher_id=current_teacher.id
    )


# Archive a question
@router.delete(
    "/questions/{question_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Archive a question (soft delete)",
)
async def archive_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    await question_service.archive_question(
        db=db, question_id=question_id, teacher_id=current_teacher.id
    )