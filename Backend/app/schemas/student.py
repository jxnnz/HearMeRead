from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime

from app.models.student import GradeLevel


# --------------------------------------------------------------------------- #
#  Base — shared fields                                                         #
# --------------------------------------------------------------------------- #

class StudentBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100, examples=["Maria"])
    last_name: str = Field(..., min_length=1, max_length=100, examples=["Santos"])
    grade_level: GradeLevel = Field(..., examples=[GradeLevel.GRADE_3])
    section: Optional[str] = Field(None, max_length=100, examples=["Sampaguita"])
    lrn: Optional[str] = Field(
        None,
        min_length=12,
        max_length=12,
        pattern=r"^\d{12}$",
        examples=["123456789012"],
        description="12-digit Learner Reference Number",
    )


# --------------------------------------------------------------------------- #
#  Request schemas                                                              #
# --------------------------------------------------------------------------- #

class StudentCreate(StudentBase):
    """Payload to create a new student."""
    pass


class StudentUpdate(BaseModel):
    """Partial update — all fields optional."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    grade_level: Optional[GradeLevel] = None
    section: Optional[str] = Field(None, max_length=100)
    lrn: Optional[str] = Field(None, min_length=12, max_length=12, pattern=r"^\d{12}$")


# --------------------------------------------------------------------------- #
#  Response schemas                                                             #
# --------------------------------------------------------------------------- #

class StudentResponse(StudentBase):
    """Full student object returned by the API."""
    id: int
    teacher_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StudentListResponse(BaseModel):
    """Paginated list of students."""
    total: int
    page: int
    page_size: int
    students: list[StudentResponse]
