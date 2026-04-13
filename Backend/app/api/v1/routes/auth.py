from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
from datetime import timedelta

from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token
from app.db.session import get_db
from app.models.teacher import Teacher

router = APIRouter(prefix="/auth", tags=["Auth"])


# --------------------------------------------------------------------------- #
#  Schemas (kept here since they're auth-specific)                              #
# --------------------------------------------------------------------------- #

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


# --------------------------------------------------------------------------- #
#  Endpoints                                                                    #
# --------------------------------------------------------------------------- #

@router.post("/register", response_model=TeacherResponse, status_code=status.HTTP_201_CREATED)
def register(data: TeacherRegister, db: Session = Depends(get_db)):
    """Register a new teacher account."""
    existing = db.query(Teacher).filter(Teacher.email == data.email).first()
    if existing:
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
    db.commit()
    db.refresh(teacher)
    return teacher


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Login with email + password.
    Returns a JWT access token.
    OAuth2PasswordRequestForm sends credentials as form fields:
    `username` (we treat as email) and `password`.
    """
    teacher = db.query(Teacher).filter(Teacher.email == form_data.username).first()

    if not teacher or not verify_password(form_data.password, teacher.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not teacher.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    token = create_access_token(
        data={"sub": teacher.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(access_token=token)
