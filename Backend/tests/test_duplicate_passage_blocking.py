import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from app.utils.passage_hash import normalize_text, compute_passage_hash
from app.models import Passage, Language, GradeLevel
from app.schema import PassageCreate
from app.services import passage_service


def test_normalize_text():
    # Whitespace and newlines normalization
    t1 = "  Si   Pagong  \r\n\r\n at  si   Matsing. \n\n\n\n Wakas.  "
    t2 = "si pagong\n\nat si matsing.\n\nwakas."
    assert normalize_text(t1) == t2

    # Empty string returns empty
    assert normalize_text("") == ""
    assert normalize_text(None) == ""


def test_compute_passage_hash_assessment_2():
    text1 = "Isang araw, may isang pagong at isang matsing."
    text2 = "  isang araw,   may isang pagong at isang matsing.  \r\n"
    h1 = compute_passage_hash(assessment_type=2, content=text1)
    h2 = compute_passage_hash(assessment_type=2, content=text2)

    assert h1 is not None
    assert len(h1) == 64  # SHA-256 hex digest length
    assert h1 == h2

    # Different content produces different hash
    h3 = compute_passage_hash(assessment_type=2, content="Ibang kwento ito.")
    assert h3 != h1


def test_compute_passage_hash_assessment_1():
    t1 = "b, ng, T, e, p"
    t2w = "sanay, tunay"
    t2s = "Ang bata ay masaya."

    h1 = compute_passage_hash(
        assessment_type=1,
        task1_content=t1,
        task2_words=t2w,
        task2_sentences=t2s,
    )
    h2 = compute_passage_hash(
        assessment_type=1,
        task1_content="  b, ng, t, e, p  ",
        task2_words=" sanay,   tunay\n",
        task2_sentences="ang bata ay masaya.",
    )

    assert h1 is not None
    assert len(h1) == 64
    assert h1 == h2


def test_compute_passage_hash_empty():
    assert compute_passage_hash(assessment_type=2, content="") is None
    assert compute_passage_hash(assessment_type=2, content="   \n  ") is None
    assert compute_passage_hash(assessment_type=1, task1_content="", task2_words="", task2_sentences="") is None


@pytest.mark.asyncio
async def test_create_passage_blocks_duplicate():
    db = AsyncMock()
    existing_passage = Passage(
        id=99,
        title="Ang Matsing",
        content="Isang magandang umaga sa nayon.",
        assessment_type=2,
        is_archived=False,
    )

    data = PassageCreate(
        title="Bagong Kwento",
        content="  isang magandang umaga sa nayon.  \n",
        language=Language.filipino,
        grade_level=GradeLevel.grade_2,
        assessment_type=2,
    )

    with patch("app.services.passage_service.find_duplicate_passage", new=AsyncMock(return_value=existing_passage)):
        with pytest.raises(HTTPException) as exc_info:
            await passage_service.create_passage(db=db, data=data, teacher_id=1)

        assert exc_info.value.status_code == 409
        assert "A passage with the same content already exists" in exc_info.value.detail
        assert "Ang Matsing" in exc_info.value.detail


@pytest.mark.asyncio
async def test_create_passage_succeeds_when_unique():
    db = AsyncMock()
    # Mock teacher query
    mock_teacher = MagicMock()
    mock_teacher.school_id = None
    teacher_res = MagicMock()
    teacher_res.scalar_one_or_none.return_value = mock_teacher
    db.execute.return_value = teacher_res

    data = PassageCreate(
        title="Bagong Kwento",
        content="Natatanging kwento ito.",
        language=Language.filipino,
        grade_level=GradeLevel.grade_2,
        assessment_type=2,
    )

    with patch("app.services.passage_service.find_duplicate_passage", new=AsyncMock(return_value=None)):
        created = await passage_service.create_passage(db=db, data=data, teacher_id=1)
        assert created.title == "Bagong Kwento"
        assert created.content_hash == compute_passage_hash(2, "Natatanging kwento ito.")



@pytest.mark.asyncio
async def test_bulk_create_partial_success_order():
    from app.routes.passages import bulk_create_passages
    from app.schema import BulkPassageItem
    from app.models import Teacher

    db = AsyncMock()
    mock_teacher = Teacher(id=1, email="t@school.edu", role="TEACHER")
    mock_teacher.school_id = None

    item0 = BulkPassageItem(
        language=Language.filipino,
        grade_level=GradeLevel.grade_2,
        assessment_type=2,
        title="Existing Story",
        content="May isang aso at pusa.",
    )
    item1 = BulkPassageItem(
        language=Language.filipino,
        grade_level=GradeLevel.grade_2,
        assessment_type=2,
        title="New Unique Story",
        content="Isang ibon sa puno.",
    )

    existing_dup = Passage(id=50, title="Old Aso at Pusa", assessment_type=2)

    async def mock_find_dup(db, teacher_id, content_hash):
        if content_hash == compute_passage_hash(2, "May isang aso at pusa."):
            return existing_dup
        return None

    with patch("app.services.passage_service.find_duplicate_passage", side_effect=mock_find_dup):
        resp = await bulk_create_passages(items=[item0, item1], db=db, current_teacher=mock_teacher)

        assert resp.created == 1
        assert resp.failed == 1
        assert len(resp.results) == 2
        # Verify ordering is preserved
        assert resp.results[0].index == 0
        assert "already exists" in resp.results[0].error
        assert resp.results[1].index == 1
        assert resp.results[1].error is None
        assert resp.results[1].title == "New Unique Story"


def test_assessment_2_scoring_accuracy_boundary_and_cwpm():
    from app.services.levenshtein_service import _classify_reading_profile, ReadingProfile, score_part2

    # Accuracy 50.5% with comprehension 3 should be TRANSITIONING (not fall into weird boundary)
    profile = _classify_reading_profile(
        part1_total_score=15,
        accuracy_pct=50.5,
        comprehension_correct=3,
    )
    assert profile == ReadingProfile.TRANSITIONING

    # Accuracy 50.0% with comprehension 2 should be DEVELOPING
    profile_dev = _classify_reading_profile(
        part1_total_score=15,
        accuracy_pct=50.0,
        comprehension_correct=2,
    )
    assert profile_dev == ReadingProfile.DEVELOPING

    # CWPM should not be inflated if reading exceeds grade time limit
    timestamps = [
        {"word": "ang", "start": 10.0, "end": 10.5},
        {"word": "bata", "start": 30.0, "end": 30.5},
        {"word": "ay", "start": 50.0, "end": 50.5},
        {"word": "masipag", "start": 130.0, "end": 131.0}, # past 120s limit
    ]
    res = score_part2(
        reference_text="ang bata ay masipag",
        transcribed_text="ang bata ay masipag",
        reading_time_sec=180.0, # 3 minutes
        grade_level=2, # 120s limit
        comprehension_correct=5,
        whisper_word_timestamps=timestamps,
    )
    # 3 words read within 120s limit (2 minutes) -> 3 / 2 = 1.5 CWPM (not 4 words / 2 min = 2.0)
    assert res.words_read_within_time == 3
    assert res.cwpm == 1.5
