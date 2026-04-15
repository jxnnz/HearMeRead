import enum
import re

from sqlalchemy import (
    Column, Integer, String, Float, Text,
    Boolean, ForeignKey, DateTime, Enum as SAEnum,
    func, event
)
from sqlalchemy.orm import relationship, validates

from app.db.base import Base


class AssessmentPeriod(str, enum.Enum):
    beginning = "beginning"
    middle = "middle"
    end = "end"


_SCHOOL_YEAR_RE = re.compile(r"^\d{4}-\d{4}$")


class AssessmentSession(Base):
    __tablename__ = "assessment_sessions"

    id = Column(Integer, primary_key=True, index=True)

    # ── Who / what ────────────────────────────────────────────────────────────
    teacher_id  = Column(Integer, ForeignKey("teachers.id",  ondelete="CASCADE"), nullable=False, index=True)
    student_id  = Column(Integer, ForeignKey("students.id",  ondelete="CASCADE"), nullable=False, index=True)
    passage_id  = Column(Integer, ForeignKey("passages.id",  ondelete="CASCADE"), nullable=False, index=True)

    # ── When ──────────────────────────────────────────────────────────────────
    school_year = Column(String(9),  nullable=False)          # e.g. "2024-2025"
    period      = Column(SAEnum(AssessmentPeriod), nullable=False)  # beginning | middle | end

    # ── Reading metrics ───────────────────────────────────────────────────────
    reading_time_seconds = Column(Float,   nullable=True)
    total_words          = Column(Integer, nullable=True)
    miscue_count         = Column(Integer, nullable=True, default=0)
    cwpm                 = Column(Float,   nullable=True)     # computed: (total_words - miscues) / (secs / 60)

    # ── Comprehension ─────────────────────────────────────────────────────────
    comprehension_correct = Column(Integer, nullable=True)
    comprehension_total   = Column(Integer, nullable=True)

    # ── Teacher observations ──────────────────────────────────────────────────
    fluency_level       = Column(Integer, nullable=True)   # 1–4
    learner_experience  = Column(Integer, nullable=True)   # 1–5
    teacher_remarks     = Column(Text,    nullable=True)

    # ── Status ────────────────────────────────────────────────────────────────
    is_completed = Column(Boolean, nullable=False, default=False)
    is_archived  = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────────
    teacher = relationship("Teacher", back_populates="assessment_sessions")
    student = relationship("Student", back_populates="assessment_sessions")
    passage = relationship("Passage", back_populates="assessment_sessions")

    # ── Validators ────────────────────────────────────────────────────────────
    @validates("school_year")
    def validate_school_year(self, key, value):
        if not _SCHOOL_YEAR_RE.match(value):
            raise ValueError("school_year must be in YYYY-YYYY format (e.g. 2024-2025)")
        start, end = value.split("-")
        if int(end) != int(start) + 1:
            raise ValueError("school_year end must be exactly one year after start (e.g. 2024-2025)")
        return value

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