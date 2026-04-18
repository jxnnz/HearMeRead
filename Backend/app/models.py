import enum
import re

from sqlalchemy import (
    Column, Integer, String, Float, Text,
    Boolean, ForeignKey, DateTime,
    Enum as SAEnum, func
)
from sqlalchemy.orm import relationship, validates

from app.db import Base


# ── Enums ─────────────────────────────────────────────────────────────────────

class GradeLevel(str, enum.Enum):
    GRADE_1 = "Grade 1"
    GRADE_2 = "Grade 2"
    GRADE_3 = "Grade 3"
    GRADE_4 = "Grade 4"
    GRADE_5 = "Grade 5"
    GRADE_6 = "Grade 6"


class Language(str, enum.Enum):
    english  = "en"
    filipino = "fil"


class AssessmentPeriod(str, enum.Enum):
    beginning = "beginning"
    middle    = "middle"
    end       = "end"


# ── Helpers ───────────────────────────────────────────────────────────────────

_SCHOOL_YEAR_RE = re.compile(r"^\d{4}-\d{4}$")


# ── Models ────────────────────────────────────────────────────────────────────

class Teacher(Base):
    __tablename__ = "teachers"

    id              = Column(Integer, primary_key=True, index=True)
    full_name       = Column(String(150), nullable=False)
    email           = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    students            = relationship("Student",           back_populates="teacher")
    passages            = relationship("Passage",           back_populates="teacher")
    assessment_sessions = relationship("AssessmentSession", back_populates="teacher")


class Student(Base):
    __tablename__ = "students"

    id          = Column(Integer, primary_key=True, index=True)
    first_name  = Column(String(100), nullable=False)
    last_name   = Column(String(100), nullable=False)
    grade_level = Column(SAEnum(GradeLevel), nullable=False)
    section     = Column(String(100), nullable=True)
    lrn         = Column(String(12), unique=True, nullable=True)
    teacher_id  = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    teacher             = relationship("Teacher",           back_populates="students")
    assessment_sessions = relationship("AssessmentSession", back_populates="student")


class Passage(Base):
    __tablename__ = "passages"

    id          = Column(Integer, primary_key=True, index=True)
    teacher_id  = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)
    title       = Column(String(255), nullable=False)
    content     = Column(Text, nullable=False)
    language    = Column(SAEnum(Language), nullable=False)
    grade_level = Column(SAEnum(GradeLevel), nullable=False)
    word_count  = Column(Integer, nullable=False, default=0)
    is_archived = Column(Boolean, nullable=False, default=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    teacher             = relationship("Teacher",           back_populates="passages")
    questions           = relationship("Question",          back_populates="passage", lazy="selectin")
    assessment_sessions = relationship("AssessmentSession", back_populates="passage")


class Question(Base):
    __tablename__ = "questions"

    id          = Column(Integer, primary_key=True, index=True)
    passage_id  = Column(Integer, ForeignKey("passages.id", ondelete="CASCADE"), nullable=False, index=True)
    text        = Column(String(500), nullable=False)
    order       = Column(Integer, nullable=False, default=0)
    is_archived = Column(Boolean, nullable=False, default=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    passage = relationship("Passage", back_populates="questions")


class AssessmentSession(Base):
    __tablename__ = "assessment_sessions"

    id = Column(Integer, primary_key=True, index=True)

    # ── Who / what ────────────────────────────────────────────────────────────
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    passage_id = Column(Integer, ForeignKey("passages.id", ondelete="CASCADE"), nullable=False, index=True)

    # ── When ──────────────────────────────────────────────────────────────────
    school_year = Column(String(9),               nullable=False)   # e.g. "2024-2025"
    period      = Column(SAEnum(AssessmentPeriod), nullable=False)   # beginning | middle | end

    # ── Language (drives Whisper model + passage filter) ──────────────────────
    language = Column(SAEnum(Language), nullable=False, default=Language.english)

    # ── Status ────────────────────────────────────────────────────────────────
    is_completed = Column(Boolean, nullable=False, default=False)
    is_archived  = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────────
    teacher     = relationship("Teacher", back_populates="assessment_sessions")
    student     = relationship("Student", back_populates="assessment_sessions")
    passage     = relationship("Passage", back_populates="assessment_sessions")
    reading_result  = relationship("ReadingResult",      back_populates="session", uselist=False)
    observation     = relationship("SessionObservation", back_populates="session", uselist=False)

    # ── Validators ────────────────────────────────────────────────────────────
    @validates("school_year")
    def validate_school_year(self, key, value):
        if not _SCHOOL_YEAR_RE.match(value):
            raise ValueError("school_year must be in YYYY-YYYY format (e.g. 2024-2025)")
        start, end = value.split("-")
        if int(end) != int(start) + 1:
            raise ValueError("school_year end must be exactly one year after start (e.g. 2024-2025)")
        return value


class ReadingResult(Base):
    """
    CWPM fluency metrics — created when the teacher submits the recording step.
    CWPM = (total_words - miscue_count) / (reading_time_seconds / 60)
    """
    __tablename__ = "reading_results"

    session_id = Column(
        Integer,
        ForeignKey("assessment_sessions.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )

    reading_time_seconds = Column(Float,   nullable=True)
    total_words          = Column(Integer, nullable=True)
    miscue_count         = Column(Integer, nullable=True, default=0)
    cwpm                 = Column(Float,   nullable=True)   # auto-computed on save

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    session = relationship("AssessmentSession", back_populates="reading_result")


class SessionObservation(Base):
    """
    Comprehension scores + teacher ratings — created after the observation step.
    """
    __tablename__ = "session_observations"

    session_id = Column(
        Integer,
        ForeignKey("assessment_sessions.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )

    # Comprehension
    comprehension_correct = Column(Integer, nullable=True)
    comprehension_total   = Column(Integer, nullable=True)

    # Teacher ratings
    fluency_level      = Column(Integer, nullable=True)   # 1–4
    learner_experience = Column(Integer, nullable=True)   # 1–5
    teacher_remarks    = Column(Text,    nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    session = relationship("AssessmentSession", back_populates="observation")

    # ── Validators ────────────────────────────────────────────────────────────
    @validates("fluency_level")
    def validate_fluency_level(self, key, value):
        if value is not None and value not in range(1, 5):
            raise ValueError("fluency_level must be between 1 and 4")
        return value

    @validates("learner_experience")
    def validate_learner_experience(self, key, value):
        if value is not None and value not in range(1, 6):
            raise ValueError("learner_experience must be between 1 and 5")
        return value