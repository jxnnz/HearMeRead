import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File, status, Request, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db
from app.models import Teacher, ReadingResult, Language, Question, UserRole
from app.services.asr_service import transcribe_audio, SUPPORTED_EXTENSIONS
from app.services.storage_service import upload_audio, get_presigned_url
from app.services.session_service import get_session_by_id
from app.services.audio_storage import AUDIO_RETENTION_DAYS
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
    part: Optional[str] = Form(None, description="Assessment part: 'part1' (letters/words) or 'part2' (story reading)"),
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

    # 4. Determine part tag and persist audio to R2
    part_str = str(part).lower().strip() if part else ""
    is_task2 = part_str in ("task2", "g2", "part1_task2", "t2", "1_2")
    is_part1_task1 = part_str in ("part1", "g1", "task1", "1", "t1") or (not part_str and not is_task2)
    part_prefix = "task2" if is_task2 else ("task1" if is_part1_task1 else "part2")
    base_name = audio.filename or f"recording{ext}"
    filename_to_store = f"{part_prefix}_{base_name}" if not base_name.startswith(f"{part_prefix}_") else base_name

    try:
        r2_key = await upload_audio(audio_bytes, filename_to_store, str(session_id))
    except Exception as e:
        logger.error(f"Failed to upload audio to R2 for session {session_id}: {e}")
        r2_key = None
    
    from datetime import datetime, timezone, timedelta
    expires_at = datetime.now(timezone.utc) + timedelta(days=AUDIO_RETENTION_DAYS)

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
    part_str = str(part).lower().strip() if part else ""
    is_task2 = part_str in ("task2", "g2", "part1_task2", "t2", "1_2")
    is_part1_task1 = part_str in ("part1", "g1", "task1", "1", "t1") or (not part_str and not is_task2)

    if reading_result:
        if is_task2:
            reading_result.part1_task2_audio_path = r2_key
            reading_result.part1_task2_audio_expires_at = expires_at
        elif is_part1_task1:
            reading_result.part1_audio_path = r2_key
            reading_result.part1_audio_expires_at = expires_at
        else:
            reading_result.audio_path = r2_key
            reading_result.audio_expires_at = expires_at
    else:
        reading_result = ReadingResult(
            session_id=session_id,
            part1_audio_path=r2_key if is_part1_task1 else None,
            part1_audio_expires_at=expires_at if is_part1_task1 else None,
            part1_task2_audio_path=r2_key if is_task2 else None,
            part1_task2_audio_expires_at=expires_at if is_task2 else None,
            audio_path=r2_key if (not is_part1_task1 and not is_task2) else None,
            audio_expires_at=expires_at if (not is_part1_task1 and not is_task2) else None,
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
        "part":             "task2" if is_task2 else ("part1" if is_part1_task1 else "part2"),
    }


@router.get("/{session_id}/audio")
async def get_session_audio(
    session_id: int,
    request: Request,
    token: Optional[str] = Query(None),
    part: Optional[str] = Query(None),
    task: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    # 1. Authenticate either via Authorization header or query param token (for <audio src="...">)
    auth_token = token
    if not auth_token:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            auth_token = auth_header.split(" ", 1)[1]

    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    from app.core.security import decode_access_token
    email = decode_access_token(auth_token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(Teacher).where(Teacher.email == email))
    current_teacher = result.scalar_one_or_none()
    if current_teacher is None or not current_teacher.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

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
    if not reading_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No audio recording found for this session.",
        )

    # Determine which audio path to use based on part and task parameters
    part_str = str(part).lower().strip() if part is not None else ""
    is_for_task2 = task == 2 or part_str in ("1_2", "task2", "g2", "part1_task2", "t2", "2l", "2h", "task_2")
    is_for_task1 = task == 1 or part_str in ("1", "part1", "task1", "g1", "t1")

    if is_for_task2:
        target_path = reading_result.part1_task2_audio_path or reading_result.part1_audio_path or reading_result.audio_path
        target_expires = reading_result.part1_task2_audio_expires_at or reading_result.part1_audio_expires_at or reading_result.audio_expires_at
    elif is_for_task1:
        target_path = reading_result.part1_audio_path or reading_result.audio_path
        target_expires = reading_result.part1_audio_expires_at or reading_result.audio_expires_at
    else:
        target_path = reading_result.audio_path or reading_result.part1_audio_path or reading_result.part1_task2_audio_path
        target_expires = reading_result.audio_expires_at or reading_result.part1_audio_expires_at or reading_result.part1_task2_audio_expires_at

    if not target_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No audio recording found for this assessment part.",
        )

    from datetime import datetime, timezone
    if target_expires and target_expires <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Audio recording has expired (90-day retention period ended)."
        )

    # 3. Check if local file exists (for local development/testing)
    audio_file_path = Path(target_path)
    if audio_file_path.is_file():
        from app.services.audio_storage import get_audio_media_type
        return FileResponse(
            str(audio_file_path),
            media_type=get_audio_media_type(str(audio_file_path)),
            filename=audio_file_path.name,
        )

    # 4. Stream from Cloudflare R2 via presigned URL
    presigned_url = get_presigned_url(target_path, expires_in=3600)
    if not presigned_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio file could not be accessed.",
        )

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
        # English patterns
        "thank you", "thank you.", "thank you for watching", "thank you for watching.",
        "please subscribe", "subscribe", "thanks for watching", "thanks for watching.",
        "goodbye", "bye", "bye bye", "see you", "see you next time",
        "like and subscribe", "don't forget to subscribe",
        "thank you for listening", "thank you for listening.",
        # Filipino patterns
        "salamat", "salamat po", "maraming salamat",
        "paalam", "babay",
        # Generic single-word silence artifacts
        "you", "the", "a", "i", "um", "uh", "hmm", "ah",
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

