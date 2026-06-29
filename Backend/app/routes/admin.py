from typing import Optional, List
from datetime import datetime
import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, update
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.dependencies import require_admin
from app.core.encryption import decrypt
from app.models import (
    Teacher, School, Student, AssessmentSession,
    ReadingResult, SessionObservation, Passage,
    ActivityLog, UserRole, GradeLevel, Sex,
    TeacherAssignment, StudentEnrollment,
)
from app.schema import (
    AdminDashboardResponse, TeacherResponse,
    AdminTeacherUpdateRequest, ActivityLogResponse,
    TeacherAdminView,
    TeacherAssignmentCreate, TeacherAssignmentUpdate,
    TeacherAssignmentResponse,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


def _current_school_year() -> str:
    now = datetime.now()
    y = now.year
    return f"{y-1}-{y}" if now.month < 6 else f"{y}-{y+1}"


# Dashboard
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

    # Period breakdown — completed session counts grouped by period and student sex
    period_breakdown_result = await db.execute(
        select(
            AssessmentSession.period,
            Student.sex,
            func.count(func.distinct(AssessmentSession.student_id)),
        )
        .join(Teacher, Teacher.id == AssessmentSession.teacher_id)
        .join(Student, Student.id == AssessmentSession.student_id)
        .where(
            Teacher.school_id == current_admin.school_id,
            AssessmentSession.is_completed == True,
        )
        .group_by(AssessmentSession.period, Student.sex)
    )

    raw_pb: dict[str, dict[str, int]] = {}
    for row in period_breakdown_result:
        p   = row[0].value
        sex = row[1].value if row[1] else "unknown"
        cnt = row[2]
        bucket = raw_pb.setdefault(p, {"female": 0, "male": 0, "total": 0})
        if sex in ("female", "male"):
            bucket[sex] += cnt
        bucket["total"] += cnt

    period_breakdown = {
        p: raw_pb.get(p, {"female": 0, "male": 0, "total": 0})
        for p in ("beginning", "middle", "end")
    }

    # Reading profile distribution per period (% of assessed students per profile)
    profile_period_result = await db.execute(
        select(
            AssessmentSession.period,
            ReadingResult.reading_profile,
            func.count(func.distinct(AssessmentSession.student_id)),
        )
        .join(Teacher, Teacher.id == AssessmentSession.teacher_id)
        .join(ReadingResult, ReadingResult.session_id == AssessmentSession.id)
        .where(
            Teacher.school_id == current_admin.school_id,
            AssessmentSession.is_completed == True,
            ReadingResult.reading_profile != None,
        )
        .group_by(AssessmentSession.period, ReadingResult.reading_profile)
    )

    # Build {period: {profile: pct}} structure
    raw_profile_period: dict[str, dict[str, int]] = {}
    for row in profile_period_result:
        p = row[0].value
        profile = row[1]
        count = row[2]
        raw_profile_period.setdefault(p, {})[profile] = count

    profile_by_period: dict[str, dict[str, float]] = {}
    for period_key in ("beginning", "middle", "end"):
        counts = raw_profile_period.get(period_key, {})
        total_in_period = sum(counts.values()) or 1
        profile_by_period[period_key] = {
            profile: round(cnt / total_in_period * 100, 1)
            for profile, cnt in counts.items()
        }

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
        "profile_by_period": profile_by_period,
    }


