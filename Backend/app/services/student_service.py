from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from fastapi import HTTPException, status

from app.models import Student, AssessmentSession, ReadingResult
from app.schema import StudentCreate, StudentUpdate


async def _inject_profile_and_count(db: AsyncSession, students: list) -> None:
    if not students:
        return
    ids = [s.id for s in students]

    count_rows = await db.execute(
        select(AssessmentSession.student_id, func.count(AssessmentSession.id).label("cnt"))
        .where(AssessmentSession.student_id.in_(ids), AssessmentSession.is_archived == False)
        .group_by(AssessmentSession.student_id)
    )
    count_map = {row.student_id: row.cnt for row in count_rows}

    profile_rows = await db.execute(
        select(AssessmentSession.student_id, ReadingResult.reading_profile)
        .join(ReadingResult, ReadingResult.session_id == AssessmentSession.id)
        .where(
            AssessmentSession.student_id.in_(ids),
            AssessmentSession.is_completed == True,
            ReadingResult.reading_profile.isnot(None),
        )
        .order_by(AssessmentSession.student_id, AssessmentSession.created_at.desc())
    )
    profile_map: dict = {}
    for row in profile_rows:
        if row.student_id not in profile_map:
            profile_map[row.student_id] = row.reading_profile

    for s in students:
        s.__dict__["reading_profile"] = profile_map.get(s.id)
        s.__dict__["session_count"]   = count_map.get(s.id, 0)


async def get_students(
    db: AsyncSession,
    teacher_id: int,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    grade_level: Optional[str] = None,
    section: Optional[str] = None,
):
    query = select(Student).where(Student.teacher_id == teacher_id)

    if search:
        term = f"%{search.lower()}%"
        query = query.where(
            or_(Student.first_name.ilike(term), Student.last_name.ilike(term))
        )

    if grade_level:
        query = query.where(Student.grade_level == grade_level)

    if section is not None:
        if section == "":
            query = query.where(or_(Student.section == None, Student.section == ""))
        else:
            query = query.where(Student.section == section)

    # Total count
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    # Paginated results
    query = (
        query.order_by(Student.last_name, Student.first_name)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    students = list(result.scalars().all())
    await _inject_profile_and_count(db, students)

    return total, students


async def get_class_summaries(db: AsyncSession, teacher_id: int):
    query = (
        select(
            Student.grade_level,
            Student.section,
            func.count(Student.id).label("student_count")
        )
        .where(Student.teacher_id == teacher_id)
        .group_by(Student.grade_level, Student.section)
        .order_by(Student.grade_level, Student.section)
    )
    result = await db.execute(query)
    
    classes = []
    for row in result:
        classes.append({
            "grade_level": row.grade_level,
            "section": row.section if row.section else "No Section",
            "student_count": row.student_count
        })
    return classes


async def get_student_by_id(db: AsyncSession, student_id: int, teacher_id: int) -> Student:
    result = await db.execute(
        select(Student).where(Student.id == student_id, Student.teacher_id == teacher_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with id {student_id} not found",
        )
    await _inject_profile_and_count(db, [student])
    return student


async def create_student(db: AsyncSession, data: StudentCreate, teacher_id: int) -> Student:
    if data.lrn:
        existing = await db.execute(select(Student).where(Student.lrn == data.lrn))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A student with LRN {data.lrn} already exists",
            )

    student = Student(**data.model_dump(), teacher_id=teacher_id)
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


async def update_student(
    db: AsyncSession, student_id: int, data: StudentUpdate, teacher_id: int
) -> Student:
    student = await get_student_by_id(db, student_id, teacher_id)

    if data.lrn and data.lrn != student.lrn:
        existing = await db.execute(select(Student).where(Student.lrn == data.lrn))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A student with LRN {data.lrn} already exists",
            )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(student, field, value)

    await db.commit()
    await db.refresh(student)
    return student


async def delete_student(db: AsyncSession, student_id: int, teacher_id: int) -> None:
    student = await get_student_by_id(db, student_id, teacher_id)
    await db.delete(student)
    await db.commit()
