from typing import Optional, Union
from fastapi import APIRouter, Depends, Query, status
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
from app.services import session_service

router = APIRouter(prefix="/sessions", tags=["Sessions"])


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=SessionListResponse, summary="List assessment sessions")
async def list_sessions(
    page:             int                      = Query(1, ge=1),
    page_size:        int                      = Query(20, ge=1, le=100),
    student_id:       Optional[int]            = Query(None, description="Filter by student"),
    school_year:      Optional[str]            = Query(None, description="Filter by school year, e.g. 2024-2025"),
    period:           Optional[AssessmentPeriod] = Query(None, description="Filter by assessment period"),
    is_completed:     Optional[bool]           = Query(None, description="Filter by completion status"),
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
        include_archived=include_archived,
    )
    return SessionListResponse(total=total, page=page, page_size=page_size, sessions=sessions)


# ── Create ────────────────────────────────────────────────────────────────────

@router.post(
    "",
    summary="Start a new assessment session",
    description=(
        "Creates a new session. If the student already has a session for the same "
        "school year and period, the session is still created but a **207** response "
        "is returned with a `warning` field and the `existing_id` of the duplicate."
    ),
    responses={
        201: {"description": "Session created", "model": SessionResponse},
        207: {"description": "Session created with duplicate warning", "model": DuplicateWarning},
    },
    status_code=status.HTTP_201_CREATED,
)
async def create_session(
    data:            SessionCreate,
    db:              AsyncSession = Depends(get_db),
    current_teacher: Teacher      = Depends(get_current_teacher),
):
    session, duplicate = await session_service.create_session(
        db=db, data=data, teacher_id=current_teacher.id
    )

    if duplicate:
        return JSONResponse(
            status_code=status.HTTP_207_MULTI_STATUS,
            content=DuplicateWarning(
                warning=(
                    f"This student already has a {data.period.value} assessment "
                    f"for {data.school_year}. The new session was still created."
                ),
                existing_id=duplicate.id,
                session=SessionResponse.model_validate(session),
            ).model_dump(mode="json"),
        )

    return session


# ── Get one ───────────────────────────────────────────────────────────────────

@router.get("/{session_id}", response_model=SessionResponse, summary="Get a session")
async def get_session(
    session_id:      int,
    db:              AsyncSession = Depends(get_db),
    current_teacher: Teacher      = Depends(get_current_teacher),
):
    return await session_service.get_session_by_id(
        db=db, session_id=session_id, teacher_id=current_teacher.id
    )


# ── Complete (submit results) ─────────────────────────────────────────────────

@router.post(
    "/{session_id}/complete",
    response_model=SessionResponse,
    summary="Submit assessment results and mark session as complete",
)
async def complete_session(
    session_id:      int,
    data:            SessionComplete,
    db:              AsyncSession = Depends(get_db),
    current_teacher: Teacher      = Depends(get_current_teacher),
):
    return await session_service.complete_session(
        db=db, session_id=session_id, data=data, teacher_id=current_teacher.id
    )


# ── Update ────────────────────────────────────────────────────────────────────

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


# ── Archive ───────────────────────────────────────────────────────────────────

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


# ── Student-scoped shortcut ───────────────────────────────────────────────────

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