# Teachers
@router.get("/teachers", summary="List all teachers in admin's school", response_model=List[TeacherAdminView])
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

    # Decrypt PII before returning
    for t in teachers:
        d = t.__dict__
        if d.get("first_name"):
            d["first_name"] = decrypt(d["first_name"])
        if d.get("last_name"):
            d["last_name"] = decrypt(d["last_name"])

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
        if payload.employee_id:
            conflict = await db.execute(
                select(Teacher).where(
                    Teacher.employee_id == payload.employee_id,
                    Teacher.id != teacher_id,
                )
            )
            if conflict.scalar_one_or_none():
                raise HTTPException(status_code=409, detail="This Employee ID is already assigned to another teacher.")
        teacher.employee_id = payload.employee_id

    # Sync TeacherAssignment so passage filtering reflects the new grade
    if teacher.grade_level and teacher.section:
        current_year = _current_school_year()
        asgn_res = await db.execute(
            select(TeacherAssignment)
            .where(
                TeacherAssignment.teacher_id == teacher_id,
                TeacherAssignment.is_active == True,
            )
            .order_by(TeacherAssignment.school_year.desc())
            .limit(1)
        )
        existing_asgn = asgn_res.scalar_one_or_none()
        if existing_asgn and existing_asgn.school_year == current_year:
            existing_asgn.grade_level = teacher.grade_level
            existing_asgn.section = teacher.section
        else:
            if existing_asgn:
                existing_asgn.is_active = False
            db.add(TeacherAssignment(
                teacher_id=teacher_id,
                school_id=current_admin.school_id,
                grade_level=teacher.grade_level,
                section=teacher.section,
                school_year=current_year,
                is_active=True,
            ))

    await db.commit()
    await db.refresh(teacher)
    # Decrypt PII before returning
    d = teacher.__dict__
    if d.get("first_name"):
        d["first_name"] = decrypt(d["first_name"])
    if d.get("last_name"):
        d["last_name"] = decrypt(d["last_name"])
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


# Teacher Activity Logs
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


