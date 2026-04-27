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
    english  = "english"
    filipino = "filipino"


class AssessmentPeriod(str, enum.Enum):
    beginning = "beginning"
    middle    = "middle"
    end       = "end"


class ReadingProfile(str, enum.Enum):
    low_emerging  = "Low Emerging Reader"
    high_emerging = "High Emerging Reader"
    developing    = "Developing Reader"
    transitioning = "Transitioning Reader"
    grade_level   = "Reading at Grade Level"


class Part1Classification(str, enum.Enum):
    full_refresher     = "Full Refresher"
    moderate_refresher = "Moderate Refresher"
    light_refresher    = "Light Refresher"
    grade_ready        = "Grade Ready"


# ── Helpers ───────────────────────────────────────────────────────────────────

_SCHOOL_YEAR_RE = re.compile(r"^\d{4}-\d{4}$")


# ── Models ────────────────────────────────────────────────────────────────────

class Teacher(Base):
    __tablename__ = "teachers"

    id              = Column(Integer, primary_key=True, index=True)
    first_name      = Column(String(75),  nullable=False)
    last_name       = Column(String(75),  nullable=False)
    email           = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active       = Column(Boolean, default=True,  nullable=False)
    is_verified     = Column(Boolean, default=False, nullable=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    students            = relationship("Student",                back_populates="teacher")
    passages            = relationship("Passage",                back_populates="teacher")
    assessment_sessions = relationship("AssessmentSession",      back_populates="teacher")
    verification_tokens = relationship("EmailVerificationToken", back_populates="teacher",
                                       cascade="all, delete-orphan")


class EmailVerificationToken(Base):
    """
    Single-use token emailed to a teacher after registration.
    Expires after 24 hours. Once used, used_at is stamped and cannot be reused.
    """
    __tablename__ = "email_verification_tokens"

    id         = Column(Integer,  primary_key=True, index=True)
    teacher_id = Column(Integer,  ForeignKey("teachers.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    token      = Column(String(64), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at    = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    teacher = relationship("Teacher", back_populates="verification_tokens")


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

    id              = Column(Integer, primary_key=True, index=True)
    teacher_id      = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)
    title           = Column(String(255), nullable=True)   # nullable: Assessment 1 has no title
    content         = Column(Text, nullable=True)          # nullable: Assessment 1 uses task fields instead
    language        = Column(SAEnum(Language), nullable=False)
    grade_level     = Column(SAEnum(GradeLevel), nullable=True)  # nullable: Assessment 1 has no grade level
    word_count      = Column(Integer, nullable=False, default=0)
    is_archived     = Column(Boolean, nullable=False, default=False)
    assessment_type = Column(Integer, nullable=True)   # 1 = Assessment 1, 2 = Assessment 2
    task1_content   = Column(Text, nullable=True)      # Assessment 1: Task 1 reading passage
    task2_words     = Column(Text, nullable=True)      # Assessment 1: comma-separated word list
    task2_sentences = Column(Text, nullable=True)      # Assessment 1: period-separated sentences
    created_at      = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

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
    language = Column(SAEnum(Language), nullable=False, default=Language.filipino)

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

    audio_path       = Column(String(500), nullable=True)
    audio_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Part 1 scoring results
    part1_task1_correct          = Column(Integer, nullable=True)
    part1_task2_correct          = Column(Integer, nullable=True)
    part1_total_score            = Column(Integer, nullable=True)
    part1_classification         = Column(SAEnum(Part1Classification), nullable=True)
    part1_route                  = Column(String(10), nullable=True)
    part1_task1_alignments_json  = Column(Text, nullable=True)
    part1_task2_alignments_json  = Column(Text, nullable=True)

    # Part 2 scoring results
    part2_alignments_json = Column(Text, nullable=True)
    reading_profile       = Column(SAEnum(ReadingProfile), nullable=True)

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