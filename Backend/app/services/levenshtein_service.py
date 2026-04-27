"""
levenshtein_service.py
HearMeRead — Reading Assessment Scoring Engine

Handles:
  - Word-level Levenshtein alignment (substitution / insertion / deletion)
  - Assessment Part 1: Word Recognition & Sentence Reading scoring + routing
  - Assessment Part 2: Reading Fluency & Comprehension metrics + Reading Profile
"""

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Grade-level time limits in seconds
GRADE_TIME_LIMITS: dict[int, int] = {
    1: 60,   # Grade 1 → 1 minute
    2: 120,  # Grade 2 → 2 minutes
    3: 180,  # Grade 3 → 3 minutes
}


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class MiscueType(str, Enum):
    CORRECT     = "correct"
    SUBSTITUTION = "substitution"
    INSERTION   = "insertion"
    DELETION    = "deletion"


class Part1Route(str, Enum):
    TASK_2L = "task_2L"   # Rhymes  (Task 1 score 0–6)
    TASK_2H = "task_2H"   # Sentences (Task 1 score 7–10)


class Part1Classification(str, Enum):
    FULL_REFRESHER     = "Full Refresher"      # 0–10
    MODERATE_REFRESHER = "Moderate Refresher"  # 11–16
    LIGHT_REFRESHER    = "Light Refresher"     # 17–26
    GRADE_READY        = "Grade Ready"         # 27–30


class ReadingProfile(str, Enum):
    LOW_EMERGING       = "Low Emerging Reader"
    HIGH_EMERGING      = "High Emerging Reader"
    DEVELOPING         = "Developing Reader"
    TRANSITIONING      = "Transitioning Reader"
    GRADE_LEVEL        = "Reading at Grade Level"


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class WordAlignment:
    """Single word-level alignment result."""
    reference_word:   Optional[str]
    transcribed_word: Optional[str]
    miscue_type:      MiscueType


@dataclass
class LevenshteinResult:
    """Raw output of word-level Levenshtein alignment."""
    alignments:      list[WordAlignment]
    substitutions:   int = 0
    insertions:      int = 0
    deletions:       int = 0
    total_miscues:   int = 0
    correct_words:   int = 0


@dataclass
class Part1Result:
    """Assessment Part 1 scoring output."""
    # Task 1
    task1_reference_words:   list[str] = field(default_factory=list)
    task1_transcribed_words: list[str] = field(default_factory=list)
    task1_alignments:        list[WordAlignment] = field(default_factory=list)
    task1_correct:           int = 0
    task1_miscues:           int = 0

    # Routing
    route: Optional[Part1Route] = None

    # Task 2 (whichever branch was taken)
    task2_type:              Optional[str] = None   # "rhymes" or "sentences"
    task2_reference_words:   list[str] = field(default_factory=list)
    task2_transcribed_words: list[str] = field(default_factory=list)
    task2_alignments:        list[WordAlignment] = field(default_factory=list)
    task2_correct:           int = 0
    task2_miscues:           int = 0

    # Totals
    total_score:      int = 0
    classification:   Optional[Part1Classification] = None


@dataclass
class Part2Result:
    """Assessment Part 2 scoring output."""
    # Alignment
    alignments:           list[WordAlignment] = field(default_factory=list)
    substitutions:        int = 0
    insertions:           int = 0
    deletions:            int = 0
    total_miscues:        int = 0

    # Passage info
    total_words_in_passage: int = 0
    correct_words:          int = 0

    # Timing
    reading_time_sec:          float = 0.0
    grade_time_limit_sec:      int = 120
    words_read_within_time:    int = 0   # words aligned within grade time cap
    total_words_spoken:        int = 0   # all words spoken (even past time cap)

    # Computed metrics
    cwpm:           float = 0.0
    accuracy_pct:   float = 0.0

    # Comprehension (answered by teacher / system)
    comprehension_correct: int = 0   # out of 6

    # Profile
    reading_profile: Optional[ReadingProfile] = None

    # Teacher-rated (stored as-is, not computed)
    observation_level:   Optional[int] = None   # 1–4
    learner_experience:  Optional[int] = None   # 1–5


# ---------------------------------------------------------------------------
# Core utilities
# ---------------------------------------------------------------------------

def preprocess(text: str) -> list[str]:
    """
    Lowercase, strip punctuation, tokenize into words.
    Returns a list of clean word tokens.
    """
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)          # remove punctuation
    text = re.sub(r"\s+", " ", text).strip()     # collapse whitespace
    return text.split() if text else []


