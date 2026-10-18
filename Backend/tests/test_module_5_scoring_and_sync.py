import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from app.models import Teacher, Student, AssessmentSession, ReadingResult, SessionObservation, Passage, UserRole, GradeLevel
from app.routes.session import get_session
from app.routes.students import get_student
from app.services.levenshtein_service import score_part1, score_part2, ReadingProfile, Part1Classification, Part1Route


def test_crla_part1_scoring_and_routing_filipino():
    # Filipino Task 1 score <= 6 routes to Task 2L (rhymes for G1 or words for G2/G3)
    p1_low = score_part1(
        task1_reference_text="b ng T e p s H G u L",
        task1_transcribed_text="b ng T e p",  # 5 correct <= 6
        task2_reference_text="sanay tunay",
        task2_transcribed_text="sanay tunay",  # 2 correct
        language="filipino",
        grade_level=1,
    )
    assert p1_low.task1_correct == 5
    assert p1_low.route == Part1Route.TASK_2L
    assert p1_low.task2_type == "rhymes"
    assert p1_low.total_score == 7

    # Filipino Task 1 score > 6 routes to Task 2H (sentences)
    p1_high = score_part1(
        task1_reference_text="b ng T e p s H G u L",
        task1_transcribed_text="b ng T e p s H G",  # 8 correct > 6
        task2_reference_text="Ang bata ay masaya",
        task2_transcribed_text="Ang bata ay masaya",  # 4 correct
        language="filipino",
        grade_level=1,
    )
    assert p1_high.task1_correct == 8
    assert p1_high.route == Part1Route.TASK_2H
    assert p1_high.task2_type == "sentences"
    assert p1_high.total_score == 12


def test_crla_part1_scoring_english_grade3():
    # English Grade 3 with 0 score immediately terminates with Full Refresher
    p1_zero = score_part1(
        task1_reference_text="cat dog fish bird",
        task1_transcribed_text="wrong wrong wrong wrong",
        task2_reference_text="",
        task2_transcribed_text="",
        language="english",
        grade_level=3,
    )
    assert p1_zero.task1_correct == 0
    assert p1_zero.total_score == 0
    assert p1_zero.classification == Part1Classification.FULL_REFRESHER


def test_part2_low_emerging_override_on_part1_low_score():
    # If part 1 score <= 10, Reading Profile is strictly Low Emerging Reader
    p2 = score_part2(
        reference_text="The quick brown fox jumps over the lazy dog",
        transcribed_text="The quick brown fox jumps over the lazy dog",
        reading_time_sec=30.0,
        grade_level=2,
        comprehension_correct=6,
        part1_total_score=8,  # <= 10 override
    )
    assert p2.reading_profile == ReadingProfile.LOW_EMERGING


@pytest.mark.asyncio
async def test_get_session_admin_access_allowed():
    # Admin viewing a session from their own school
    admin = MagicMock(spec=Teacher)
    admin.id = 10
    admin.role = UserRole.admin
    admin.school_id = 5

    mock_db = AsyncMock()

    mock_session = MagicMock(spec=AssessmentSession)
    mock_session.id = 101
    mock_session.is_archived = False

    with pytest.MonkeyPatch.context() as mp:
        async def mock_get_session_by_id(db, session_id, teacher_id=None, school_id=None):
            assert school_id == 5
            return mock_session

        mp.setattr("app.services.session_service.get_session_by_id", mock_get_session_by_id)
        res = await get_session(101, db=mock_db, current_teacher=admin)
        assert res == mock_session


@pytest.mark.asyncio
async def test_get_student_admin_access_allowed():
    admin = MagicMock(spec=Teacher)
    admin.id = 10
    admin.role = UserRole.admin
    admin.school_id = 5

    mock_db = AsyncMock()
    mock_student = MagicMock(spec=Student)
    mock_student.id = 55

    with pytest.MonkeyPatch.context() as mp:
        async def mock_get_student_by_id(db, student_id, teacher_id=None, school_id=None):
            assert school_id == 5
            return mock_student

        mp.setattr("app.services.student_service.get_student_by_id", mock_get_student_by_id)
        res = await get_student(55, db=mock_db, current_teacher=admin)
        assert res == mock_student
