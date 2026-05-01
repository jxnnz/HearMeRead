import io
import logging
import tempfile
import os
from pathlib import Path
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Groq API endpoint
GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions"

# Supported audio MIME types → file extensions
SUPPORTED_MIME_TYPES = {
    "audio/webm": ".webm",
    "audio/webm;codecs=opus": ".webm",
    "audio/mp4": ".m4a",
    "audio/m4a": ".m4a",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/wave": ".wav",
    "audio/ogg": ".ogg",
    "audio/ogg;codecs=opus": ".ogg",
    "application/octet-stream": ".webm",  # fallback for MediaRecorder blobs
}

# Supported file extensions (for upload validation)
SUPPORTED_EXTENSIONS = {".webm", ".mp3", ".wav", ".m4a", ".ogg", ".mp4"}


def _resolve_extension(content_type: Optional[str], filename: Optional[str]) -> str:
    """
    Determine the file extension to use when saving the audio temp file.
    Prefers content_type, falls back to filename extension, then defaults to .webm.
    """
    if content_type:
        ct = content_type.lower().strip()
        if ct in SUPPORTED_MIME_TYPES:
            return SUPPORTED_MIME_TYPES[ct]

    if filename:
        ext = Path(filename).suffix.lower()
        if ext in SUPPORTED_EXTENSIONS:
            return ext

    return ".webm"


async def transcribe_audio(
    audio_bytes: bytes,
    language: str,
    content_type: Optional[str] = None,
    filename: Optional[str] = None,
) -> dict:
    """
    Transcribe audio bytes using the Groq Whisper API (whisper-large-v3).

    This sends audio to Groq's cloud API instead of running Whisper locally,
    providing faster transcription with no local CPU/GPU strain.

    Args:
        audio_bytes:  Raw audio data from UploadFile.read()
        language:     "en" for English, "fil" for Filipino/Tagalog
        content_type: MIME type from the upload (used to pick temp file extension)
        filename:     Original filename from upload (fallback for extension)

    Returns:
        {
            "transcript": str,           # Full transcribed text
            "words": [                   # Word-level timestamps
                {"word": str, "start": float, "end": float},
                ...
            ],
            "language": str,             # Detected or forced language
            "model": str,                # Model used
        }

    Raises:
        ValueError: If audio_bytes is empty or GROQ_API_KEY is not configured
        RuntimeError: If Groq API transcription fails
    """
    if not audio_bytes:
        raise ValueError("Audio data is empty. Nothing to transcribe.")

    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise ValueError(
            "GROQ_API_KEY is not configured. "
            "Get a free key at https://console.groq.com/keys"
        )

    # Map app language codes to Whisper language codes (ISO 639-1)
    whisper_language_map = {
        "en": "en",
        "fil": "tl",   # Filipino → Tagalog (Whisper uses ISO 639-1 "tl")
        "tl": "tl",
    }
    whisper_lang = whisper_language_map.get(language.lower(), "tl")

    ext = _resolve_extension(content_type, filename)
    upload_filename = filename or f"audio{ext}"

    logger.info(
        f"Transcribing audio via Groq API | lang={whisper_lang} | "
        f"size={len(audio_bytes)} bytes | ext={ext}"
    )

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                GROQ_TRANSCRIPTION_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                },
                files={
                    "file": (upload_filename, audio_bytes, content_type or "audio/webm"),
                },
                data={
                    "model": "whisper-large-v3",
                    "language": whisper_lang,
                    "response_format": "verbose_json",
                    "timestamp_granularities[]": "word",
                    "temperature": "0.0",
                },
            )

        if response.status_code != 200:
            error_detail = response.text
            logger.error(
                f"Groq API error (HTTP {response.status_code}): {error_detail}"
            )
            raise RuntimeError(
                f"Groq API returned HTTP {response.status_code}: {error_detail}"
            )

        result = response.json()

        # Extract word-level timestamps from Groq's verbose_json response
        words = []
        for w in result.get("words", []):
            words.append(
                {
                    "word": w.get("word", "").strip(),
                    "start": round(w.get("start", 0.0), 3),
                    "end": round(w.get("end", 0.0), 3),
                }
            )

        transcript = result.get("text", "").strip()
        detected_language = result.get("language", whisper_lang)

        logger.info(
            f"Groq transcription complete | words={len(words)} | "
            f"detected_lang={detected_language}"
        )

        return {
            "transcript": transcript,
            "words": words,
            "language": detected_language,
            "model": "whisper-large-v3 (Groq API)",
        }

    except httpx.TimeoutException:
        logger.error("Groq API request timed out")
        raise RuntimeError(
            "Transcription request timed out. Please try again."
        )
    except httpx.RequestError as e:
        logger.error(f"Groq API request failed: {e}", exc_info=True)
        raise RuntimeError(f"Failed to connect to Groq API: {str(e)}")
    except RuntimeError:
        raise  # Re-raise our own RuntimeErrors
    except Exception as e:
        logger.error(f"Groq transcription failed: {e}", exc_info=True)
        raise RuntimeError(f"Transcription failed: {str(e)}") from e