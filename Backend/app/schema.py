import re
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.models import AssessmentPeriod, GradeLevel, Language, PassageVisibility, Sex, UserRole


_SCHOOL_YEAR_RE = re.compile(r"^\d{4}-\d{4}$")


# Teacher / Auth
class TeacherRegister(BaseModel):
    first_name:       str           = Field(..., min_length=1, max_length=75)
    last_name:        str           = Field(..., min_length=1, max_length=75)
    email:            EmailStr
    password:         str           = Field(..., min_length=8, max_length=128)
    role:             UserRole      = Field(default=UserRole.teacher)
    deped_school_id:  Optional[str] = Field(None, max_length=20)
    school_name:      Optional[str] = Field(None, max_length=255)
    school_code:      Optional[str] = Field(None, min_length=8, max_length=8)
    employee_id:      Optional[str] = Field(None, max_length=7)
    agreed_to_terms:  bool          = Field(...)
    agreed_to_privacy: bool         = Field(...)

    @field_validator("first_name", "last_name")
    @classmethod
    def no_special_chars(cls, v: str) -> str:
        if not re.match(r"^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$", v.strip()):
            raise ValueError("Name contains invalid characters")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?`~]", v):
            raise ValueError("Password must contain at least one symbol (e.g. !@#$%)")
        return v

    @model_validator(mode="after")
    def check_role_fields(self) -> "TeacherRegister":
        if not self.agreed_to_terms:
            raise ValueError("You must agree to the Terms & Conditions")
        if not self.agreed_to_privacy:
            raise ValueError("You must agree to the Data Privacy Agreement")
        if self.role == UserRole.admin:
            if not self.school_name:
                raise ValueError("School name is required for admin registration")
            if not self.deped_school_id:
                raise ValueError("DepEd School ID is required for admin registration")
        return self


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str      = "bearer"
    role:         UserRole = UserRole.teacher


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token:        str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?`~]", v):
            raise ValueError("Password must contain at least one symbol (e.g. !@#$%)")
        return v


class TeacherResponse(BaseModel):
    id:          int
    first_name:  str
    last_name:   str
    email:       str
    role:        UserRole       = UserRole.teacher
    school_id:   Optional[int] = None
    school_code: Optional[str] = None
    school_name: Optional[str] = None
    deped_school_id: Optional[str] = None
    grade_level: Optional[GradeLevel] = None
    section:     Optional[str] = None
    is_verified: bool           = False
    profile_picture_url: Optional[str] = None
    employee_id: Optional[str] = None

    class Config:
        from_attributes = True


class SchoolLookupResponse(BaseModel):
    school_code:     str
    deped_school_id: Optional[str] = None
    name:            str

    class Config:
        from_attributes = True