# Students (class record view)
@router.get("/students", summary="All teacher class cards in admin's school")
async def list_class_cards(
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns one card per TeacherAssignment (all history) PLUS a current-year card for
    any active teacher whose current grade_level/section is not already covered.
    Sorted by school_year desc. Student count is per (teacher_id, grade_level, section).
    """
    current_year = _current_school_year()

    # 1. TeacherAssignment-based cards (all history)
    asgn_result = await db.execute(
        select(TeacherAssignment)
        .join(Teacher, TeacherAssignment.teacher_id == Teacher.id)
        .where(
            TeacherAssignment.school_id == current_admin.school_id,
            Teacher.is_active == True,
        )
        .order_by(
            TeacherAssignment.school_year.desc(),
            TeacherAssignment.grade_level,
            TeacherAssignment.section,
        )
    )
    assignments = asgn_result.scalars().all()

    # 2. All active teachers with grade/section set (for current-year fallback)
    cur_result = await db.execute(
        select(Teacher).where(
            Teacher.school_id == current_admin.school_id,
            Teacher.role == UserRole.teacher,
            Teacher.is_active == True,
            Teacher.grade_level != None,
            Teacher.section != None,
        )
    )
    current_teachers = cur_result.scalars().all()

    # Build unified teacher ID set for batch queries
    all_teacher_ids = list(
        {a.teacher_id for a in assignments} | {t.id for t in current_teachers}
    )
    if not all_teacher_ids:
        return []

    teacher_res = await db.execute(select(Teacher).where(Teacher.id.in_(all_teacher_ids)))
    teacher_map = {t.id: t for t in teacher_res.scalars().all()}

    # Batch-fetch student counts per (teacher_id, grade_level, section)
    count_result = await db.execute(
        select(Student.teacher_id, Student.grade_level, Student.section, func.count(Student.id))
        .where(Student.teacher_id.in_(all_teacher_ids))
        .group_by(Student.teacher_id, Student.grade_level, Student.section)
    )
    count_map = {(r[0], r[1], r[2]): r[3] for r in count_result}

    cards = []
    seen = set()  # (teacher_id, grade_level, section, school_year)

    # Cards from TeacherAssignment history
    for asgn in assignments:
        t = teacher_map.get(asgn.teacher_id)
        if not t:
            continue
        key = (asgn.teacher_id, asgn.grade_level, asgn.section, asgn.school_year)
        if key in seen:
            continue
        seen.add(key)
        first = decrypt(t.first_name) if t.first_name else ""
        last  = decrypt(t.last_name)  if t.last_name  else ""
        grade = asgn.grade_level.value if asgn.grade_level else None
        cards.append({
            "teacher_id":    t.id,
            "teacher_name":  f"{first} {last}".strip(),
            "grade_level":   grade,
            "section":       asgn.section,
            "school_year":   asgn.school_year,
            "student_count": count_map.get((t.id, asgn.grade_level, asgn.section), 0),
        })

    # Current-year cards for any teacher whose current grade/section isn't in seen yet
    for t in current_teachers:
        if not t.grade_level or not t.section:
            continue
        key = (t.id, t.grade_level, t.section, current_year)
        if key in seen:
            continue
        seen.add(key)
        first = decrypt(t.first_name) if t.first_name else ""
        last  = decrypt(t.last_name)  if t.last_name  else ""
        cards.append({
            "teacher_id":    t.id,
            "teacher_name":  f"{first} {last}".strip(),
            "grade_level":   t.grade_level.value,
            "section":       t.section,
            "school_year":   current_year,
            "student_count": count_map.get((t.id, t.grade_level, t.section), 0),
        })

    # Sort: latest school_year first, then grade, then section
    cards.sort(key=lambda c: (c["school_year"] or "", c["grade_level"] or "", c["section"] or ""), reverse=True)
    return cards


@router.get("/students/{teacher_id}", summary="Student class record for a specific teacher")
async def get_teacher_class_record(
    teacher_id: int,
    school_year: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    grade_level: Optional[str] = Query(None),
    section: Optional[str] = Query(None),
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns students under the given teacher for the admin class record view.
    Filtered by school_year, period, language, and optionally grade_level + section
    so that clicking a specific class card only shows that class's students.
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

    # Decrypt teacher name
    teacher_first = decrypt(teacher.first_name) if teacher.first_name else ""
    teacher_last = decrypt(teacher.last_name) if teacher.last_name else ""

    # Build grade/section filters to scope the query to the specific class card
    grade_filter = []
    if grade_level:
        try:
            grade_filter.append(Student.grade_level == GradeLevel(grade_level))
        except ValueError:
            pass
    if section:
        grade_filter.append(Student.section == section)

    # Fetch students — use enrollments for year-aware queries
    if school_year:
        # Only students enrolled for this teacher + school year
        enrollment_result = await db.execute(
            select(StudentEnrollment.student_id).where(
                StudentEnrollment.teacher_id == teacher_id,
                StudentEnrollment.school_year == school_year,
            )
        )
        enrolled_ids = [row[0] for row in enrollment_result]
        if enrolled_ids:
            students_result = await db.execute(
                select(Student).where(
                    Student.id.in_(enrolled_ids),
                    *grade_filter,
                ).order_by(Student.last_name, Student.first_name)
            )
        else:
            # Fallback: use direct teacher_id if no enrollments exist yet
            students_result = await db.execute(
                select(Student).where(
                    Student.teacher_id == teacher_id,
                    *grade_filter,
                ).order_by(Student.last_name, Student.first_name)
            )
    else:
        # No year filter — show all students linked to this teacher
        students_result = await db.execute(
            select(Student).where(
                Student.teacher_id == teacher_id,
                *grade_filter,
            ).order_by(Student.last_name, Student.first_name)
        )
    students = students_result.scalars().all()

    # Decrypt PII
    for s in students:
        d = s.__dict__
        if d.get("first_name"):
            d["first_name"] = decrypt(d["first_name"])
        if d.get("last_name"):
            d["last_name"] = decrypt(d["last_name"])
        if d.get("lrn"):
            d["lrn"] = decrypt(d["lrn"])

    # Batch-fetch sessions with results + observations + passages (no N+1)
    student_ids = [s.id for s in students]
    session_query = (
        select(AssessmentSession)
        .options(
            selectinload(AssessmentSession.reading_result),
            selectinload(AssessmentSession.observation),
            selectinload(AssessmentSession.passage),
        )
        .where(AssessmentSession.student_id.in_(student_ids))
        .order_by(AssessmentSession.created_at.desc())
    )
    if school_year:
        session_query = session_query.where(AssessmentSession.school_year == school_year)
    if period:
        session_query = session_query.where(AssessmentSession.period == period)
    if language:
        session_query = session_query.where(AssessmentSession.language == language)

    sessions_result = await db.execute(session_query)
    all_sessions = sessions_result.scalars().all()

    # Build map: student_id -> most recent session (already ordered desc)
    session_map = {}
    for sess in all_sessions:
        if sess.student_id not in session_map:
            session_map[sess.student_id] = sess

    # Build response
    student_records = []
    for student in students:
        session = session_map.get(student.id)
        rr = session.reading_result if session else None
        obs = session.observation if session else None
        passage = session.passage if session else None

        student_records.append({
            "student_id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "grade_level": student.grade_level.value if student.grade_level else None,
            "section": student.section,
            "lrn": student.lrn,
            "sex": student.sex.value if student.sex else None,
            "session_date": session.created_at.isoformat() if session else None,
            "passage_title": passage.title if passage else None,
            "reading_profile": rr.reading_profile if rr else None,
            # Full reading result
            "reading_result": {
                "total_words": rr.total_words,
                "miscue_count": rr.miscue_count,
                "cwpm": rr.cwpm,
                "reading_time_seconds": rr.reading_time_seconds,
                "reading_profile": rr.reading_profile,
                "part1_task1_correct": rr.part1_task1_correct,
                "part1_task2_correct": rr.part1_task2_correct,
                "part1_total_score": rr.part1_total_score,
                "part1_classification": rr.part1_classification,
                "part1_route": rr.part1_route,
            } if rr else None,
            # Full observation
            "observation": {
                "comprehension_correct": obs.comprehension_correct,
                "comprehension_total": obs.comprehension_total,
                "fluency_level": obs.fluency_level,
                "learner_experience": obs.learner_experience,
                "teacher_remarks": obs.teacher_remarks,
            } if obs else None,
        })

    return {
        "teacher_id": teacher.id,
        "teacher_name": f"{teacher_first} {teacher_last}",
        "grade_level": teacher.grade_level.value if teacher.grade_level else None,
        "section": teacher.section,
        "students": student_records,
    }


# Teacher Assignments
@router.get("/assignments", summary="List all teacher assignments for the school")
async def list_assignments(
    school_year: Optional[str] = Query(None),
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(TeacherAssignment)
        .where(TeacherAssignment.school_id == current_admin.school_id)
        .order_by(TeacherAssignment.grade_level, TeacherAssignment.section)
    )
    if school_year:
        query = query.where(TeacherAssignment.school_year == school_year)

    result = await db.execute(query)
    assignments = result.scalars().all()

    # Batch-fetch teacher names (fix N+1)
    teacher_ids = list({a.teacher_id for a in assignments})
    teacher_result = await db.execute(
        select(Teacher).where(Teacher.id.in_(teacher_ids))
    )
    teachers_by_id = {t.id: t for t in teacher_result.scalars().all()}

    response = []
    for a in assignments:
        t = teachers_by_id.get(a.teacher_id)
        if t:
            t_first = decrypt(t.first_name) if t.first_name else ""
            t_last = decrypt(t.last_name) if t.last_name else ""
            t_name = f"{t_first} {t_last}"
        else:
            t_name = None
        response.append({
            "id": a.id,
            "teacher_id": a.teacher_id,
            "school_id": a.school_id,
            "grade_level": a.grade_level.value if a.grade_level else None,
            "section": a.section,
            "school_year": a.school_year,
            "is_active": a.is_active,
            "created_at": a.created_at,
            "teacher_name": t_name,
        })
    return response


@router.post("/assignments", status_code=status.HTTP_201_CREATED, summary="Assign a teacher to a grade + section")
async def create_assignment(
    payload: TeacherAssignmentCreate,
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Verify teacher belongs to admin's school
    teacher_result = await db.execute(
        select(Teacher).where(
            Teacher.id == payload.teacher_id,
            Teacher.school_id == current_admin.school_id,
        )
    )
    teacher = teacher_result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found in your school")

    # Check for existing active assignment in the same school year
    existing_result = await db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == payload.teacher_id,
            TeacherAssignment.school_year == payload.school_year,
            TeacherAssignment.is_active == True,
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Teacher already has an active assignment for {payload.school_year}. "
                   f"Update or deactivate the existing one first.",
        )

    assignment = TeacherAssignment(
        teacher_id=payload.teacher_id,
        school_id=current_admin.school_id,
        grade_level=payload.grade_level,
        section=payload.section,
        school_year=payload.school_year,
        is_active=True,
    )
    db.add(assignment)

    # Sync the teacher's convenience columns
    teacher.grade_level = payload.grade_level
    teacher.section = payload.section

    await db.commit()
    await db.refresh(assignment)
    t_first = decrypt(teacher.first_name) if teacher.first_name else ""
    t_last = decrypt(teacher.last_name) if teacher.last_name else ""
    return {
        "id": assignment.id,
        "teacher_id": assignment.teacher_id,
        "school_id": assignment.school_id,
        "grade_level": assignment.grade_level.value if assignment.grade_level else None,
        "section": assignment.section,
        "school_year": assignment.school_year,
        "is_active": assignment.is_active,
        "created_at": assignment.created_at,
        "teacher_name": f"{t_first} {t_last}",
    }


@router.patch("/assignments/{assignment_id}", summary="Update a teacher assignment")
async def update_assignment(
    assignment_id: int,
    payload: TeacherAssignmentUpdate,
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.id == assignment_id,
            TeacherAssignment.school_id == current_admin.school_id,
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if payload.grade_level is not None:
        assignment.grade_level = payload.grade_level
    if payload.section is not None:
        assignment.section = payload.section
    if payload.school_year is not None:
        assignment.school_year = payload.school_year
    if payload.is_active is not None:
        assignment.is_active = payload.is_active

    # Sync the teacher's convenience columns if this is the active assignment
    if assignment.is_active:
        teacher_result = await db.execute(
            select(Teacher).where(Teacher.id == assignment.teacher_id)
        )
        teacher = teacher_result.scalar_one_or_none()
        if teacher:
            teacher.grade_level = assignment.grade_level
            teacher.section = assignment.section

    await db.commit()
    await db.refresh(assignment)
    return assignment


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a teacher assignment")
async def delete_assignment(
    assignment_id: int,
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.id == assignment_id,
            TeacherAssignment.school_id == current_admin.school_id,
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    await db.delete(assignment)
    await db.commit()


# Public Passage Management
@router.get("/passages", summary="List all public passages for admin's school")
async def list_public_passages(
    language: Optional[str] = Query(None),
    grade_level: Optional[str] = Query(None),
    assessment_type: Optional[int] = Query(None),
    include_archived: bool = Query(False),
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all public passages visible to the admin. Excludes original public
    passages if they have been overridden (cloned) by this admin's school.
    """
    from app.models import PassageVisibility, Teacher
    from sqlalchemy import select, or_, and_

    school_id = current_admin.school_id

    # Subquery to find all original_passage_id overrides created in this school
    override_subquery = (
        select(Passage.original_passage_id)
        .join(Teacher, Teacher.id == Passage.teacher_id)
        .where(
            Passage.visibility == PassageVisibility.public,
            Passage.original_passage_id.is_not(None),
            Teacher.school_id == school_id,
        )
    )

    query = (
        select(Passage)
        .where(
            Passage.visibility == PassageVisibility.public,
            or_(
                # Show global public passages that have not been overridden
                and_(
                    Passage.original_passage_id.is_(None),
                    Passage.id.not_in(override_subquery),
                ),
                # Show local overrides for this school
                and_(
                    Passage.original_passage_id.is_not(None),
                    Passage.teacher_id.in_(
                        select(Teacher.id).where(Teacher.school_id == school_id)
                    ),
                ),
            ),
        )
        .order_by(Passage.grade_level, Passage.language, Passage.title)
    )
    if language:
        query = query.where(Passage.language == language)
    if grade_level:
        query = query.where(Passage.grade_level == grade_level)
    if assessment_type is not None:
        query = query.where(Passage.assessment_type == assessment_type)
    if not include_archived:
        query = query.where(Passage.is_archived == False)

    result = await db.execute(query)
    passages = result.scalars().all()
    return passages


@router.post("/passages", status_code=status.HTTP_201_CREATED, summary="Create a public passage")
async def create_public_passage(
    payload: dict,
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new public passage.
    """
    from app.models import PassageVisibility, Question
    from sqlalchemy import select

    # Compute word count from content
    content = payload.get("content", "") or ""
    word_count = len(content.split()) if content.strip() else 0

    passage = Passage(
        teacher_id=current_admin.id,
        title=payload.get("title"),
        content=content if content.strip() else None,
        language=payload.get("language", "filipino"),
        grade_level=payload.get("grade_level"),
        word_count=word_count,
        visibility=PassageVisibility.public,
        assessment_type=payload.get("assessment_type", 2),
        task1_content=payload.get("task1_content"),
        task2_words=payload.get("task2_words"),
        task2_sentences=payload.get("task2_sentences"),
    )
    db.add(passage)
    await db.commit()
    await db.refresh(passage)

    # Save questions inline if provided
    questions_data = payload.get("questions", [])
    if questions_data:
        db_questions = [
            Question(
                passage_id=passage.id,
                text=q["text"],
                answer_key=q.get("answer_key"),
                order=q.get("order", 0)
            )
            for q in questions_data
        ]
        db.add_all(db_questions)
        await db.commit()

    return passage


@router.patch("/passages/{passage_id}", summary="Update a public passage")
async def update_public_passage(
    passage_id: int,
    payload: dict,
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates a public passage. If the passage belongs to a different school,
    clones it and all of its questions for the local school to preserve privacy.
    """
    from app.models import PassageVisibility, Teacher, Question
    from sqlalchemy import select

    result = await db.execute(
        select(Passage).where(
            Passage.id == passage_id,
            Passage.visibility == PassageVisibility.public,
        )
    )
    passage = result.scalar_one_or_none()
    if not passage:
        raise HTTPException(status_code=404, detail="Public passage not found")

    # Check if the creator belongs to a different school
    creator_result = await db.execute(select(Teacher).where(Teacher.id == passage.teacher_id))
    creator = creator_result.scalar_one_or_none()
    is_different_school = creator and creator.school_id is not None and creator.school_id != current_admin.school_id

    if is_different_school:
        # Clone-on-write!
        content = payload.get("content", passage.content) or ""
        word_count = len(content.split()) if content.strip() else 0

        cloned_passage = Passage(
            teacher_id=current_admin.id,
            title=payload.get("title", passage.title),
            content=content if content.strip() else None,
            language=payload.get("language", passage.language),
            grade_level=payload.get("grade_level", passage.grade_level),
            word_count=word_count,
            visibility=PassageVisibility.public,
            assessment_type=payload.get("assessment_type", passage.assessment_type),
            task1_content=payload.get("task1_content", passage.task1_content),
            task2_words=payload.get("task2_words", passage.task2_words),
            task2_sentences=payload.get("task2_sentences", passage.task2_sentences),
            file_path=passage.file_path,
            original_passage_id=passage.id,
        )
        db.add(cloned_passage)
        await db.commit()
        await db.refresh(cloned_passage)

        # Clone and update questions inline
        questions_data = payload.get("questions", [])
        if questions_data:
            db_questions = [
                Question(
                    passage_id=cloned_passage.id,
                    text=q["text"],
                    answer_key=q.get("answer_key"),
                    order=q.get("order", 0)
                )
                for q in questions_data
            ]
            db.add_all(db_questions)
            await db.commit()
        else:
            # If no questions in payload, clone original questions
            orig_qs_result = await db.execute(
                select(Question).where(
                    Question.passage_id == passage.id,
                    Question.is_archived == False
                )
            )
            orig_qs = orig_qs_result.scalars().all()
            cloned_qs = [
                Question(
                    passage_id=cloned_passage.id,
                    text=oq.text,
                    answer_key=oq.answer_key,
                    order=oq.order
                )
                for oq in orig_qs
            ]
            if cloned_qs:
                db.add_all(cloned_qs)
                await db.commit()

        return cloned_passage

    else:
        # Update directly (same school)
        for field in ["title", "content", "language", "grade_level",
                       "assessment_type", "task1_content", "task2_words", "task2_sentences"]:
            if field in payload:
                setattr(passage, field, payload[field])

        if "content" in payload:
            content = payload["content"] or ""
            passage.word_count = len(content.split()) if content.strip() else 0

        # Sync questions inline
        if "questions" in payload:
            q_result = await db.execute(
                select(Question).where(
                    Question.passage_id == passage.id,
                    Question.is_archived == False
                )
            )
            existing_qs = {q.id: q for q in q_result.scalars().all()}
            
            payload_qs = payload["questions"]
            keep_ids = {q["id"] for q in payload_qs if q.get("id") is not None}

            # Archive removed questions
            for eq_id, eq in existing_qs.items():
                if eq_id not in keep_ids:
                    eq.is_archived = True

            # Create or update remaining questions
            for q in payload_qs:
                q_id = q.get("id")
                if q_id is not None and q_id in existing_qs:
                    existing_qs[q_id].text = q["text"]
                    existing_qs[q_id].answer_key = q.get("answer_key")
                    existing_qs[q_id].order = q.get("order", 0)
                else:
                    new_q = Question(
                        passage_id=passage.id,
                        text=q["text"],
                        answer_key=q.get("answer_key"),
                        order=q.get("order", 0)
                    )
                    db.add(new_q)

        await db.commit()
        await db.refresh(passage)
        return passage


@router.delete("/passages/{passage_id}", summary="Archive a public passage")
async def archive_public_passage(
    passage_id: int,
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models import PassageVisibility

    result = await db.execute(
        select(Passage).where(
            Passage.id == passage_id,
            Passage.visibility == PassageVisibility.public,
        )
    )
    passage = result.scalar_one_or_none()
    if not passage:
        raise HTTPException(status_code=404, detail="Public passage not found")

    passage.is_archived = True
    await db.commit()
    return {"detail": "Passage archived successfully"}


@router.post("/passages/{passage_id}/file", status_code=status.HTTP_200_OK, summary="Upload the original passage file to R2 storage (admin)")
async def admin_upload_passage_file(
    passage_id: int,
    file: UploadFile = File(...),
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.services import storage_service
    result = await db.execute(select(Passage).where(Passage.id == passage_id))
    passage = result.scalar_one_or_none()
    if not passage:
        raise HTTPException(status_code=404, detail="Passage not found")
    file_bytes = await file.read()
    r2_key = await storage_service.upload_passage_file(
        file_bytes, file.filename or "passage", str(current_admin.id)
    )
    passage.file_path = r2_key
    await db.commit()
    return {"file_path": r2_key}


# Student Reassignment
class ReassignStudentsRequest(BaseModel):
    from_teacher_id: int
    grade_level: str
    section: str
    to_teacher_id: int


@router.post("/students/reassign", summary="Reassign a class of students to a different teacher")
async def reassign_students(
    payload: ReassignStudentsRequest,
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Validate both teachers belong to admin's school
    for tid in [payload.from_teacher_id, payload.to_teacher_id]:
        res = await db.execute(
            select(Teacher).where(
                Teacher.id == tid,
                Teacher.school_id == current_admin.school_id,
            )
        )
        if not res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail=f"Teacher {tid} not found in your school")

    grade = GradeLevel(payload.grade_level)
    await db.execute(
        update(Student)
        .where(
            Student.teacher_id == payload.from_teacher_id,
            Student.grade_level == grade,
            Student.section == payload.section,
        )
        .values(teacher_id=payload.to_teacher_id)
    )
    await db.commit()
    return {"detail": "Students reassigned successfully"}
