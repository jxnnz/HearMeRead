import os
import logging
import tempfile
from pathlib import Path
from typing import Optional

import whisper

logger = logging.getLogger(__name__)

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

# Model cache — loaded once per process, reused across requests
_model_cache: dict[str, whisper.Whisper] = {}


def get_whisper_model(model_name: str) -> whisper.Whisper:
    """
    Load and cache a Whisper model by name.
    Models are loaded once and reused for all subsequent requests.

    Args:
        model_name: "tiny" for offline use, "base" for online use

    Returns:
        Loaded Whisper model instance
    """
    if model_name not in _model_cache:
        logger.info(f"Loading Whisper model: {model_name}")
        _model_cache[model_name] = whisper.load_model(model_name)
        logger.info(f"Whisper model '{model_name}' loaded and cached.")
    return _model_cache[model_name]


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
    model_name: str,
    content_type: Optional[str] = None,
    filename: Optional[str] = None,
) -> dict:
    """
    Transcribe audio bytes using Whisper.

    Args:
        audio_bytes:  Raw audio data from UploadFile.read()
        language:     "en" for English, "tl" for Filipino/Tagalog
        model_name:   "tiny" (offline) or "base" (online)
        content_type: MIME type from the upload (used to pick temp file extension)
        filename:     Original filename from upload (fallback for extension)

    Returns:
        {
            "transcript": str,           # Full transcribed text
            "words": [                   # Word-level timestamps (if available)
                {"word": str, "start": float, "end": float},
                ...
            ],
            "language": str,             # Detected or forced language
            "model": str,                # Model used
        }

    Raises:
        ValueError: If audio_bytes is empty
        RuntimeError: If Whisper transcription fails
    """
    if not audio_bytes:
        raise ValueError("Audio data is empty. Nothing to transcribe.")

    # Map app language codes to Whisper language codes
    whisper_language_map = {
        "en": "en",
        "fil": "tl",   # Filipino → Tagalog (Whisper uses ISO 639-1 "tl")
        "tl": "tl",
    }
    whisper_lang = whisper_language_map.get(language.lower(), "tl")

    ext = _resolve_extension(content_type, filename)

    # Write audio to a named temp file so ffmpeg/Whisper can read it by path
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        logger.info(
            f"Transcribing audio | file={tmp_path} | lang={whisper_lang} | model={model_name}"
        )

        model = get_whisper_model(model_name)

        result = model.transcribe(
            tmp_path,
            language=whisper_lang,
            word_timestamps=True,   # needed for miscue alignment
            fp16=False,             # fp16 requires CUDA; safe default for CPU
            verbose=False,
        )

        # Flatten word-level segments into a single list
        words = []
        for segment in result.get("segments", []):
            for w in segment.get("words", []):
                words.append(
                    {
                        "word": w["word"].strip(),
                        "start": round(w["start"], 3),
                        "end": round(w["end"], 3),
                    }
                )

        transcript = result.get("text", "").strip()
        detected_language = result.get("language", whisper_lang)

        logger.info(
            f"Transcription complete | words={len(words)} | detected_lang={detected_language}"
        )

        return {
            "transcript": transcript,
            "words": words,
            "language": detected_language,
            "model": model_name,
        }

    except Exception as e:
        logger.error(f"Whisper transcription failed: {e}", exc_info=True)
        raise RuntimeError(f"Transcription failed: {str(e)}") from e

    finally:
        # Always clean up the temp file
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
            logger.debug(f"Cleaned up temp file: {tmp_path}")