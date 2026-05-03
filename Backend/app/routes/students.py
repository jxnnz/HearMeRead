from typing import Optional, List

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.dependencies import get_current_teacher
from app.models import (
    AssessmentPeriod,
    AssessmentSession,
    GradeLevel,
    Language,
    ReadingResult,
    Sex,
    SessionObservation,
    Student,
    Teacher,
)
from app.schema import (
    ClassListResponse,
    ExcelImportResponse,
    StudentCreate,
    StudentListResponse,
    StudentResponse,
    StudentUpdate,
)
from app.services import student_service
from app.utils.excel_parser import parse_crla_excel

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("", response_model=StudentListResponse, summary="List all students")
async def list_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=2000),
    search: Optional[str] = Query(None, description="Search by first or last name"),
    grade_level: Optional[GradeLevel] = Query(None),
    section: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    total, students = await student_service.get_students(
        db=db,
        teacher_id=current_teacher.id,
        page=page,
        page_size=page_size,
        search=search,
        grade_level=grade_level,
        section=section,
    )
    return StudentListResponse(total=total, page=page, page_size=page_size, students=students)


@router.get("/school-years", summary="List distinct school years that have sessions")
async def list_school_years(
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> dict:
    result = await db.execute(
        select(distinct(AssessmentSession.school_year))
        .where(AssessmentSession.teacher_id == current_teacher.id)
        .order_by(AssessmentSession.school_year.desc())
    )
    years: List[str] = [row[0] for row in result.fetchall()]
    return {"school_years": years}


@router.get("/classes", response_model=ClassListResponse, summary="List class summaries")
async def list_classes(
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    classes = await student_service.get_class_summaries(db=db, teacher_id=current_teacher.id)
    return ClassListResponse(classes=classes)


@router.post("/import", response_model=ExcelImportResponse, status_code=200, summary="Import CRLA records from Excel")
async def import_excel_records(
    file: UploadFile = File(...),
    school_year: str = Form(...),
    period: AssessmentPeriod = Form(...),
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    if not (file.filename or "").lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported.")

    file_bytes = await file.read()

    try:
        parsed = parse_crla_excel(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    grade_level: Optional[GradeLevel] = None
    if parsed.grade_level:
        try:
            grade_level = GradeLevel(parsed.grade_level)
        except ValueError:
            pass

    try:
        language = Language(parsed.language)
    except ValueError:
        language = Language.filipino

    students_created = 0
    students_found   = 0
    sessions_created = 0
    sessions_skipped = 0
    errors           = list(parsed.parse_errors)

    if grade_level is None:
        errors.append(
            "Warning: Grade level could not be read from the file header. "
            "Students were created with Grade 1 as default — use 'Edit Class Info' "
            "on the Class Record page to correct the grade level."
        )

    for row in parsed.rows:
        try:
            # Find or create student
            student: Optional[Student] = None
            if row.lrn:
                res = await db.execute(
                    select(Student).where(
                        Student.lrn == row.lrn,
                        Student.teacher_id == current_teacher.id,
                    )
                )
                student = res.scalar_one_or_none()

            if student is None:
                student = Student(
                    first_name  = row.first_name or "Unknown",
                    last_name   = row.last_name  or "Unknown",
                    lrn         = row.lrn,
                    sex         = Sex(row.sex) if row.sex in ("female", "male") else None,
                    grade_level = grade_level or GradeLevel.grade_1,
                    section     = parsed.section,
                    teacher_id  = current_teacher.id,
                )
                db.add(student)
                await db.flush()
                students_created += 1
            else:
                students_found += 1

            # Skip if session already exists for this period
            dup = await db.execute(
                select(AssessmentSession).where(
                    AssessmentSession.student_id == student.id,
                    AssessmentSession.school_year == school_year,
                    AssessmentSession.period == period,
                )
            )
            if dup.scalar_one_or_none():
                sessions_skipped += 1
                continue

            # Create session
            session = AssessmentSession(
                teacher_id   = current_teacher.id,
                student_id   = student.id,
                passage_id   = None,
                school_year  = school_year,
                period       = period,
                language     = language,
                is_completed = True,
            )
            db.add(session)
            await db.flush()

            # Create reading result if any scores present
            if any(v is not None for v in [
                row.task1_correct, row.task2_correct,
                row.total_score, row.total_words,
                row.miscue_count, row.cwpm,
            ]):
                db.add(ReadingResult(
                    session_id           = session.id,
                    part1_task1_correct  = row.task1_correct,
                    part1_task2_correct  = row.task2_correct,
                    part1_route          = row.task2_route,
                    part1_total_score    = row.total_score,
                    part1_classification = row.classification,
                    total_words          = row.total_words,
                    miscue_count         = row.miscue_count,
                    reading_time_seconds = row.reading_time_seconds,
                    cwpm                 = row.cwpm,
                    reading_profile      = row.reading_profile,
                ))

            # Create observation if any observation data present
            if any(v is not None for v in [
                row.comprehension_correct, row.learner_experience,
                row.fluency_level, row.teacher_remarks,
            ]):
                db.add(SessionObservation(
                    session_id            = session.id,
                    comprehension_correct = row.comprehension_correct,
                    fluency_level         = row.fluency_level,
                    learner_experience    = row.learner_experience,
                    teacher_remarks       = row.teacher_remarks,
                ))

            sessions_created += 1

        except Exception as exc:
            errors.append(f"Row {row.row_number}: {exc}")
            continue

    await db.commit()

    return ExcelImportResponse(
        students_created = students_created,
        students_found   = students_found,
        sessions_created = sessions_created,
        sessions_skipped = sessions_skipped,
        errors           = errors,
    )


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED, summary="Create a student")
async def create_student(
    data: StudentCreate,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    return await student_service.create_student(db=db, data=data, teacher_id=current_teacher.id)


@router.get("/{student_id}", response_model=StudentResponse, summary="Get a student")
async def get_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    return await student_service.get_student_by_id(
        db=db, student_id=student_id, teacher_id=current_teacher.id
    )


@router.patch("/{student_id}", response_model=StudentResponse, summary="Update a student")
async def update_student(
    student_id: int,
    data: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    return await student_service.update_student(
        db=db, student_id=student_id, data=data, teacher_id=current_teacher.id
    )


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a student")
async def delete_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    await student_service.delete_student(
        db=db, student_id=student_id, teacher_id=current_teacher.id
    )
