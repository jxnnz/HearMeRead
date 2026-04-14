from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, Field
from datetime import timedelta

from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token
from app.db.session import get_db
from app.models.teacher import Teacher

router = APIRouter(prefix="/auth", tags=["Auth"])


class TeacherRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TeacherResponse(BaseModel):
    id: int
    full_name: str
    email: str

    class Config:
        from_attributes = True


@router.post("/register", response_model=TeacherResponse, status_code=status.HTTP_201_CREATED)
async def register(data: TeacherRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Teacher).where(Teacher.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    teacher = Teacher(
        full_name=data.full_name,
        email=data.email,
        hashed_password=get_password_hash(data.password),
    )
    db.add(teacher)
    await db.commit()
    await db.refresh(teacher)
    return teacher


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Teacher).where(Teacher.email == form_data.username))
    teacher = result.scalar_one_or_none()

    if not teacher or not verify_password(form_data.password, teacher.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not teacher.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    token = create_access_token(
        data={"sub": teacher.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(access_token=token)
