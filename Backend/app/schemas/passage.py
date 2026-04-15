from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from app.models.passage import Language
from app.models.student import GradeLevel


# ── Question schemas (nested inside passage responses) ──────────────────────

class QuestionBase(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    order: int = Field(0, ge=0)


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    text: Optional[str] = Field(None, min_length=1, max_length=500)
    order: Optional[int] = Field(None, ge=0)


class QuestionResponse(QuestionBase):
    id: int
    passage_id: int
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Passage schemas ──────────────────────────────────────────────────────────

class PassageBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    language: Language
    grade_level: GradeLevel


class PassageCreate(PassageBase):
    pass


class PassageUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)
    language: Optional[Language] = None
    grade_level: Optional[GradeLevel] = None


class PassageResponse(PassageBase):
    id: int
    teacher_id: int
    word_count: int
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    questions: List[QuestionResponse] = []

    class Config:
        from_attributes = True


class PassageListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    passages: List[PassageResponse]