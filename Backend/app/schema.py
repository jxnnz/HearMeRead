import re
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from app.models import AssessmentPeriod, GradeLevel, Language


_SCHOOL_YEAR_RE = re.compile(r"^\d{4}-\d{4}$")


# ── Question ──────────────────────────────────────────────────────────────────

class QuestionBase(BaseModel):
    text:  str = Field(..., min_length=1, max_length=500)
    order: int = Field(0, ge=0)


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    text:  Optional[str] = Field(None, min_length=1, max_length=500)
    order: Optional[int] = Field(None, ge=0)


class QuestionResponse(QuestionBase):
    id:          int
    passage_id:  int
    is_archived: bool
    created_at:  datetime
    updated_at:  datetime

    class Config:
        from_attributes = True


# ── Passage ───────────────────────────────────────────────────────────────────

class PassageBase(BaseModel):
    title:       str = Field(..., min_length=1, max_length=255)
    content:     str = Field(..., min_length=1)
    language:    Language
    grade_level: GradeLevel


class PassageCreate(PassageBase):
    pass


class PassageUpdate(BaseModel):
    title:       Optional[str]        = Field(None, min_length=1, max_length=255)
    content:     Optional[str]        = Field(None, min_length=1)
    language:    Optional[Language]   = None
    grade_level: Optional[GradeLevel] = None


class PassageResponse(PassageBase):
    id:          int
    teacher_id:  int
    word_count:  int
    is_archived: bool
    created_at:  datetime
    updated_at:  datetime
    questions:   List[QuestionResponse] = []

    class Config:
        from_attributes = True


class PassageListResponse(BaseModel):
    total:     int
    page:      int
    page_size: int
    passages:  List[PassageResponse]


# ── Student ───────────────────────────────────────────────────────────────────

class StudentBase(BaseModel):
    first_name:  str           = Field(..., min_length=1, max_length=100, examples=["Maria"])
    last_name:   str           = Field(..., min_length=1, max_length=100, examples=["Santos"])
    grade_level: GradeLevel    = Field(..., examples=[GradeLevel.GRADE_3])
    section:     Optional[str] = Field(None, max_length=100, examples=["Sampaguita"])
    lrn:         Optional[str] = Field(
        None,
        min_length=12,
        max_length=12,
        pattern=r"^\d{12}$",
        examples=["123456789012"],
        description="12-digit Learner Reference Number",
    )


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    first_name:  Optional[str]        = Field(None, min_length=1, max_length=100)
    last_name:   Optional[str]        = Field(None, min_length=1, max_length=100)
    grade_level: Optional[GradeLevel] = None
    section:     Optional[str]        = Field(None, max_length=100)
    lrn:         Optional[str]        = Field(None, min_length=12, max_length=12, pattern=r"^\d{12}$")


class StudentResponse(StudentBase):
    id:         int
    teacher_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StudentListResponse(BaseModel):
    total:     int
    page:      int
    page_size: int
    students:  List[StudentResponse]


# ── Assessment Session ────────────────────────────────────────────────────────

def _validate_school_year(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    if not _SCHOOL_YEAR_RE.match(v):
        raise ValueError("school_year must be in YYYY-YYYY format (e.g. 2024-2025)")
    start, end = v.split("-")
    if int(end) != int(start) + 1:
        raise ValueError("End year must be exactly one year after start year")
    return v


class SessionCreate(BaseModel):
    student_id:  int
    passage_id:  int
    school_year: str = Field(..., examples=["2024-2025"])
    period:      AssessmentPeriod

    @field_validator("school_year")
    @classmethod
    def validate_school_year(cls, v: str) -> str:
        return _validate_school_year(v)


class SessionComplete(BaseModel):
    reading_time_seconds:  float         = Field(..., gt=0)
    total_words:           int           = Field(..., gt=0)
    miscue_count:          int           = Field(0, ge=0)
    comprehension_correct: int           = Field(..., ge=0)
    comprehension_total:   int           = Field(..., gt=0)
    fluency_level:         int           = Field(..., ge=1, le=4)
    learner_experience:    int           = Field(..., ge=1, le=5)
    teacher_remarks:       Optional[str] = Field(None, max_length=1000)


class SessionUpdate(BaseModel):
    school_year:           Optional[str]              = Field(None, examples=["2024-2025"])
    period:                Optional[AssessmentPeriod] = None
    reading_time_seconds:  Optional[float]            = Field(None, gt=0)
    total_words:           Optional[int]              = Field(None, gt=0)
    miscue_count:          Optional[int]              = Field(None, ge=0)
    comprehension_correct: Optional[int]              = Field(None, ge=0)
    comprehension_total:   Optional[int]              = Field(None, gt=0)
    fluency_level:         Optional[int]              = Field(None, ge=1, le=4)
    learner_experience:    Optional[int]              = Field(None, ge=1, le=5)
    teacher_remarks:       Optional[str]              = Field(None, max_length=1000)

    @field_validator("school_year")
    @classmethod
    def validate_school_year(cls, v: Optional[str]) -> Optional[str]:
        return _validate_school_year(v)


class SessionResponse(BaseModel):
    id:                    int
    teacher_id:            int
    student_id:            int
    passage_id:            int
    school_year:           str
    period:                AssessmentPeriod
    reading_time_seconds:  Optional[float]
    total_words:           Optional[int]
    miscue_count:          Optional[int]
    cwpm:                  Optional[float]
    comprehension_correct: Optional[int]
    comprehension_total:   Optional[int]
    fluency_level:         Optional[int]
    learner_experience:    Optional[int]
    teacher_remarks:       Optional[str]
    is_completed:          bool
    is_archived:           bool
    created_at:            datetime
    updated_at:            datetime

    class Config:
        from_attributes = True


class SessionListResponse(BaseModel):
    total:     int
    page:      int
    page_size: int
    sessions:  List[SessionResponse]


class DuplicateWarning(BaseModel):
    warning:     str
    existing_id: int
    session:     SessionResponse