from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.student import Student
from app.schemas.student import StudentCreate, StudentUpdate


def get_students(
    db: Session,
    teacher_id: int,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    grade_level: Optional[str] = None,
):
    """
    Return a paginated list of students belonging to a teacher.
    Optionally filter by name search or grade level.
    """
    query = db.query(Student).filter(Student.teacher_id == teacher_id)

    if search:
        term = f"%{search.lower()}%"
        query = query.filter(
            (Student.first_name.ilike(term)) | (Student.last_name.ilike(term))
        )

    if grade_level:
        query = query.filter(Student.grade_level == grade_level)

    total = query.count()
    students = (
        query.order_by(Student.last_name, Student.first_name)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return total, students


def get_student_by_id(db: Session, student_id: int, teacher_id: int) -> Student:
    """Fetch a single student, scoped to the requesting teacher."""
    student = (
        db.query(Student)
        .filter(Student.id == student_id, Student.teacher_id == teacher_id)
        .first()
    )
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with id {student_id} not found",
        )
    return student


def create_student(db: Session, data: StudentCreate, teacher_id: int) -> Student:
    """Create a new student record under the given teacher."""
    # Prevent duplicate LRN across the system (if provided)
    if data.lrn:
        existing = db.query(Student).filter(Student.lrn == data.lrn).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A student with LRN {data.lrn} already exists",
            )

    student = Student(**data.model_dump(), teacher_id=teacher_id)
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def update_student(
    db: Session, student_id: int, data: StudentUpdate, teacher_id: int
) -> Student:
    """Partially update a student record."""
    student = get_student_by_id(db, student_id, teacher_id)

    # Check LRN uniqueness if it's being changed
    if data.lrn and data.lrn != student.lrn:
        existing = db.query(Student).filter(Student.lrn == data.lrn).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A student with LRN {data.lrn} already exists",
            )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)

    db.commit()
    db.refresh(student)
    return student


def delete_student(db: Session, student_id: int, teacher_id: int) -> None:
    """Hard-delete a student record."""
    student = get_student_by_id(db, student_id, teacher_id)
    db.delete(student)
    db.commit()
