from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from fastapi import HTTPException, status

from app.models.student import Student
from app.schemas.student import StudentCreate, StudentUpdate


async def get_students(
    db: AsyncSession,
    teacher_id: int,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    grade_level: Optional[str] = None,
):
    query = select(Student).where(Student.teacher_id == teacher_id)

    if search:
        term = f"%{search.lower()}%"
        query = query.where(
            or_(Student.first_name.ilike(term), Student.last_name.ilike(term))
        )

    if grade_level:
        query = query.where(Student.grade_level == grade_level)

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
    students = result.scalars().all()

    return total, students


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
