from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.dependencies import require_admin
from app.models import Teacher, School
from app.schema import AdminDashboardResponse, TeacherResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get(
    "/dashboard",
    response_model=AdminDashboardResponse,
    summary="Get admin dashboard — school info and teacher list",
)
async def admin_dashboard(
    current_admin: Teacher = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Teacher).where(
            Teacher.school_id == current_admin.school_id,
            Teacher.id != current_admin.id,
        )
    )
    teachers = result.scalars().all()

    # Fetch school separately to avoid lazy-load in async context
    school_result = await db.execute(
        select(School).where(School.id == current_admin.school_id)
    )
    school = school_result.scalar_one_or_none()

    teacher_responses = [
        TeacherResponse(
            id=t.id,
            first_name=t.first_name,
            last_name=t.last_name,
            email=t.email,
            role=t.role,
            school_id=t.school_id,
            school_code=None,
            is_verified=t.is_verified,
        )
        for t in teachers
    ]

    return AdminDashboardResponse(
        school_code=school.school_code,
        school_name=school.name,
        teachers=teacher_responses,
    )
