from typing import Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_teacher
from app.db import get_db
from app.models import Teacher
from app.models import AssessmentPeriod
from app.schema import (
    SessionCreate,
    SessionComplete,
    SessionUpdate,
    SessionResponse,
    SessionListResponse,
    DuplicateWarning,
)
from app.schemas.session_schemas import (
    CompleteSessionIn, CompleteSessionOut,
    Task1ScoreIn, Task1ScoreOut,
    Part1ScoreIn, ObservationIn,
)
from app.schemas.session_schemas import Part1ResultOut, WordAlignmentOut
from app.services import session_service

router = APIRouter(prefix="/sessions", tags=["Sessions"])


# List
@router.get("", response_model=SessionListResponse, summary="List assessment sessions")
async def list_sessions(
    page:             int                      = Query(1, ge=1),
    page_size:        int                      = Query(20, ge=1, le=100),
    student_id:       Optional[int]            = Query(None, description="Filter by student"),
    school_year:      Optional[str]            = Query(None, description="Filter by school year, e.g. 2024-2025"),
    period:           Optional[AssessmentPeriod] = Query(None, description="Filter by assessment period"),
    is_completed:     Optional[bool]           = Query(None, description="Filter by completion status"),
    grade_level:      Optional[str]            = Query(None, description="Filter by student grade_level"),
    section:          Optional[str]            = Query(None, description="Filter by student section"),
    include_archived: bool                     = Query(False),
    db:               AsyncSession             = Depends(get_db),
    current_teacher:  Teacher                  = Depends(get_current_teacher),
):
    total, sessions = await session_service.get_sessions(
        db=db,
        teacher_id=current_teacher.id,
        page=page,
        page_size=page_size,
        student_id=student_id,
        school_year=school_year,
        period=period,
        is_completed=is_completed,
        grade_level=grade_level,
        section=section,
        include_archived=include_archived,
    )
    return SessionListResponse(total=total, page=page, page_size=page_size, sessions=sessions)


# Create
@router.post(
    "",
    summary="Start a new assessment session",
    description="Creates a new session. Only one assessment per student per school year and period is allowed.",
    responses={
        201: {"description": "Session created", "model": SessionResponse},
        409: {"description": "Duplicate session — student already assessed this period"},
    },
    status_code=status.HTTP_201_CREATED,
)
async def create_session(
    data:            SessionCreate,
    db:              AsyncSession = Depends(get_db),
    current_teacher: Teacher      = Depends(get_current_teacher),
):
    existing = await session_service.check_duplicate(
        db=db,
        teacher_id=current_teacher.id,
        student_id=data.student_id,
        school_year=data.school_year,
        period=data.period,
    )
    if existing:
        if existing.is_completed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"This student already has a completed {data.period.value.capitalize()} "
                    f"assessment for school year {data.school_year}. "
                    f"Only one assessment per period per school year is allowed."
                ),
            )
        # Incomplete session — delete it so the user can start fresh
        await db.delete(existing)
        await db.commit()

    session, _ = await session_service.create_session(
        db=db, data=data, teacher_id=current_teacher.id
    )
    return session


# Get one
@router.get("/{session_id}", response_model=SessionResponse, summary="Get a session")
async def get_session(
    session_id:      int,
    db:              AsyncSession = Depends(get_db),
    current_teacher: Teacher      = Depends(get_current_teacher),
):
    return await session_service.get_session_by_id(
        db=db, session_id=session_id, teacher_id=current_teacher.id
    )


# Complete (submit results)
@router.post(
    "/{session_id}/complete",
    response_model=CompleteSessionOut,
    status_code=200,
    summary="Submit assessment results and mark session as complete",
)
async def complete_session(
    session_id:      int,
    payload:         CompleteSessionIn,
    db:              AsyncSession = Depends(get_db),
    current_teacher: Teacher      = Depends(get_current_teacher),
):
    try:
        return await session_service.complete_session(
            session_id=session_id,
            teacher_id=current_teacher.id,
            payload=payload,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))


# Intermediate scoring (no session state change)
@router.post(
    "/{session_id}/score-task1",
    response_model=Task1ScoreOut,
    status_code=200,
    summary="Score Task 1 only — does not complete the session",
)
async def score_session_task1(
    session_id:      int,
    payload:         Task1ScoreIn,
    db:              AsyncSession = Depends(get_db),
    current_teacher: Teacher      = Depends(get_current_teacher),
):
    from app.services.levenshtein_service import preprocess, align_words, Part1Route
    from app.services.letter_normalizer import normalize_letter_transcript, is_letter_content
    await session_service.get_session_by_id(db, session_id, current_teacher.id)

    ref1 = preprocess(payload.task1_reference_text)

    # Normalize letter sounds for Grade 1 Filipino
    hyp1_text = payload.task1_transcribed_text
    if is_letter_content(payload.task1_reference_text):
        hyp1_text = normalize_letter_transcript(hyp1_text, ref1)

    hyp1 = preprocess(hyp1_text)
    lev1 = align_words(ref1, hyp1)

    language = (payload.language or "filipino").lower()
    grade = payload.grade_level or 1
    threshold = 6

    # English: score=0 ends assessment, ≥1 always goes to Words
    if language == "english":
        if lev1.correct_words == 0:
            route = Part1Route.TASK_2L
            task2_type = "words"
        else:
            route = Part1Route.TASK_2L
            task2_type = "words"
    else:
        route = Part1Route.TASK_2L if lev1.correct_words <= threshold else Part1Route.TASK_2H
        if route == Part1Route.TASK_2L:
            task2_type = "rhymes" if grade == 1 else "words"
        else:
            task2_type = "sentences"

    return Task1ScoreOut(
        task1_correct=lev1.correct_words,
        task1_miscues=lev1.total_miscues,
        route=route.value,
        task2_type=task2_type,
        alignments=[
            WordAlignmentOut(
                reference=a.reference_word,
                transcribed=a.transcribed_word,
                miscue_type=a.miscue_type.value,
            )
            for a in lev1.alignments
        ],
    )


