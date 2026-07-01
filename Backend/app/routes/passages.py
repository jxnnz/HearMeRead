from typing import Optional, List

from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, status, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_teacher
from app.db import get_db
from app.models import Teacher, Language, GradeLevel
from app.schema import (
    PassageCreate,
    PassageUpdate,
    PassageResponse,
    PassageListResponse,
    QuestionResponse,
)
from app.services import passage_service, question_service, storage_service
from app.utils.docx_parser import validate_upload, parse_combined, parse_passage_only


router = APIRouter(prefix="/passages", tags=["Passages"])


# ── A1 downloadable templates (one per grade/language variant) ────────────────
# Format matches exactly what the frontend fileParser.js expects.

_A1_GRADE1_FILIPINO = """\
Language:
Filipino
Grade:
1
Task 1:
b, ng, T, e, p, s, H, G, u, L
Task 2:
W: sanay, tunay
R: Oo
W: ulam, anim
R: Hindi
W: hinog, lamig
R: Hindi
W: buhay, buhay
R: Oo
W: luto, tayo
R: Hindi
W: mata, pata
R: Oo
W: saya, maya
R: Oo
W: kuha, lupa
R: Hindi
W: puso, dulo
R: Hindi
W: tuwa, buwa
R: Oo
Task 2 Sentences:
Ang bata ay masaya. Siya ay mabait. Mahal niya ang kanyang pamilya.
"""

_A1_GRADE2_FILIPINO = """\
Language:
Filipino
Grade:
2
Task 1:
aso, bata, kuya, isda, damit, bahay, paaralan, mahal, tahimik, maganda
Task 2 Words:
aklat, lapis, mesa, silya, kotse, puno, bundok, ilog, dagat, langit
Task 2 Sentences:
Ang bata ay pumunta sa paaralan. Siya ay nagdala ng kanyang bag. Masaya siya sa klase.
"""

_A1_GRADE3_FILIPINO = """\
Language:
Filipino
Grade:
3
Task 1:
magulang, kaibigan, kalikasan, pamayanan, kasipagan, katapatan, pagmamahal, pagiging, katahimikan, responsibilidad
Task 2 Words:
naglalaro, kumakain, nagaaral, tumatakbo, nagtatrabaho, natutulog, nagbabasa, sumusulat, naglalakad, nagtatanong
Task 2 Sentences:
Ang mga bata ay masayang naglalaro sa parke tuwing hapon. Tinutulungan nila ang isa't isa sa oras ng pangangailangan. Ang pagkakaisa ay nagbibigay ng lakas sa bawat miyembro ng pangkat.
"""

_A1_GRADE3_ENGLISH = """\
Language:
English
Grade:
3
Task 1:
beautiful, environment, community, responsibility, friendship, knowledge, adventure, imagination, celebration, determination
Task 2 Words:
running, jumping, playing, reading, writing, eating, sleeping, helping, listening, learning
"""

# A2 template (unchanged)
_TEMPLATE_A2 = """\
Language:
Filipino
Grade:
2

Story Number:
1
Title:
Ang Pagong at ang Matsing

Content:
Isulat dito ang buong teksto ng kwento.
...

Questions:
Q: Sino ang pangunahing tauhan ng kwento?
A: (Ilagay dito ang tamang sagot)
...
"""

# Map of (grade, language) → template string for A1
_A1_TEMPLATES = {
    ("grade_1", "filipino"): _A1_GRADE1_FILIPINO,
    ("grade_2", "filipino"): _A1_GRADE2_FILIPINO,
    ("grade_3", "filipino"): _A1_GRADE3_FILIPINO,
    ("grade_3", "english"):  _A1_GRADE3_ENGLISH,
}


# ── List ──────────────────────────────────────────────────────────────────────
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


# ── Create manually ───────────────────────────────────────────────────────────
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


