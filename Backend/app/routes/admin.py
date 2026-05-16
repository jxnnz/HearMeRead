from typing import Optional, List
import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.dependencies import require_admin
from app.core.encryption import decrypt
from app.models import (
    Teacher, School, Student, AssessmentSession,
    ReadingResult, SessionObservation, Passage,
    ActivityLog, UserRole, GradeLevel,
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
        teacher.employee_id = payload.employee_id

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
    Returns a list of teachers (with grade_level, section, and student_count).
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

    # Batch-fetch student counts per teacher
    teacher_ids = [t.id for t in teachers]
    count_result = await db.execute(
        select(Student.teacher_id, func.count(Student.id))
        .where(Student.teacher_id.in_(teacher_ids))
        .group_by(Student.teacher_id)
    )
    count_map = {row[0]: row[1] for row in count_result}

    cards = []
    for t in teachers:
        first = decrypt(t.first_name) if t.first_name else ""
        last = decrypt(t.last_name) if t.last_name else ""
        cards.append({
            "teacher_id": t.id,
            "teacher_name": f"{first} {last}",
            "grade_level": t.grade_level.value if t.grade_level else None,
            "section": t.section,
            "student_count": count_map.get(t.id, 0),
        })
    return cards


@router.get("/students/{teacher_id}", summary="Student class record for a specific teacher")
async def get_teacher_class_record(
    teacher_id: int,
    school_year: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all students under the given teacher with full reading_result,
    observation, session_date, and passage_title for the admin class record view.
    Filtered by school_year, period, and language if provided.
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
                ).order_by(Student.last_name, Student.first_name)
            )
        else:
            # Fallback: use direct teacher_id if no enrollments exist yet
            students_result = await db.execute(
                select(Student).where(
                    Student.teacher_id == teacher_id,
                ).order_by(Student.last_name, Student.first_name)
            )
    else:
        # No year filter — show all students linked to this teacher
        students_result = await db.execute(
            select(Student).where(
                Student.teacher_id == teacher_id,
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


# ── Teacher Assignments ───────────────────────────────────────────────────────

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


# ── Public Passage Management ─────────────────────────────────────────────────

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
    Returns all public passages. Admin can filter by language, grade, and type.
    """
    from app.models import PassageVisibility

    query = (
        select(Passage)
        .where(Passage.visibility == PassageVisibility.public)
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
    Creates a new public passage visible to all teachers in the school.
    """
    from app.models import PassageVisibility

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
    return passage


@router.patch("/passages/{passage_id}", summary="Update a public passage")
async def update_public_passage(
    passage_id: int,
    payload: dict,
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

    for field in ["title", "content", "language", "grade_level",
                   "assessment_type", "task1_content", "task2_words", "task2_sentences"]:
        if field in payload:
            setattr(passage, field, payload[field])

    # Recompute word count
    if "content" in payload:
        content = payload["content"] or ""
        passage.word_count = len(content.split()) if content.strip() else 0

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