def _levenshtein_matrix(ref: list[str], hyp: list[str]) -> list[list[int]]:
    """
    Build the standard word-level Levenshtein edit-distance matrix.
    ref = reference (passage) words
    hyp = hypothesis (transcribed) words
    """
    m, n = len(ref), len(hyp)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(m + 1):
        dp[i][0] = i          # deletions (ref word not spoken)
    for j in range(n + 1):
        dp[0][j] = j          # insertions (extra word spoken)

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if ref[i - 1] == hyp[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]          # exact match
            else:
                dp[i][j] = 1 + min(
                    dp[i - 1][j - 1],   # substitution
                    dp[i - 1][j],       # deletion
                    dp[i][j - 1],       # insertion
                )
    return dp


def align_words(reference: list[str], transcribed: list[str]) -> LevenshteinResult:
    """
    Align reference passage words against Whisper-transcribed words using
    word-level Levenshtein distance. Backtracks the DP matrix to produce
    a per-word alignment with miscue classification.

    Returns a LevenshteinResult with alignments and counts.
    """
    dp = _levenshtein_matrix(reference, transcribed)
    m, n = len(reference), len(transcribed)

    # Backtrack from dp[m][n] to dp[0][0]
    alignments: list[WordAlignment] = []
    i, j = m, n

    while i > 0 or j > 0:
        if i > 0 and j > 0 and reference[i - 1] == transcribed[j - 1]:
            # Correct match
            alignments.append(WordAlignment(
                reference_word=reference[i - 1],
                transcribed_word=transcribed[j - 1],
                miscue_type=MiscueType.CORRECT,
            ))
            i -= 1
            j -= 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + 1:
            # Substitution: student said wrong word
            alignments.append(WordAlignment(
                reference_word=reference[i - 1],
                transcribed_word=transcribed[j - 1],
                miscue_type=MiscueType.SUBSTITUTION,
            ))
            i -= 1
            j -= 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            # Deletion: student skipped a reference word
            alignments.append(WordAlignment(
                reference_word=reference[i - 1],
                transcribed_word=None,
                miscue_type=MiscueType.DELETION,
            ))
            i -= 1
        else:
            # Insertion: student said an extra word not in reference
            alignments.append(WordAlignment(
                reference_word=None,
                transcribed_word=transcribed[j - 1],
                miscue_type=MiscueType.INSERTION,
            ))
            j -= 1

    alignments.reverse()   # backtrack produced reverse order

    # Count miscue types
    substitutions = sum(1 for a in alignments if a.miscue_type == MiscueType.SUBSTITUTION)
    insertions    = sum(1 for a in alignments if a.miscue_type == MiscueType.INSERTION)
    deletions     = sum(1 for a in alignments if a.miscue_type == MiscueType.DELETION)
    correct       = sum(1 for a in alignments if a.miscue_type == MiscueType.CORRECT)
    total_miscues = substitutions + insertions + deletions

    return LevenshteinResult(
        alignments=alignments,
        substitutions=substitutions,
        insertions=insertions,
        deletions=deletions,
        total_miscues=total_miscues,
        correct_words=correct,
    )


# ---------------------------------------------------------------------------
# Part 1 — Word Recognition & Sentence Reading
# ---------------------------------------------------------------------------

def _classify_part1(total_score: int) -> Part1Classification:
    if total_score <= 10:
        return Part1Classification.FULL_REFRESHER
    elif total_score <= 16:
        return Part1Classification.MODERATE_REFRESHER
    elif total_score <= 26:
        return Part1Classification.LIGHT_REFRESHER
    else:
        return Part1Classification.GRADE_READY


def score_part1(
    task1_reference_text: str,
    task1_transcribed_text: str,
    task2_reference_text: str,
    task2_transcribed_text: str,
) -> Part1Result:
    """
    Score Assessment Part 1 (Word Recognition & Sentence Reading).

    Parameters
    ----------
    task1_reference_text    : The 10-word reference list for Task 1
    task1_transcribed_text  : Whisper transcript for Task 1
    task2_reference_text    : Reference text for whichever Task 2 was given
                              (Rhymes for 2L, Sentences for 2H)
    task2_transcribed_text  : Whisper transcript for Task 2

    Returns
    -------
    Part1Result with full breakdown, routing decision, and classification.
    """
    result = Part1Result()

    # --- Task 1 ---
    ref1  = preprocess(task1_reference_text)
    hyp1  = preprocess(task1_transcribed_text)
    lev1  = align_words(ref1, hyp1)

    result.task1_reference_words   = ref1
    result.task1_transcribed_words = hyp1
    result.task1_alignments        = lev1.alignments
    result.task1_correct           = lev1.correct_words
    result.task1_miscues           = lev1.total_miscues

    # --- Routing ---
    if result.task1_correct <= 6:
        result.route     = Part1Route.TASK_2L
        result.task2_type = "rhymes"
    else:
        result.route     = Part1Route.TASK_2H
        result.task2_type = "sentences"

    # --- Task 2 ---
    ref2 = preprocess(task2_reference_text)
    hyp2 = preprocess(task2_transcribed_text)
    lev2 = align_words(ref2, hyp2)

    result.task2_reference_words   = ref2
    result.task2_transcribed_words = hyp2
    result.task2_alignments        = lev2.alignments
    result.task2_correct           = lev2.correct_words
    result.task2_miscues           = lev2.total_miscues

    # --- Totals ---
    result.total_score    = result.task1_correct + result.task2_correct
    result.classification = _classify_part1(result.total_score)

    return result


