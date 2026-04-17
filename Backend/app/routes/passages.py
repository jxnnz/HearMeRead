from typing import Optional

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
)
from app.services import passage_service
from app.utils.docx_parser import parse_passage_docx

router = APIRouter(prefix="/passages", tags=["Passages"])

_ALLOWED_MIME = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",  # some browsers send this for .docx
}
_MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def _validate_docx(file: UploadFile) -> None:
    if not file.filename.endswith(".docx"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only .docx files are accepted.",
        )


# ── List ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=PassageListResponse, summary="List passages")
async def list_passages(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    language: Optional[Language] = Query(None),
    grade_level: Optional[GradeLevel] = Query(None),
    include_archived: bool = Query(False, description="Include archived passages"),
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    total, passages = await passage_service.get_passages(
        db=db,
        teacher_id=current_teacher.id,
        page=page,
        page_size=page_size,
        language=language,
        grade_level=grade_level,
        include_archived=include_archived,
    )
    return PassageListResponse(total=total, page=page, page_size=page_size, passages=passages)


# ── Create (manual) ──────────────────────────────────────────────────────────

@router.post("", response_model=PassageResponse, status_code=status.HTTP_201_CREATED, summary="Create a passage")
async def create_passage(
    data: PassageCreate,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    return await passage_service.create_passage(db=db, data=data, teacher_id=current_teacher.id)


# ── Create (upload .docx) ────────────────────────────────────────────────────

@router.post(
    "/upload",
    response_model=PassageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a .docx file to create a passage",
)
async def upload_passage(
    file: UploadFile = File(..., description="A .docx file containing the passage text"),
    title: str = Form(..., min_length=1, max_length=255),
    language: Language = Form(...),
    grade_level: GradeLevel = Form(...),
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

    content = parse_passage_docx(file_bytes)

    return await passage_service.create_passage_from_docx(
        db=db,
        title=title,
        language=language,
        grade_level=grade_level,
        content=content,
        teacher_id=current_teacher.id,
    )


# ── Get one ──────────────────────────────────────────────────────────────────

@router.get("/{passage_id}", response_model=PassageResponse, summary="Get a passage")
async def get_passage(
    passage_id: int,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    return await passage_service.get_passage_by_id(
        db=db, passage_id=passage_id, teacher_id=current_teacher.id
    )


# ── Update ───────────────────────────────────────────────────────────────────

@router.patch("/{passage_id}", response_model=PassageResponse, summary="Update a passage")
async def update_passage(
    passage_id: int,
    data: PassageUpdate,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    return await passage_service.update_passage(
        db=db, passage_id=passage_id, data=data, teacher_id=current_teacher.id
    )


# ── Archive (soft delete) ────────────────────────────────────────────────────

@router.delete(
    "/{passage_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Archive a passage (soft delete)",
)
async def archive_passage(
    passage_id: int,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    await passage_service.archive_passage(
        db=db, passage_id=passage_id, teacher_id=current_teacher.id
    )