import pytest
from app.models import SessionObservation


def test_session_observation_valid_ratings():
    obs = SessionObservation(
        session_id=1,
        comprehension_correct=4,
        comprehension_total=5,
        fluency_level=3,
        learner_experience=4,
        teacher_remarks="Reads smoothly with occasional hesitation.",
    )
    assert obs.comprehension_correct == 4
    assert obs.comprehension_total == 5
    assert obs.fluency_level == 3
    assert obs.learner_experience == 4


def test_session_observation_invalid_fluency_rating():
    with pytest.raises(ValueError, match="fluency_level must be between 1 and 4"):
        obs = SessionObservation(session_id=1)
        obs.validate_fluency_level("fluency_level", 5)


def test_session_observation_invalid_learner_experience_rating():
    with pytest.raises(ValueError, match="learner_experience must be between 1 and 5"):
        obs = SessionObservation(session_id=1)
        obs.validate_learner_experience("learner_experience", 7)
