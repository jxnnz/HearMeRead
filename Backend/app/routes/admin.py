from typing import Optional, List
import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.dependencies import require_admin
from app.models import (
    Teacher, School, Student, AssessmentSession,
    ReadingResult, ActivityLog, UserRole, GradeLevel
)
from app.schema import (
    AdminDashboardResponse, TeacherResponse,
    AdminTeacherUpdateRequest, ActivityLogResponse,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard", summary="Admin dashboard — school stats and school code")
async def admin_dashboard(
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_result = await db.execute(
        select(School).where(School.id == current_admin.school_id)
    )
    school = school_result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    # Total teachers (excluding admin accounts)
    teacher_count_result = await db.execute(
        select(func.count(Teacher.id)).where(
            Teacher.school_id == current_admin.school_id,
            Teacher.role == UserRole.teacher,
            Teacher.is_active == True,
        )
    )
    total_teachers = teacher_count_result.scalar() or 0

    # Total unique students assessed (via sessions in this school)
    student_count_result = await db.execute(
        select(func.count(func.distinct(AssessmentSession.student_id)))
        .join(Teacher, Teacher.id == AssessmentSession.teacher_id)
        .where(Teacher.school_id == current_admin.school_id)
    )
    total_students_assessed = student_count_result.scalar() or 0

    # Total sessions and completed sessions
    sessions_result = await db.execute(
        select(
            func.count(AssessmentSession.id),
            func.sum(AssessmentSession.is_completed.cast(sa.Integer)),
        )
        .join(Teacher, Teacher.id == AssessmentSession.teacher_id)
        .where(Teacher.school_id == current_admin.school_id)
    )
    row = sessions_result.one()
    total_sessions = row[0] or 0
    completed_sessions = row[1] or 0

    # Period breakdown
    period_breakdown_result = await db.execute(
        select(AssessmentSession.period, func.count(AssessmentSession.id))
        .join(Teacher, Teacher.id == AssessmentSession.teacher_id)
        .where(
            Teacher.school_id == current_admin.school_id,
            AssessmentSession.is_completed == True,
        )
        .group_by(AssessmentSession.period)
    )
    period_breakdown = {row.period.value: row[1] for row in period_breakdown_result}

    return {
        "school_code": school.school_code,
        "school_name": school.name,
        "deped_school_id": school.deped_school_id,
        "total_teachers": total_teachers,
        "total_students_assessed": total_students_assessed,
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "completion_rate": round((completed_sessions / total_sessions * 100), 1) if total_sessions else 0.0,
        "period_breakdown": {
            "beginning": period_breakdown.get("beginning", 0),
            "middle": period_breakdown.get("middle", 0),
            "end": period_breakdown.get("end", 0),
        },
    }


# ── Teachers ──────────────────────────────────────────────────────────────────

@router.get("/teachers", summary="List all teachers in admin's school")
async def list_teachers(
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Teacher).where(
            Teacher.school_id == current_admin.school_id,
            Teacher.role == UserRole.teacher,
        ).order_by(Teacher.grade_level, Teacher.section, Teacher.last_name)
    )
    teachers = result.scalars().all()
    return teachers


@router.patch("/teachers/{teacher_id}", summary="Admin edits teacher grade level, section, or employee ID")
async def update_teacher(
    teacher_id: int,
    payload: "AdminTeacherUpdateRequest",
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Teacher).where(
            Teacher.id == teacher_id,
            Teacher.school_id == current_admin.school_id,
        )
    )
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found in your school")

    if payload.grade_level is not None:
        teacher.grade_level = payload.grade_level
    if payload.section is not None:
        teacher.section = payload.section
    if payload.employee_id is not None:
        teacher.employee_id = payload.employee_id

    await db.commit()
    await db.refresh(teacher)
    return teacher


@router.patch("/teachers/{teacher_id}/archive", summary="Admin soft-archives a teacher")
async def archive_teacher(
    teacher_id: int,
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Teacher).where(
            Teacher.id == teacher_id,
            Teacher.school_id == current_admin.school_id,
            Teacher.role == UserRole.teacher,
        )
    )
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found in your school")

    teacher.is_active = False
    await db.commit()
    return {"detail": "Teacher archived successfully"}


