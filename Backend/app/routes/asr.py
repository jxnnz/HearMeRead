import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.services.asr_service import transcribe_audio, SUPPORTED_EXTENSIONS
from app.services.session_service import get_session_by_id  # reuse existing service
from app.dependencies import get_current_teacher             # reuse existing auth dep
from app.models import Teacher

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["ASR"])

# Max audio file size: 25 MB (generous for a ~1–2 min Grade 2 reading)
MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024


@router.post("/{session_id}/transcribe")
async def transcribe_session_audio(
    session_id: int,
    audio: UploadFile = File(..., description="Audio recording of the student reading"),
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    """
    Transcribe a student's oral reading audio for a given assessment session.

    - Accepts WebM (live recording), MP3, WAV, M4A, or OGG
    - Uses Whisper tiny (offline) or base (online) based on session language
    - Returns the raw transcript and word-level timestamps for miscue analysis
    - Does NOT auto-complete the session — teacher reviews transcript first

    Language mapping:
      - Session language "en"  → Whisper English model
      - Session language "fil" → Whisper Tagalog (tl) model
    """

    # 1. Verify session exists and belongs to this teacher
    session = await get_session_by_id(db, session_id, current_teacher.id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment session {session_id} not found.",
        )

    # 2. Validate file extension
    if audio.filename:
        from pathlib import Path
        ext = Path(audio.filename).suffix.lower()
        if ext and ext not in SUPPORTED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported audio format '{ext}'. "
                       f"Accepted: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
            )

    # 3. Read audio bytes and enforce size limit
    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio file too large. Maximum size is 25 MB.",
        )
    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded audio file is empty.",
        )

    # 4. Determine Whisper model based on session language
    #    "tiny"  → faster, smaller, suited for offline / low-bandwidth
    #    "base"  → slightly more accurate, used when online
    language = session.language if hasattr(session, "language") else "en"
    model_name = "tiny" if language == "fil" else "base"
    # NOTE: You can also drive this from an app config / env var if preferred

    # 5. Run Whisper transcription
    try:
        result = await transcribe_audio(
            audio_bytes=audio_bytes,
            language=language,
            model_name=model_name,
            content_type=audio.content_type,
            filename=audio.filename,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Transcription error for session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transcription failed. Please try again.",
        )

    # 6. Return transcript + metadata for teacher review
    return {
        "session_id": session_id,
        "transcript": result["transcript"],
        "words": result["words"],         # [{word, start, end}, ...]
        "language": result["language"],
        "model_used": result["model"],
        "word_count": len(result["words"]),
    }