@router.post(
    "/{session_id}/score-part1",
    response_model=Part1ResultOut,
    status_code=200,
    summary="Score Part 1 (both tasks) — does not complete the session",
)
async def score_session_part1(
    session_id:      int,
    payload:         Part1ScoreIn,
    db:              AsyncSession = Depends(get_db),
    current_teacher: Teacher      = Depends(get_current_teacher),
):
    from app.services.levenshtein_service import score_part1
    await session_service.get_session_by_id(db, session_id, current_teacher.id)

    p1 = score_part1(
        task1_reference_text=payload.task1_reference_text,
        task1_transcribed_text=payload.task1_transcribed_text,
        task2_reference_text=payload.task2_reference_text,
        task2_transcribed_text=payload.task2_transcribed_text,
        language=payload.language or "filipino",
        grade_level=payload.grade_level or 1,
    )

    return Part1ResultOut(
        task1_correct=p1.task1_correct,
        task1_miscues=p1.task1_miscues,
        route=p1.route.value if p1.route else "",
        task2_type=p1.task2_type or "",
        task2_correct=p1.task2_correct,
        task2_miscues=p1.task2_miscues,
        total_score=p1.total_score,
        classification=p1.classification.value if p1.classification else "",
        task1_alignments=[
            WordAlignmentOut(
                reference=a.reference_word,
                transcribed=a.transcribed_word,
                miscue_type=a.miscue_type.value,
            )
            for a in p1.task1_alignments
        ],
        task2_alignments=[
            WordAlignmentOut(
                reference=a.reference_word,
                transcribed=a.transcribed_word,
                miscue_type=a.miscue_type.value,
            )
            for a in p1.task2_alignments
        ],
    )


# Observation (intermediate — does not complete session)
@router.post(
    "/{session_id}/observe",
    status_code=200,
    summary="Save teacher observation — does not complete the session",
)
async def save_session_observation(
    session_id:      int,
    payload:         ObservationIn,
    db:              AsyncSession = Depends(get_db),
    current_teacher: Teacher      = Depends(get_current_teacher),
):
    await session_service.get_session_by_id(db, session_id, current_teacher.id)
    obs = await session_service.save_observation(
        db=db,
        session_id=session_id,
        observation_level=payload.observation_level,
        teacher_remarks=payload.teacher_remarks,
        learner_experience=payload.learner_experience,
    )
    return {
        "session_id":       session_id,
        "observation_level": obs.fluency_level,
        "teacher_remarks":   obs.teacher_remarks,
    }


# Update
@router.patch(
    "/{session_id}",
    summary="Update a session",
    responses={
        200: {"description": "Session updated",                          "model": SessionResponse},
        207: {"description": "Session updated with duplicate warning",   "model": DuplicateWarning},
    },
)
async def update_session(
    session_id:      int,
    data:            SessionUpdate,
    db:              AsyncSession = Depends(get_db),
    current_teacher: Teacher      = Depends(get_current_teacher),
):
    session, duplicate = await session_service.update_session(
        db=db, session_id=session_id, data=data, teacher_id=current_teacher.id
    )

    if duplicate:
        return JSONResponse(
            status_code=status.HTTP_207_MULTI_STATUS,
            content=DuplicateWarning(
                warning=(
                    f"Another session for this student already exists for "
                    f"{session.school_year} {session.period.value}. "
                    f"The update was still saved."
                ),
                existing_id=duplicate.id,
                session=SessionResponse.model_validate(session),
            ).model_dump(mode="json"),
        )

    return session


# Archive
@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Archive a session (soft delete)",
)
async def archive_session(
    session_id:      int,
    db:              AsyncSession = Depends(get_db),
    current_teacher: Teacher      = Depends(get_current_teacher),
):
    await session_service.archive_session(
        db=db, session_id=session_id, teacher_id=current_teacher.id
    )


# Student-scoped shortcut
student_sessions_router = APIRouter(tags=["Sessions"])

@student_sessions_router.get(
    "/students/{student_id}/sessions",
    response_model=SessionListResponse,
    summary="List all sessions for a specific student",
)
async def list_student_sessions(
    student_id:   int,
    school_year:  Optional[str]              = Query(None),
    period:       Optional[AssessmentPeriod] = Query(None),
    page:         int                        = Query(1, ge=1),
    page_size:    int                        = Query(20, ge=1, le=100),
    db:           AsyncSession               = Depends(get_db),
    current_teacher: Teacher                 = Depends(get_current_teacher),
):
    total, sessions = await session_service.get_sessions(
        db=db,
        teacher_id=current_teacher.id,
        page=page,
        page_size=page_size,
        student_id=student_id,
        school_year=school_year,
        period=period,
        is_completed=None,
        include_archived=False,
    )
    return SessionListResponse(total=total, page=page, page_size=page_size, sessions=sessions)