# ── Teacher Activity Logs ─────────────────────────────────────────────────────

@router.get("/teachers/{teacher_id}/logs", summary="Activity logs for a specific teacher")
async def get_teacher_logs(
    teacher_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Verify teacher belongs to admin's school
    teacher_result = await db.execute(
        select(Teacher).where(
            Teacher.id == teacher_id,
            Teacher.school_id == current_admin.school_id,
        )
    )
    if not teacher_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Teacher not found in your school")

    offset = (page - 1) * page_size

    total_result = await db.execute(
        select(func.count(ActivityLog.id)).where(ActivityLog.teacher_id == teacher_id)
    )
    total = total_result.scalar() or 0

    logs_result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.teacher_id == teacher_id)
        .order_by(ActivityLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    logs = logs_result.scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "logs": logs,
    }


# ── Students (class record view) ──────────────────────────────────────────────

@router.get("/students", summary="All teacher class cards in admin's school")
async def list_class_cards(
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns a list of teachers (with grade_level and section) in the school.
    Frontend renders one card per teacher. Clicking a card calls /admin/students/{teacher_id}.
    Only teachers with grade_level AND section set are returned.
    """
    result = await db.execute(
        select(Teacher).where(
            Teacher.school_id == current_admin.school_id,
            Teacher.role == UserRole.teacher,
            Teacher.grade_level != None,
            Teacher.section != None,
            Teacher.is_active == True,
        ).order_by(Teacher.grade_level, Teacher.section)
    )
    teachers = result.scalars().all()
    return [
        {
            "teacher_id": t.id,
            "teacher_name": f"{t.first_name} {t.last_name}",
            "grade_level": t.grade_level.value if t.grade_level else None,
            "section": t.section,
        }
        for t in teachers
    ]


@router.get("/students/{teacher_id}", summary="Student class record for a specific teacher")
async def get_teacher_class_record(
    teacher_id: int,
    school_year: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all students under the given teacher, with their latest session result.
    Filtered by school_year and period if provided.
    Scoped to admin's school via teacher.school_id check.
    """
    teacher_result = await db.execute(
        select(Teacher).where(
            Teacher.id == teacher_id,
            Teacher.school_id == current_admin.school_id,
        )
    )
    teacher = teacher_result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found in your school")

    students_result = await db.execute(
        select(Student).where(
            Student.teacher_id == teacher_id,
        ).order_by(Student.last_name, Student.first_name)
    )
    students = students_result.scalars().all()

    # For each student, fetch their session matching school_year + period if given
    student_records = []
    for student in students:
        session_query = (
            select(AssessmentSession)
            .options(selectinload(AssessmentSession.reading_result))
            .where(AssessmentSession.student_id == student.id)
            .order_by(AssessmentSession.created_at.desc())
        )
        if school_year:
            session_query = session_query.where(AssessmentSession.school_year == school_year)
        if period:
            session_query = session_query.where(AssessmentSession.period == period)

        session_result = await db.execute(session_query.limit(1))
        session = session_result.scalar_one_or_none()

        student_records.append({
            "student_id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "grade_level": student.grade_level.value if student.grade_level else None,
            "section": student.section,
            "lrn": student.lrn,
            "sex": student.sex.value if student.sex else None,
            "reading_profile": session.reading_result.reading_profile if session and session.reading_result else None,
            "cwpm": session.reading_result.cwpm if session and session.reading_result else None,
            "period": session.period.value if session else None,
            "school_year": session.school_year if session else None,
            "is_completed": session.is_completed if session else None,
        })

    return {
        "teacher_id": teacher.id,
        "teacher_name": f"{teacher.first_name} {teacher.last_name}",
        "grade_level": teacher.grade_level.value if teacher.grade_level else None,
        "section": teacher.section,
        "students": student_records,
    }
