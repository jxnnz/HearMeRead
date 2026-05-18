from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, and_

from app.db import get_db
from app.dependencies import get_current_teacher
from app.models import (
    Teacher, Student, AssessmentSession,
    ReadingResult, SessionObservation,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

PROFILES = [
    "Low Emerging Reader",
    "High Emerging Reader",
    "Developing Reader",
    "Transitioning Reader",
    "Reading at Grade Level",
]


def _current_school_year() -> str:
    now = date.today()
    y, m = now.year, now.month
    return f"{y}-{y+1}" if m >= 6 else f"{y-1}-{y}"


def _to_pct(count_dict: dict) -> dict:
    total = sum(count_dict.values())
    if total == 0:
        return {p: 0 for p in PROFILES}
    return {p: round(count_dict.get(p, 0) / total * 100, 1) for p in PROFILES}


def _safe_round(val, decimals=1):
    return round(float(val), decimals) if val is not None else None


@router.get("/summary", summary="Get dashboard summary stats and chart data")
async def get_dashboard_summary(
    school_year: Optional[str] = Query(None, description="e.g. 2024-2025"),
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    teacher_id = current_teacher.id
    sy = school_year or _current_school_year()

    # Reusable filter for completed, non-archived sessions this school year
    completed_filter = and_(
        AssessmentSession.teacher_id == teacher_id,
        AssessmentSession.school_year == sy,
        AssessmentSession.is_completed == True,
        AssessmentSession.is_archived == False,
    )
    # Narrows to A2 sessions (have a ReadingResult with passage words)
    a2_filter = and_(
        completed_filter,
        ReadingResult.total_words.isnot(None),
        ReadingResult.total_words > 0,
    )

    # 1. Total students for this teacher
    total_students = (await db.scalar(
        select(func.count(Student.id))
        .where(Student.teacher_id == teacher_id)
    )) or 0

    # 2. Completed sessions this school year
    total_assessed = (await db.scalar(
        select(func.count(AssessmentSession.id))
        .where(completed_filter)
    )) or 0

    # 3. Avg accuracy % and error rate from A2 results
    acc_result = (await db.execute(
        select(
            func.avg(
                (ReadingResult.total_words - ReadingResult.miscue_count)
                * 100.0 / ReadingResult.total_words
            ).label("avg_acc"),
            func.avg(
                ReadingResult.miscue_count * 100.0 / ReadingResult.total_words
            ).label("avg_err"),
        )
        .join(AssessmentSession, AssessmentSession.id == ReadingResult.session_id)
        .where(a2_filter)
    )).one()

    avg_accuracy   = _safe_round(acc_result.avg_acc)
    avg_error_rate = _safe_round(acc_result.avg_err)

    # 4. Reading profile distribution by sex (as %)
    profile_rows = (await db.execute(
        select(Student.sex, ReadingResult.reading_profile, func.count().label("cnt"))
        .join(AssessmentSession, AssessmentSession.student_id == Student.id)
        .join(ReadingResult, ReadingResult.session_id == AssessmentSession.id)
        .where(completed_filter, ReadingResult.reading_profile.isnot(None))
        .group_by(Student.sex, ReadingResult.reading_profile)
    )).all()

    raw_counts: dict = {"female": {}, "male": {}, "total": {}}
    for row in profile_rows:
        sex_key = row.sex.value if row.sex else None
        if sex_key in raw_counts:
            raw_counts[sex_key][row.reading_profile] = (
                raw_counts[sex_key].get(row.reading_profile, 0) + row.cnt
            )
        raw_counts["total"][row.reading_profile] = (
            raw_counts["total"].get(row.reading_profile, 0) + row.cnt
        )

    profile_distribution = {k: _to_pct(v) for k, v in raw_counts.items()}

    # 5. Gender distribution of assessed students (%)
    gender_rows = (await db.execute(
        select(Student.sex, func.count(AssessmentSession.id).label("cnt"))
        .join(AssessmentSession, AssessmentSession.student_id == Student.id)
        .where(completed_filter)
        .group_by(Student.sex)
    )).all()

    gender_counts = {"female": 0, "male": 0}
    for row in gender_rows:
        if row.sex and row.sex.value in gender_counts:
            gender_counts[row.sex.value] += row.cnt
    gender_total = sum(gender_counts.values())
    gender_distribution = {
        "female": round(gender_counts["female"] / gender_total * 100, 1) if gender_total else 0,
        "male":   round(gender_counts["male"]   / gender_total * 100, 1) if gender_total else 0,
    }

    # 6. Fluency + comprehension averages by sex (A2 students only)
    # comprehension_pct = correct answers / total questions * 100
    comp_pct_expr = case(
        (SessionObservation.comprehension_total > 0,
         SessionObservation.comprehension_correct * 100.0
         / SessionObservation.comprehension_total),
        else_=None,
    )
    accuracy_pct_expr = (
        (ReadingResult.total_words - ReadingResult.miscue_count)
        * 100.0 / ReadingResult.total_words
    )

    fluency_base = (
        select(
            Student.sex,
            func.avg(accuracy_pct_expr).label("avg_acc_pct"),
            func.avg(ReadingResult.cwpm).label("avg_cwpm"),
            func.avg(comp_pct_expr).label("avg_comp_pct"),
        )
        .select_from(Student)
        .join(AssessmentSession, AssessmentSession.student_id == Student.id)
        .join(ReadingResult, ReadingResult.session_id == AssessmentSession.id)
        .outerjoin(SessionObservation, SessionObservation.session_id == AssessmentSession.id)
        .where(a2_filter)
    )

    fluency_by_sex = (await db.execute(fluency_base.group_by(Student.sex))).all()

    # "All" group — no sex grouping
    all_row = (await db.execute(
        select(
            func.avg(accuracy_pct_expr).label("avg_acc_pct"),
            func.avg(ReadingResult.cwpm).label("avg_cwpm"),
            func.avg(comp_pct_expr).label("avg_comp_pct"),
        )
        .select_from(Student)
        .join(AssessmentSession, AssessmentSession.student_id == Student.id)
        .join(ReadingResult, ReadingResult.session_id == AssessmentSession.id)
        .outerjoin(SessionObservation, SessionObservation.session_id == AssessmentSession.id)
        .where(a2_filter)
    )).one()

    def _acc_entry(label, r):
        return {
            "group":         label,
            "fluency":       _safe_round(r.avg_acc_pct)  or 0,
            "comprehension": _safe_round(r.avg_comp_pct) or 0,
        }

    def _wpm_entry(label, r):
        cwpm     = float(r.avg_cwpm)     if r.avg_cwpm     is not None else 0.0
        comp_pct = float(r.avg_comp_pct) if r.avg_comp_pct is not None else 0.0
        return {
            "group":         label,
            "fluency":       round(cwpm, 1),
            "comprehension": round(cwpm * comp_pct / 100, 1),
        }

    sex_labels = {"female": "Female", "male": "Male"}

    fluency_accuracy = [_acc_entry("All", all_row)]
    fluency_wpm      = [_wpm_entry("All", all_row)]

    for row in fluency_by_sex:
        label = sex_labels.get(row.sex.value if row.sex else "", "Other")
        if label == "Other":
            continue
        fluency_accuracy.append(_acc_entry(label, row))
        fluency_wpm.append(_wpm_entry(label, row))

    return {
        "school_year": sy,
        "stats": {
            "total_students":   total_students,
            "total_assessed":   total_assessed,
            "avg_accuracy_pct": avg_accuracy,
            "avg_error_rate":   avg_error_rate,
        },
        "profile_distribution": profile_distribution,
        "gender_distribution":  gender_distribution,
        "fluency_accuracy":     fluency_accuracy,
        "fluency_wpm":          fluency_wpm,
    }