class TeacherProfileUpdate(BaseModel):
    first_name:  Optional[str] = Field(None, min_length=1, max_length=75)
    last_name:   Optional[str] = Field(None, min_length=1, max_length=75)
    employee_id: Optional[str] = Field(None, max_length=7)
    profile_picture_url: Optional[str] = None

    @field_validator("first_name", "last_name")
    @classmethod
    def no_special_chars(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.match(r"^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$", v.strip()):
            raise ValueError("Name contains invalid characters")
        return v.strip()

    @field_validator("employee_id")
    @classmethod
    def validate_employee_id(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if not re.fullmatch(r"\d{7}", v):
            raise ValueError("Employee ID must be exactly 7 digits")
        return v


class ProfilePictureUrlResponse(BaseModel):
    presigned_url: str
    key: str


class AdminDashboardResponse(BaseModel):
    school_code: str
    school_name: str
    teachers:    List["TeacherResponse"] = []


# Question
class QuestionBase(BaseModel):
    text:       str            = Field(..., min_length=1, max_length=500)
    answer_key: Optional[str] = None
    order:      int            = Field(0, ge=0)


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    text:       Optional[str] = Field(None, min_length=1, max_length=500)
    answer_key: Optional[str] = None
    order:      Optional[int] = Field(None, ge=0)


class QuestionResponse(QuestionBase):
    id:          int
    passage_id:  int
    is_archived: bool
    created_at:  datetime
    updated_at:  datetime

    class Config:
        from_attributes = True


# Passage
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
    visibility:      PassageVisibility    = PassageVisibility.private
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


# Student
class StudentBase(BaseModel):
    first_name:  str           = Field(..., min_length=1, max_length=100, examples=["Maria"])
    last_name:   str           = Field(..., min_length=1, max_length=100, examples=["Santos"])
    grade_level: GradeLevel    = Field(..., examples=[GradeLevel.grade_3])
    section:     Optional[str] = Field(None, max_length=100, examples=["Sampaguita"])
    sex:         Optional[Sex] = Field(None, examples=[Sex.female])
    lrn:         Optional[str] = Field(
        None,
        max_length=12,
        examples=["123456789012"],
        description="12-digit Learner Reference Number",
    )
    school_year: Optional[str] = Field(
        None,
        max_length=9,
        examples=["2025-2026"],
        description="School year in YYYY-YYYY format",
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
    sex:         Optional[Sex]        = None
    lrn:         Optional[str]        = Field(None, min_length=12, max_length=12, pattern=r"^\d{12}$")
    school_year: Optional[str]        = Field(None, max_length=9)


class StudentResponse(StudentBase):
    id:              int
    teacher_id:      int
    created_at:      datetime
    updated_at:      Optional[datetime] = None
    reading_profile: Optional[str]      = None
    session_count:   Optional[int]      = None

    class Config:
        from_attributes = True


class StudentListResponse(BaseModel):
    total:     int
    page:      int
    page_size: int
    students:  List[StudentResponse]


class ClassSummary(BaseModel):
    grade_level:   GradeLevel
    section:       Optional[str]
    student_count: int

class ClassListResponse(BaseModel):
    classes: List[ClassSummary]


# Reading Result
class ReadingResultResponse(BaseModel):
    session_id:           int
    reading_time_seconds: Optional[float]
    total_words:          Optional[int]
    miscue_count:         Optional[int]
    cwpm:                 Optional[float]
    
    part1_task1_correct:  Optional[int] = None
    part1_task2_correct:  Optional[int] = None
    part1_total_score:    Optional[int] = None
    part1_classification: Optional[str] = None
    part1_route:          Optional[str] = None
    reading_profile:      Optional[str] = None

    created_at:           datetime
    updated_at:           Optional[datetime] = None

    class Config:
        from_attributes = True


# Session Observation
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


# Assessment Session
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
    passage_id:  Optional[int]
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
    passage:        Optional[PassageResponse]            = None

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


class ExcelImportResponse(BaseModel):
    students_created:          int
    students_found:            int
    sessions_created:          int
    sessions_skipped:          int
    sessions_empty_assessment: int        
    errors:                    List[str]

class BulkStudentUploadResponse(BaseModel):
    students_created:   int
    students_skipped:   int       
    students_invalid:   int      
    errors:             List[str] 

# Admin
class AdminTeacherUpdateRequest(BaseModel):
    employee_id: Optional[str] = Field(None, max_length=7)
    grade_level: Optional[GradeLevel] = None
    section:     Optional[str] = Field(None, max_length=100)

    @field_validator("employee_id")
    @classmethod
    def validate_employee_id(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if not re.fullmatch(r"\d{7}", v):
            raise ValueError("Employee ID must be exactly 7 digits")
        return v


class ActivityLogResponse(BaseModel):
    id:           int
    teacher_id:   int
    school_id:    int
    action:       str
    entity_type:  str
    entity_id:    Optional[int] = None
    log_metadata: Optional[dict] = None
    created_at:   datetime

    class Config:
        from_attributes = True


class TeacherAdminView(BaseModel):
    id:          int
    first_name:  str
    last_name:   str
    email:       str
    employee_id: Optional[str] = None
    grade_level: Optional[GradeLevel] = None
    section:     Optional[str] = None
    is_verified: bool
    is_active:   bool
    created_at:  datetime

    class Config:
        from_attributes = True


# Teacher Assignment
class TeacherAssignmentCreate(BaseModel):
    teacher_id:  int
    grade_level: GradeLevel
    section:     str = Field(..., min_length=1, max_length=100)
    school_year: str = Field(..., examples=["2025-2026"])

    @field_validator("school_year")
    @classmethod
    def validate_school_year(cls, v: str) -> str:
        return _validate_school_year(v)


class TeacherAssignmentUpdate(BaseModel):
    grade_level: Optional[GradeLevel] = None
    section:     Optional[str] = Field(None, min_length=1, max_length=100)
    school_year: Optional[str] = Field(None, examples=["2025-2026"])
    is_active:   Optional[bool] = None

    @field_validator("school_year")
    @classmethod
    def validate_school_year(cls, v: Optional[str]) -> Optional[str]:
        return _validate_school_year(v)


class TeacherAssignmentResponse(BaseModel):
    id:           int
    teacher_id:   int
    school_id:    int
    grade_level:  GradeLevel
    section:      str
    school_year:  str
    is_active:    bool
    created_at:   datetime
    teacher_name: Optional[str] = None  # populated in route

    class Config:
        from_attributes = True