# ---------------------------------------------------------------------------
# Part 2 — Reading Fluency & Comprehension
# ---------------------------------------------------------------------------

def _count_words_within_time(
    alignments: list[WordAlignment],
    whisper_word_timestamps: list[dict],
    time_limit_sec: int,
) -> int:
    """
    Count how many CORRECT reference words were read within the grade time limit.
    Uses Whisper word-level timestamps (word_timestamps=True).

    whisper_word_timestamps: list of {"word": str, "start": float, "end": float}
    """
    if not whisper_word_timestamps:
        # Fallback: no timestamps available, count all correct words
        return sum(1 for a in alignments if a.miscue_type == MiscueType.CORRECT)

    count = 0
    for entry in whisper_word_timestamps:
        if entry.get("start", 0) <= time_limit_sec:
            # Check if this word was a correct match in alignment
            # (Simple heuristic: count words spoken within time limit)
            count += 1
    return count


def _classify_reading_profile(
    part1_total_score: Optional[int],
    accuracy_pct: float,
    comprehension_correct: int,
) -> ReadingProfile:
    """
    Determine Reading Profile based on:
    - Part 1 total score (if 0–10 → Low Emerging, skip further checks)
    - Accuracy percentage from Part 2
    - Number of comprehension questions answered correctly (out of 6)

    If Part 1 was not taken (None), skip the Low Emerging check.
    """
    # Rule 1: Low Emerging — Part 1 total ≤ 10 overrides everything
    if part1_total_score is not None and part1_total_score <= 10:
        return ReadingProfile.LOW_EMERGING

    # Rule 2: Both accuracy AND comprehension must match
    if accuracy_pct < 25.0 or comprehension_correct == 0:
        return ReadingProfile.HIGH_EMERGING
    elif 25.0 <= accuracy_pct <= 50.0 and 1 <= comprehension_correct <= 2:
        return ReadingProfile.DEVELOPING
    elif 51.0 <= accuracy_pct <= 75.0 and 3 <= comprehension_correct <= 4:
        return ReadingProfile.TRANSITIONING
    elif accuracy_pct > 75.0 and 5 <= comprehension_correct <= 6:
        return ReadingProfile.GRADE_LEVEL
    else:
        # Mismatch between accuracy and comprehension — use accuracy as tiebreaker
        # (teacher can override on the frontend)
        if accuracy_pct < 25.0:
            return ReadingProfile.HIGH_EMERGING
        elif accuracy_pct <= 50.0:
            return ReadingProfile.DEVELOPING
        elif accuracy_pct <= 75.0:
            return ReadingProfile.TRANSITIONING
        else:
            return ReadingProfile.GRADE_LEVEL


