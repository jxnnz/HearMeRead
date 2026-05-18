from typing import Optional, List

from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_teacher
from app.db import get_db
from app.models import Teacher
from app.models import Language
from app.models import GradeLevel
from app.schema import (
    PassageCreate,
    PassageUpdate,
    PassageResponse,
    PassageListResponse,
    QuestionResponse,
)
from app.services import passage_service, question_service
from app.utils.docx_parser import validate_upload, parse_combined, parse_passage_only

router = APIRouter(prefix="/passages", tags=["Passages"])


# List
@router.get("", response_model=PassageListResponse, summary="List passages")
async def list_passages(
    page:             int                    = Query(1, ge=1),
    page_size:        int                    = Query(20, ge=1, le=100),
    language:         Optional[Language]     = Query(None),
    grade_level:      Optional[GradeLevel]   = Query(None),
    assessment_type:  Optional[int]          = Query(None, ge=1, le=2),
    include_archived: bool                   = Query(False),
    db:               AsyncSession           = Depends(get_db),
    current_teacher:  Teacher                = Depends(get_current_teacher),
):
    total, passages = await passage_service.get_passages(
        db=db,
        teacher_id=current_teacher.id,
        page=page,
        page_size=page_size,
        language=language,
        grade_level=grade_level,
        include_archived=include_archived,
        assessment_type=assessment_type,
    )
    return PassageListResponse(total=total, page=page, page_size=page_size, passages=passages)


# Create manually
@router.post(
    "",
    response_model=PassageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a passage manually",
)
async def create_passage(
    data:            PassageCreate,
    db:              AsyncSession = Depends(get_db),
    current_teacher: Teacher      = Depends(get_current_teacher),
):
    return await passage_service.create_passage(db=db, data=data, teacher_id=current_teacher.id)


# Upload: combined passage + questions in one file
class CombinedUploadResponse(PassageResponse):
    imported_questions: List[QuestionResponse] = []


@router.post(
    "/upload",
    response_model=CombinedUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a .docx or .txt file containing both passage and questions",
    description=(
        "The file must follow the template format with **[PASSAGE]** and **[QUESTIONS]** "
        "section markers. Both the passage and all questions are created in one request. "
        "Numbering prefixes (1. / Q1: / etc.) on questions are stripped automatically."
    ),
)
async def upload_combined(
    file:            UploadFile  = File(...),
    title:           str         = Form(..., min_length=1, max_length=255),
    language:        Language    = Form(...),
    grade_level:     GradeLevel  = Form(...),
    db:              AsyncSession = Depends(get_db),
    current_teacher: Teacher      = Depends(get_current_teacher),
):
    file_bytes = await file.read()
    validate_upload(file_bytes, file.filename)

    parsed = parse_combined(file_bytes, file.filename)

    # Create the passage first
    passage = await passage_service.create_passage_from_docx(
        db=db,
        title=title,
        language=language,
        grade_level=grade_level,
        content=parsed.passage_content,
        teacher_id=current_teacher.id,
    )

    # Bulk create all parsed questions
    questions = await question_service.bulk_create_questions(
        db=db,
        passage_id=passage.id,
        texts=parsed.questions,
        teacher_id=current_teacher.id,
    )

    # Build combined response
    response = CombinedUploadResponse(
        **PassageResponse.model_validate(passage).model_dump(),
        imported_questions=questions,
    )
    return response


# Upload: passage text only (no questions)
@router.post(
    "/upload/passage-only",
    response_model=PassageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a .docx or .txt file containing only the passage text",
    description="No section markers needed — every paragraph becomes part of the passage content.",
)
async def upload_passage_only(
    file:            UploadFile  = File(...),
    title:           str         = Form(..., min_length=1, max_length=255),
    language:        Language    = Form(...),
    grade_level:     GradeLevel  = Form(...),
    db:              AsyncSession = Depends(get_db),
    current_teacher: Teacher      = Depends(get_current_teacher),
):
    file_bytes = await file.read()
    validate_upload(file_bytes, file.filename)

    content = parse_passage_only(file_bytes, file.filename)

    return await passage_service.create_passage_from_docx(
        db=db,
        title=title,
        language=language,
        grade_level=grade_level,
        content=content,
        teacher_id=current_teacher.id,
    )


# Get one
@router.get("/{passage_id}", response_model=PassageResponse, summary="Get a passage")
async def get_passage(
    passage_id:      int,
    db:              AsyncSession = Depends(get_db),
    current_teacher: Teacher      = Depends(get_current_teacher),
):
    return await passage_service.get_passage_by_id(
        db=db, passage_id=passage_id, teacher_id=current_teacher.id
    )


# Update
@router.patch("/{passage_id}", response_model=PassageResponse, summary="Update a passage")
async def update_passage(
    passage_id:      int,
    data:            PassageUpdate,
    db:              AsyncSession  = Depends(get_db),
    current_teacher: Teacher       = Depends(get_current_teacher),
):
    return await passage_service.update_passage(
        db=db, passage_id=passage_id, data=data, teacher_id=current_teacher.id
    )


# Archive
@router.delete(
    "/{passage_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Archive a passage (soft delete)",
)
async def archive_passage(
    passage_id:      int,
    db:              AsyncSession = Depends(get_db),
    current_teacher: Teacher      = Depends(get_current_teacher),
):
    await passage_service.archive_passage(
        db=db, passage_id=passage_id, teacher_id=current_teacher.id
    )