# ── NEW: Download A1 template by grade + language ────────────────────────────
@router.get(
    "/template/a1",
    summary="Download an Assessment 1 .txt template for a specific grade and language",
    response_class=Response,
)
async def download_a1_template(
    grade:    str = Query(..., description="grade_1 | grade_2 | grade_3"),
    language: str = Query(..., description="filipino | english"),
):
    """
    Returns a downloadable .txt template pre-filled with the correct format
    for the given grade level and language combination.
    Valid combos: grade_1/filipino, grade_2/filipino, grade_3/filipino, grade_3/english.
    """
    key = (grade.lower().strip(), language.lower().strip())
    content = _A1_TEMPLATES.get(key)
    if content is None:
        raise HTTPException(
            status_code=400,
            detail=(
                f"No A1 template for grade='{grade}' language='{language}'. "
                "Valid combinations: grade_1/filipino, grade_2/filipino, "
                "grade_3/filipino, grade_3/english."
            ),
        )
    filename = f"a1_template_{grade}_{language}.txt"
    return Response(
        content=content.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── NEW: Download A2 template ─────────────────────────────────────────────────
@router.get(
    "/template/a2",
    summary="Download the Assessment 2 .txt template",
    response_class=Response,
)
async def download_a2_template():
    return Response(
        content=_TEMPLATE_A2.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=a2_template.txt"},
    )


# ── Upload: combined passage + questions ──────────────────────────────────────
class CombinedUploadResponse(PassageResponse):
    imported_questions: List[QuestionResponse] = []


@router.post(
    "/upload",
    response_model=CombinedUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a .docx or .txt file containing both passage and questions",
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
    passage = await passage_service.create_passage_from_docx(
        db=db, title=title, language=language, grade_level=grade_level,
        content=parsed.passage_content, teacher_id=current_teacher.id,
    )
    questions = await question_service.bulk_create_questions(
        db=db, passage_id=passage.id, texts=parsed.questions, teacher_id=current_teacher.id,
    )
    return CombinedUploadResponse(
        **PassageResponse.model_validate(passage).model_dump(),
        imported_questions=questions,
    )


# ── Upload: passage text only ─────────────────────────────────────────────────
@router.post(
    "/upload/passage-only",
    response_model=PassageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a .docx or .txt file containing only the passage text",
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
        db=db, title=title, language=language, grade_level=grade_level,
        content=content, teacher_id=current_teacher.id,
    )


# ── NEW: Batch upload multiple passages ───────────────────────────────────────
class BatchUploadResult(BaseModel):
    filename:           str
    passage_id:         Optional[int] = None
    title:              str
    questions_imported: int           = 0
    error:              Optional[str] = None


class BatchUploadResponse(BaseModel):
    created: int
    failed:  int
    results: List[BatchUploadResult]


def _title_from_filename(filename: str) -> str:
    import os
    name = os.path.splitext(filename)[0]
    return name.replace("_", " ").replace("-", " ").title()


@router.post(
    "/upload/batch",
    response_model=BatchUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload multiple passage files in one request (max 10)",
)
async def upload_batch(
    files:           List[UploadFile] = File(...),
    language:        Language         = Form(...),
    grade_level:     GradeLevel       = Form(...),
    db:              AsyncSession     = Depends(get_db),
    current_teacher: Teacher          = Depends(get_current_teacher),
):
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per batch upload.")

    created = 0
    failed  = 0
    results: List[BatchUploadResult] = []

    for upload in files:
        filename = upload.filename or "unknown"
        title    = _title_from_filename(filename)
        try:
            file_bytes = await upload.read()
            validate_upload(file_bytes, filename)
            parsed     = parse_combined(file_bytes, filename)
            passage    = await passage_service.create_passage_from_docx(
                db=db, title=title, language=language, grade_level=grade_level,
                content=parsed.passage_content, teacher_id=current_teacher.id,
            )
            questions = await question_service.bulk_create_questions(
                db=db, passage_id=passage.id, texts=parsed.questions,
                teacher_id=current_teacher.id,
            )
            results.append(BatchUploadResult(
                filename=filename, passage_id=passage.id,
                title=title, questions_imported=len(questions),
            ))
            created += 1
        except Exception as exc:
            results.append(BatchUploadResult(filename=filename, title=title, error=str(exc)))
            failed += 1

    await db.commit()
    return BatchUploadResponse(created=created, failed=failed, results=results)


# ── Upload original file to R2 ────────────────────────────────────────────────
@router.post(
    "/{passage_id}/file",
    status_code=status.HTTP_200_OK,
    summary="Upload the original passage file to R2 storage",
)
async def upload_passage_file(
    passage_id:      int,
    file:            UploadFile  = File(...),
    db:              AsyncSession = Depends(get_db),
    current_teacher: Teacher      = Depends(get_current_teacher),
):
    passage = await passage_service.get_passage_by_id(db, passage_id, current_teacher.id)
    file_bytes = await file.read()
    r2_key = await storage_service.upload_passage_file(
        file_bytes, file.filename or "passage", str(current_teacher.id)
    )
    passage.file_path = r2_key
    await db.commit()
    await db.refresh(passage)
    return {"file_path": r2_key}


# ── Get one ───────────────────────────────────────────────────────────────────
@router.get("/{passage_id}", response_model=PassageResponse, summary="Get a passage")
async def get_passage(
    passage_id:      int,
    db:              AsyncSession = Depends(get_db),
    current_teacher: Teacher      = Depends(get_current_teacher),
):
    return await passage_service.get_passage_by_id(
        db=db, passage_id=passage_id, teacher_id=current_teacher.id
    )


# ── Update ────────────────────────────────────────────────────────────────────
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


# ── Archive ───────────────────────────────────────────────────────────────────
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