def score_part2(
    reference_text: str,
    transcribed_text: str,
    reading_time_sec: float,
    grade_level: int,
    comprehension_correct: int,
    part1_total_score: Optional[int] = None,
    whisper_word_timestamps: Optional[list[dict]] = None,
    observation_level: Optional[int] = None,
    learner_experience: Optional[int] = None,
) -> Part2Result:
    """
    Score Assessment Part 2 (Reading Fluency & Comprehension).

    Parameters
    ----------
    reference_text          : The full passage text
    transcribed_text        : Whisper ASR transcript (full recording, even past time cap)
    reading_time_sec        : Total actual recording time in seconds
    grade_level             : 1, 2, or 3 (determines time cap)
    comprehension_correct   : Number of comprehension questions answered correctly (0–6)
    part1_total_score       : Part 1 total score — used for Low Emerging profile check
                              Pass None if Part 1 was not administered
    whisper_word_timestamps : Optional list of {"word", "start", "end"} dicts from Whisper
    observation_level       : Teacher-rated observation level (1–4)
    learner_experience      : Teacher-rated learner experience (1–5)

    Returns
    -------
    Part2Result with all computed metrics and Reading Profile.
    """
    result = Part2Result()

    # --- Preprocessing ---
    ref_words = preprocess(reference_text)
    hyp_words = preprocess(transcribed_text)

    result.total_words_in_passage = len(ref_words)
    result.total_words_spoken     = len(hyp_words)
    result.reading_time_sec       = reading_time_sec
    result.grade_time_limit_sec   = GRADE_TIME_LIMITS.get(grade_level, 120)
    result.comprehension_correct  = comprehension_correct
    result.observation_level      = observation_level
    result.learner_experience     = learner_experience

    # --- Levenshtein alignment (full transcript, including past time cap) ---
    lev = align_words(ref_words, hyp_words)

    result.alignments     = lev.alignments
    result.substitutions  = lev.substitutions
    result.insertions     = lev.insertions
    result.deletions      = lev.deletions
    result.total_miscues  = lev.total_miscues
    result.correct_words  = lev.correct_words

    # --- Words read within grade time limit ---
    result.words_read_within_time = _count_words_within_time(
        alignments=lev.alignments,
        whisper_word_timestamps=whisper_word_timestamps or [],
        time_limit_sec=result.grade_time_limit_sec,
    )

    # --- CWPM ---
    # Uses total passage words and total miscues from the full recording.
    # Time is capped at the grade limit to avoid inflating CWPM.
    effective_time_sec = min(reading_time_sec, result.grade_time_limit_sec)
    if effective_time_sec > 0:
        correct_in_passage = max(result.total_words_in_passage - result.total_miscues, 0)
        result.cwpm = round(correct_in_passage / (effective_time_sec / 60), 2)
    else:
        result.cwpm = 0.0

    # --- Accuracy Percentage ---
    if result.total_words_in_passage > 0:
        correct_in_passage = max(result.total_words_in_passage - result.total_miscues, 0)
        result.accuracy_pct = round(
            (correct_in_passage / result.total_words_in_passage) * 100, 2
        )
    else:
        result.accuracy_pct = 0.0

    # --- Reading Profile ---
    result.reading_profile = _classify_reading_profile(
        part1_total_score=part1_total_score,
        accuracy_pct=result.accuracy_pct,
        comprehension_correct=comprehension_correct,
    )

    return result


# ---------------------------------------------------------------------------
# Convenience: summary dict for API response
# ---------------------------------------------------------------------------

def part1_to_dict(r: Part1Result) -> dict:
    return {
        "task1": {
            "correct": r.task1_correct,
            "miscues": r.task1_miscues,
            "alignments": [
                {
                    "reference": a.reference_word,
                    "transcribed": a.transcribed_word,
                    "miscue_type": a.miscue_type.value,
                }
                for a in r.task1_alignments
            ],
        },
        "route": r.route.value if r.route else None,
        "task2_type": r.task2_type,
        "task2": {
            "correct": r.task2_correct,
            "miscues": r.task2_miscues,
            "alignments": [
                {
                    "reference": a.reference_word,
                    "transcribed": a.transcribed_word,
                    "miscue_type": a.miscue_type.value,
                }
                for a in r.task2_alignments
            ],
        },
        "total_score": r.total_score,
        "classification": r.classification.value if r.classification else None,
    }


def part2_to_dict(r: Part2Result) -> dict:
    return {
        "miscues": {
            "total": r.total_miscues,
            "substitutions": r.substitutions,
            "insertions": r.insertions,
            "deletions": r.deletions,
        },
        "passage": {
            "total_words": r.total_words_in_passage,
            "correct_words": r.correct_words,
        },
        "timing": {
            "reading_time_sec": r.reading_time_sec,
            "grade_time_limit_sec": r.grade_time_limit_sec,
            "words_read_within_time": r.words_read_within_time,
            "total_words_spoken": r.total_words_spoken,
        },
        "metrics": {
            "cwpm": r.cwpm,
            "accuracy_pct": r.accuracy_pct,
            "comprehension_correct": r.comprehension_correct,
        },
        "profile": {
            "reading_profile": r.reading_profile.value if r.reading_profile else None,
            "observation_level": r.observation_level,
            "learner_experience": r.learner_experience,
        },
        "alignments": [
            {
                "reference": a.reference_word,
                "transcribed": a.transcribed_word,
                "miscue_type": a.miscue_type.value,
            }
            for a in r.alignments
        ],
    }