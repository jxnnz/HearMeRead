from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from fastapi import HTTPException, status

from app.models import Student, AssessmentSession, ReadingResult
from app.schema import StudentCreate, StudentUpdate
from app.core.encryption import encrypt, decrypt, hash_lrn


def _decrypt_student(s: Student) -> Student:
    """Decrypt PII fields on a student object in-place."""
    s.first_name = decrypt(s.first_name)
    s.last_name = decrypt(s.last_name)
    if s.lrn:
        s.lrn = decrypt(s.lrn)
    return s


def _encrypt_fields(data: dict) -> dict:
    """Return a copy of data with first_name, last_name, and lrn encrypted."""
    out = dict(data)
    if out.get("first_name"):
        out["first_name"] = encrypt(out["first_name"])
    if out.get("last_name"):
        out["last_name"] = encrypt(out["last_name"])
    lrn = out.get("lrn")
    if lrn:
        out["lrn_hash"] = hash_lrn(lrn)
        out["lrn"] = encrypt(lrn)
    else:
        out["lrn_hash"] = None
    return out


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

    # Non-encrypted fields can still be filtered in SQL
    if grade_level:
        query = query.where(Student.grade_level == grade_level)

    if section is not None:
        if section == "":
            query = query.where(or_(Student.section == None, Student.section == ""))
        else:
            query = query.where(Student.section == section)

    result = await db.execute(query)
    students = list(result.scalars().all())

    # Decrypt all PII fields
    for s in students:
        _decrypt_student(s)

    # Apply name search in Python (names are encrypted at DB level)
    if search:
        term = search.lower()
        students = [
            s for s in students
            if term in (s.first_name or "").lower() or term in (s.last_name or "").lower()
        ]

    # Sort by name (after decryption)
    students.sort(key=lambda s: ((s.last_name or "").lower(), (s.first_name or "").lower()))

    total = len(students)

    # Paginate in Python
    start = (page - 1) * page_size
    students = students[start:start + page_size]

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
    _decrypt_student(student)
    await _inject_profile_and_count(db, [student])
    return student


async def create_student(db: AsyncSession, data: StudentCreate, teacher_id: int) -> Student:
    if data.lrn:
        lrn_hash = hash_lrn(data.lrn)
        existing = await db.execute(select(Student).where(Student.lrn_hash == lrn_hash))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A student with LRN {data.lrn} already exists",
            )

    encrypted = _encrypt_fields(data.model_dump())
    student = Student(**encrypted, teacher_id=teacher_id)
    db.add(student)
    await db.commit()
    await db.refresh(student)
    _decrypt_student(student)
    return student


async def update_student(
    db: AsyncSession, student_id: int, data: StudentUpdate, teacher_id: int
) -> Student:
    student = await get_student_by_id(db, student_id, teacher_id)

    if data.lrn and data.lrn != student.lrn:
        lrn_hash = hash_lrn(data.lrn)
        existing = await db.execute(select(Student).where(Student.lrn_hash == lrn_hash))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A student with LRN {data.lrn} already exists",
            )

    update_data = data.model_dump(exclude_unset=True)
    encrypted = _encrypt_fields(update_data)
    for field, value in encrypted.items():
        setattr(student, field, value)

    await db.commit()
    await db.refresh(student)
    _decrypt_student(student)
    return student


async def delete_student(db: AsyncSession, student_id: int, teacher_id: int) -> None:
    # get_student_by_id decrypts, but we only need the ORM object to delete
    result = await db.execute(
        select(Student).where(Student.id == student_id, Student.teacher_id == teacher_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with id {student_id} not found",
        )
    await db.delete(student)
    await db.commit()
