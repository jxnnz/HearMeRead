"""
session_schemas.py
Pydantic v2 schemas for the complete_session endpoint.
"""

from pydantic import BaseModel, Field, model_validator
from typing import Optional
from enum import Enum

# Import shared enums from models to avoid duplication
from app.models import AssessmentPeriod, Language


# ---------------------------------------------------------------------------
# Enums (new — not already in models.py)
# ---------------------------------------------------------------------------

class ReadingProfileEnum(str, Enum):
    low_emerging  = "Low Emerging Reader"
    high_emerging = "High Emerging Reader"
    developing    = "Developing Reader"
    transitioning = "Transitioning Reader"
    grade_level   = "Reading at Grade Level"


class Part1ClassificationEnum(str, Enum):
    full_refresher     = "Full Refresher"
    moderate_refresher = "Moderate Refresher"
    light_refresher    = "Light Refresher"
    grade_ready        = "Grade Ready"


# ---------------------------------------------------------------------------
# Request body for POST /sessions/{id}/complete
# ---------------------------------------------------------------------------

class Part1CompleteIn(BaseModel):
    """Part 1 data submitted after both Task 1 and Task 2 recordings."""
    task1_reference_text:    str = Field(..., description="10-word reference list for Task 1")
    task1_transcribed_text:  str = Field(..., description="Whisper transcript for Task 1")
    task2_reference_text:    str = Field(..., description="Reference for Task 2L (Rhymes) or 2H (Sentences)")
    task2_transcribed_text:  str = Field(..., description="Whisper transcript for Task 2")


class Part2CompleteIn(BaseModel):
    """Part 2 data submitted after the passage recording + comprehension check."""
    passage_id:              Optional[int] = Field(None, description="Optional Assessment 2 passage ID")
    reference_text:          str   = Field(..., description="Full passage reference text")
    transcribed_text:        str   = Field(..., description="Full Whisper transcript")
    reading_time_sec:        float = Field(..., gt=0, description="Total recording duration in seconds")
    grade_level:             int   = Field(..., ge=1, le=3, description="Student grade level (1, 2, or 3)")

    # Comprehension (teacher-submitted after Q&A)
    comprehension_correct:   int   = Field(..., ge=0, le=6)
    comprehension_total:     int   = Field(6, description="Always 6 for CRLA")

    # Teacher-rated fields
    fluency_level:           Optional[int] = Field(None, ge=1, le=4, description="Observation level 1–4")
    learner_experience:      Optional[int] = Field(None, ge=1, le=5, description="Smiley rating 1–5")
    teacher_remarks:         Optional[str] = None

    # Optional Whisper word timestamps for within-time counting
    whisper_word_timestamps: Optional[list[dict]] = None


class CompleteSessionIn(BaseModel):
    """
    Full payload for POST /sessions/{id}/complete.
    Part 1 is required. Part 2 is optional — skipped if student is Low Emerging.
    """
    part1: Part1CompleteIn
    part2: Optional[Part2CompleteIn] = None

    @model_validator(mode="after")
    def validate_structure(self):
        # part2 can be None if student scored <=10 in Part 1 (Low Emerging)
        return self


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class WordAlignmentOut(BaseModel):
    reference:    Optional[str]
    transcribed:  Optional[str]
    miscue_type:  str   # "correct" | "substitution" | "insertion" | "deletion"


class Part1ResultOut(BaseModel):
    task1_correct:    int
    task1_miscues:    int
    route:            str   # "task_2L" or "task_2H"
    task2_type:       str   # "rhymes" or "sentences"
    task2_correct:    int
    task2_miscues:    int
    total_score:      int
    classification:   str
    task1_alignments: list[WordAlignmentOut]
    task2_alignments: list[WordAlignmentOut]


class Part2ResultOut(BaseModel):
    total_words_in_passage:  int
    total_words_spoken:      int
    words_read_within_time:  int
    substitutions:           int
    insertions:              int
    deletions:               int
    total_miscues:           int
    reading_time_sec:        float
    grade_time_limit_sec:    int
    cwpm:                    float
    accuracy_pct:            float
    comprehension_correct:   int
    reading_profile:         str
    observation_level:       Optional[int]
    learner_experience:      Optional[int]
    alignments:              list[WordAlignmentOut]


class CompleteSessionOut(BaseModel):
    session_id:  int
    status:      str
    part1:       Part1ResultOut
    part2:       Optional[Part2ResultOut] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Intermediate scoring — does NOT mark session complete
# ---------------------------------------------------------------------------

class Task1ScoreIn(BaseModel):
    """Payload for POST /sessions/{id}/score-task1."""
    task1_reference_text:   str
    task1_transcribed_text: str


class Task1ScoreOut(BaseModel):
    """Result of Task 1 Levenshtein alignment (no session state change)."""
    task1_correct:  int
    task1_miscues:  int
    route:          str   # "task_2L" (score 0-6) or "task_2H" (score 7-10)
    task2_type:     str   # "rhymes" or "sentences"
    alignments:     list[WordAlignmentOut]


class Part1ScoreIn(BaseModel):
    """Payload for POST /sessions/{id}/score-part1 (both tasks)."""
    task1_reference_text:   str
    task1_transcribed_text: str
    task2_reference_text:   str
    task2_transcribed_text: str


class ObservationIn(BaseModel):
    """Payload for POST /sessions/{id}/observe — saves observation without completing session."""
    observation_level:  int           = Field(..., ge=1, le=4)
    teacher_remarks:    Optional[str] = Field(None, max_length=1000)
    learner_experience: Optional[int] = Field(None, ge=1, le=5)
