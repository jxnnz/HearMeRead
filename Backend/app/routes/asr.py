import logging
from pathlib import Path

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db
from app.models import Teacher, ReadingResult, Language, Question, UserRole
from app.services.asr_service import transcribe_audio, SUPPORTED_EXTENSIONS
from app.services.storage_service import upload_audio, get_presigned_url
from app.services.session_service import get_session_by_id
from app.dependencies import get_current_teacher

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["ASR"])

def _is_admin(teacher: Teacher) -> bool:
    if not teacher or not hasattr(teacher, "role"):
        return False
    r = teacher.role
    return r == UserRole.admin or str(r).upper() in ("ADMIN", "USERROLE.ADMIN")

MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024


@router.post("/{session_id}/transcribe")
async def transcribe_session_audio(
    session_id: int,
    audio: UploadFile = File(..., description="Audio recording of the student reading"),
    prompt: str = Form(None, description="Reference passage text to guide Whisper and reduce hallucinations"),
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    # 1. Verify session exists and belongs to this teacher (raises 404 if not)
    session = await get_session_by_id(db, session_id, current_teacher.id)

    # 2. Validate file extension; default to .webm when no filename is provided
    ext = ".webm"
    if audio.filename:
        file_ext = Path(audio.filename).suffix.lower()
        if file_ext:
            if file_ext not in SUPPORTED_EXTENSIONS:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail=f"Unsupported audio format '{file_ext}'. "
                           f"Accepted: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
                )
            ext = file_ext

    # 3. Read bytes; enforce size and non-empty
    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio file too large. Maximum size is 25 MB.",
        )
    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded audio file is empty.",
        )

    # 4. Persist audio to R2
    try:
        r2_key = await upload_audio(audio_bytes, audio.filename or "audio.webm", str(session_id))
    except Exception as e:
        logger.error(f"Failed to upload audio to R2 for session {session_id}: {e}")
        r2_key = None
    
    from datetime import datetime, timezone, timedelta
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    # 5. Determine language code
    lang_code = "fil" if session.language == Language.filipino else "en"

    # 6. Transcribe via Groq Whisper API (whisper-large-v3)
    try:
        result = await transcribe_audio(
            audio_bytes=audio_bytes,
            language=lang_code,
            content_type=audio.content_type,
            filename=audio.filename,
            prompt=prompt,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Transcription error for session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transcription failed. Please try again.",
        )

    # 7. Upsert ReadingResult — update audio fields if row exists, else create minimal row
    rr_query = await db.execute(
        select(ReadingResult).where(ReadingResult.session_id == session_id)
    )
    reading_result = rr_query.scalar_one_or_none()
    if reading_result:
        reading_result.audio_path = r2_key
        reading_result.audio_expires_at = expires_at
    else:
        reading_result = ReadingResult(
            session_id=session_id,
            audio_path=r2_key,
            audio_expires_at=expires_at,
        )
        db.add(reading_result)
    await db.commit()

    return {
        "session_id":       session_id,
        "transcript":       result["transcript"],
        "words":            result["words"],
        "language":         result["language"],
        "model_used":       result["model"],
        "word_count":       len(result["words"]),
        "audio_stored":     True,
        "audio_expires_at": expires_at.isoformat(),
    }


@router.get("/{session_id}/audio")
async def get_session_audio(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    if _is_admin(current_teacher):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can view individual student assessment records."
        )
    await get_session_by_id(db, session_id, current_teacher.id)

    # 2. Fetch ReadingResult; 404 if no row or audio not stored
    rr_query = await db.execute(
        select(ReadingResult).where(ReadingResult.session_id == session_id)
    )
    reading_result = rr_query.scalar_one_or_none()
    if not reading_result or reading_result.audio_path is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No audio recording found for this session.",
        )

    # 3. Stream the file directly from R2, or return a presigned URL.
    # Since the frontend might expect an audio stream, we can either return a RedirectResponse to the presigned URL,
    # or return a JSON with the URL. If the client uses an <audio src="/sessions/X/audio"> tag, 
    # a RedirectResponse to the R2 URL works perfectly.
    
    presigned_url = get_presigned_url(reading_result.audio_path, expires_in=3600)
    
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=presigned_url)


@router.post("/{session_id}/questions/{question_id}/score-answer")
async def score_comprehension_answer(
    session_id: int,
    question_id: int,
    audio: UploadFile = File(..., description="Audio recording of the student's answer"),
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    # 1. Verify session exists and belongs to this teacher
    session = await get_session_by_id(db, session_id, current_teacher.id)

    # 2. Fetch the question to get the question text and answer key
    question_query = await db.execute(
        select(Question).where(Question.id == question_id)
    )
    question = question_query.scalar_one_or_none()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question with ID {question_id} not found."
        )

    # 3. Validate audio file type and read bytes
    ext = ".webm"
    if audio.filename:
        file_ext = Path(audio.filename).suffix.lower()
        if file_ext:
            if file_ext not in SUPPORTED_EXTENSIONS:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail=f"Unsupported audio format '{file_ext}'. Accepted: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
                )
            ext = file_ext

    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio file too large. Maximum size is 25 MB."
        )
    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded audio file is empty."
        )

    # 4. Transcribe using Groq Whisper API (whisper-large-v3)
    # We pass the expected answer as prompt to bias transcription and reduce hallucinations
    lang_code = "fil" if session.language == Language.filipino else "en"
    try:
        result = await transcribe_audio(
            audio_bytes=audio_bytes,
            language=lang_code,
            content_type=audio.content_type,
            filename=audio.filename,
            prompt=question.answer_key,
        )
    except Exception as e:
        logger.error(f"Transcription failed for question {question_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transcription failed. Please try again."
        )

    transcript = result.get("transcript", "").strip()

    # 5. Check if transcript is empty or matches known silence hallucinations
    HALLUCINATION_BLACKLIST = {
        "thank you", "thank you.", "thank you for watching", "thank you for watching.",
        "bye", "bye.", "please subscribe", "subscribe", "watching", "you"
    }
    cleaned_transcript = transcript.lower().strip(".,?! ")
    if not cleaned_transcript or cleaned_transcript in HALLUCINATION_BLACKLIST:
        return {
            "transcript": "",
            "mark": "no_answer",
            "explanation": "No audio detected or empty speech."
        }

    # 6. Grade the answer via Groq LLM Grader (llama3-8b-8192)
    from app.services.llm_service import grade_comprehension_answer
    grading = await grade_comprehension_answer(
        question_text=question.text,
        reference_answer=question.answer_key or "",
        student_transcript=transcript,
    )

    return {
        "transcript": transcript,
        "mark": grading["classification"],
        "explanation": grading["explanation"]
    }

