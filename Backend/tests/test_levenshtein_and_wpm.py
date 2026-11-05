import pytest
from app.services.levenshtein_service import (
    align_words,
    score_part2,
    score_part1,
    _classify_reading_profile,
    MiscueType,
    ReadingProfile,
    Part1Route,
)


def test_align_words_exact_match():
    ref = ["si", "pagong", "at", "si", "matsing"]
    hyp = ["si", "pagong", "at", "si", "matsing"]
    res = align_words(ref, hyp)

    assert res.total_miscues == 0
    assert res.correct_words == 5
    assert len(res.alignments) == 5
    for a in res.alignments:
        assert a.miscue_type == MiscueType.CORRECT


def test_align_words_substitutions_and_insertions():
    ref = ["ang", "bata", "ay", "masaya"]
    hyp = ["ang", "aso", "ay", "napakasaya", "masaya"]
    res = align_words(ref, hyp)

    assert res.substitutions >= 1  # bata -> aso
    assert res.insertions >= 1     # napakasaya
    assert res.total_miscues > 0


def test_score_part2_cwpm_and_reading_profile():
    ref_text = "May isang maliit na ibon na umaawit tuwing umaga."
    transcribed = "May isang maliit na ibon na umaawit tuwing umaga."
    # 9 words in 30 seconds -> (9 / 0.5) = 18.0 CWPM
    res = score_part2(
        reference_text=ref_text,
        transcribed_text=transcribed,
        reading_time_sec=30.0,
        grade_level=2,
        comprehension_correct=4,
    )

    assert res.cwpm == 18.0
    assert res.total_miscues == 0
    assert res.accuracy_pct == 100.0
    assert res.reading_profile in [p.value for p in ReadingProfile]


def test_part1_routing_and_scoring():
    # Task 1 reference and high score
    t1_ref = "m s a i o b t k l y"
    t1_hyp_high = "m s a i o b t k"
    t2_ref = "aso pusa bola mesa"
    t2_hyp = "aso pusa"

    res_high = score_part1(
        task1_reference_text=t1_ref,
        task1_transcribed_text=t1_hyp_high,
        task2_reference_text=t2_ref,
        task2_transcribed_text=t2_hyp,
        language="filipino",
        threshold=6,
    )
    assert res_high.route == Part1Route.TASK_2H
    assert res_high.task1_correct >= 7

    # Low score
    t1_hyp_low = "m s a"
    res_low = score_part1(
        task1_reference_text=t1_ref,
        task1_transcribed_text=t1_hyp_low,
        task2_reference_text=t2_ref,
        task2_transcribed_text=t2_hyp,
        language="filipino",
        threshold=6,
    )
    assert res_low.route == Part1Route.TASK_2L
    assert res_low.task1_correct <= 6
