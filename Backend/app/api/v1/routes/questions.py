from fastapi import APIRouter, Depends, Query, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.v1.dependencies import get_current_teacher
from app.api.v1.routes.passages import _validate_docx, _MAX_FILE_SIZE
from app.db.session import get_db
from app.models.teacher import Teacher
from app.schemas.passage import QuestionCreate, QuestionUpdate, QuestionResponse
from app.services import question_service
from app.utils.docx_parser import parse_questions_docx
from fastapi import HTTPException

router = APIRouter(tags=["Questions"])


# ── List questions for a passage ─────────────────────────────────────────────

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


# ── Add a single question manually ───────────────────────────────────────────

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


# ── Bulk upload questions from .docx ─────────────────────────────────────────

@router.post(
    "/passages/{passage_id}/questions/upload",
    response_model=List[QuestionResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Upload a .docx file to bulk-add questions",
    description=(
        "Each non-empty paragraph in the document becomes one question. "
        "Numbering prefixes like '1.', '2)', 'Q1:' are stripped automatically."
    ),
)
async def upload_questions(
    passage_id: int,
    file: UploadFile = File(..., description="A .docx file where each paragraph is a question"),
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    _validate_docx(file)

    file_bytes = await file.read()
    if len(file_bytes) > _MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 5 MB size limit.",
        )

    question_texts = parse_questions_docx(file_bytes)

    return await question_service.bulk_create_questions(
        db=db,
        passage_id=passage_id,
        texts=question_texts,
        teacher_id=current_teacher.id,
    )


# ── Update a question ─────────────────────────────────────────────────────────

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


# ── Archive a question ────────────────────────────────────────────────────────

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