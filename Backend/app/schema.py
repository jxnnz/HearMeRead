import re
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models import AssessmentPeriod, GradeLevel, Language


_SCHOOL_YEAR_RE = re.compile(r"^\d{4}-\d{4}$")


# ── Teacher / Auth ────────────────────────────────────────────────────────────

class TeacherRegister(BaseModel):
    first_name: str      = Field(..., min_length=1, max_length=75)
    last_name:  str      = Field(..., min_length=1, max_length=75)
    email:      EmailStr
    password:   str      = Field(..., min_length=9, max_length=128)

    @field_validator("first_name", "last_name")
    @classmethod
    def no_special_chars(cls, v: str) -> str:
        if not re.match(r"^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$", v.strip()):
            raise ValueError("Name contains invalid characters")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 9:
            raise ValueError("Password must be at least 9 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?`~]", v):
            raise ValueError("Password must contain at least one symbol (e.g. !@#$%)")
        return v


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class TeacherResponse(BaseModel):
    id:         int
    first_name: str
    last_name:  str
    email:      str

    class Config:
        from_attributes = True


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

class PassageCreate(BaseModel):
    language:        Language
    # Assessment 2 fields (required when assessment_type = 2)
    title:           Optional[str]        = Field(None, max_length=255)
    content:         Optional[str]        = None
    grade_level:     Optional[GradeLevel] = None
    # Assessment 1 fields (required when assessment_type = 1)
    task1_content:   Optional[str]        = None
    task2_words:     Optional[str]        = None
    task2_sentences: Optional[str]        = None
    # Shared
    assessment_type: Optional[int]        = Field(None, ge=1, le=2)


class PassageUpdate(BaseModel):
    title:           Optional[str]        = Field(None, max_length=255)
    content:         Optional[str]        = None
    language:        Optional[Language]   = None
    grade_level:     Optional[GradeLevel] = None
    assessment_type: Optional[int]        = Field(None, ge=1, le=2)
    task1_content:   Optional[str]        = None
    task2_words:     Optional[str]        = None
    task2_sentences: Optional[str]        = None


class PassageResponse(BaseModel):
    id:              int
    teacher_id:      int
    language:        Language
    word_count:      int
    is_archived:     bool
    assessment_type: Optional[int]        = None
    title:           Optional[str]        = None
    content:         Optional[str]        = None
    grade_level:     Optional[GradeLevel] = None
    task1_content:   Optional[str]        = None
    task2_words:     Optional[str]        = None
    task2_sentences: Optional[str]        = None
    created_at:      datetime
    updated_at:      datetime
    questions:       List[QuestionResponse] = []

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
        max_length=12,
        examples=["123456789012"],
        description="12-digit Learner Reference Number",
    )

    @field_validator("lrn")
    @classmethod
    def validate_lrn(cls, v: Optional[str]) -> Optional[str]:
        if v == "" or v is None:
            return None
        if len(v) != 12 or not v.isdigit():
            raise ValueError("LRN must be exactly 12 digits")
        return v


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


# ── Reading Result ────────────────────────────────────────────────────────────

class ReadingResultResponse(BaseModel):
    session_id:           int
    reading_time_seconds: Optional[float]
    total_words:          Optional[int]
    miscue_count:         Optional[int]
    cwpm:                 Optional[float]
    created_at:           datetime
    updated_at:           Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Session Observation ───────────────────────────────────────────────────────

class SessionObservationResponse(BaseModel):
    session_id:            int
    comprehension_correct: Optional[int]
    comprehension_total:   Optional[int]
    fluency_level:         Optional[int]
    learner_experience:    Optional[int]
    teacher_remarks:       Optional[str]
    created_at:            datetime
    updated_at:            Optional[datetime] = None

    class Config:
        from_attributes = True


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
    school_year: str      = Field(..., examples=["2024-2025"])
    period:      AssessmentPeriod
    language:    Language = Field(Language.filipino, examples=[Language.filipino])

    @field_validator("school_year")
    @classmethod
    def validate_school_year(cls, v: str) -> str:
        return _validate_school_year(v)


class SessionComplete(BaseModel):
    """
    Submitted in two logical parts — both sent together when the teacher
    finishes the full assessment flow.

    reading_result  → persisted to reading_results table
    observation     → persisted to session_observations table
    """
    # reading_results
    reading_time_seconds:  float = Field(..., gt=0)
    total_words:           int   = Field(..., gt=0)
    miscue_count:          int   = Field(0, ge=0)

    # session_observations
    comprehension_correct: int           = Field(..., ge=0)
    comprehension_total:   int           = Field(..., gt=0)
    fluency_level:         int           = Field(..., ge=1, le=4)
    learner_experience:    int           = Field(..., ge=1, le=5)
    teacher_remarks:       Optional[str] = Field(None, max_length=1000)


class SessionUpdate(BaseModel):
    school_year: Optional[str]              = Field(None, examples=["2024-2025"])
    period:      Optional[AssessmentPeriod] = None
    language:    Optional[Language]         = None

    @field_validator("school_year")
    @classmethod
    def validate_school_year(cls, v: Optional[str]) -> Optional[str]:
        return _validate_school_year(v)


class SessionResponse(BaseModel):
    id:          int
    teacher_id:  int
    student_id:  int
    passage_id:  int
    school_year: str
    period:      AssessmentPeriod
    language:    Language
    is_completed: bool
    is_archived:  bool
    created_at:   datetime
    updated_at:   datetime

    # Nested child tables — None until the teacher completes those steps
    reading_result: Optional[ReadingResultResponse]      = None
    observation:    Optional[SessionObservationResponse] = None

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