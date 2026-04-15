from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, Enum as SAEnum, DateTime, func
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base
from app.models.student import GradeLevel


class Language(str, enum.Enum):
    english = "en"
    filipino = "fil"


class Passage(Base):
    __tablename__ = "passages"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    language = Column(SAEnum(Language), nullable=False)
    grade_level = Column(SAEnum(GradeLevel), nullable=False)
    word_count = Column(Integer, nullable=False, default=0)

    is_archived = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    teacher = relationship("Teacher", back_populates="passages")
    questions = relationship("Question", back_populates="passage", lazy="selectin")
    assessment_sessions = relationship("AssessmentSession", back_populates="passage")