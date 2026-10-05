import io
import logging
import re
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

# ---------------------------------------------------------------------------
# Anti-hallucination helpers
# ---------------------------------------------------------------------------

# Whisper's prompt parameter is limited to 224 tokens (~180 words).
# If we exceed this, Whisper silently keeps only the LAST 224 tokens,
# which means the BEGINNING of the passage (where the student starts
# reading) gets dropped — causing hallucinations in the early transcript.
MAX_PROMPT_WORDS = 180

# Common Whisper hallucination patterns produced on silence or background noise
HALLUCINATION_PATTERNS = [
    r"(?i)\bthank\s*you\s*(for\s*(watching|listening|viewing))?\s*[.!]*",
    r"(?i)\bplease\s*(subscribe|like)\b[.!]*",
    r"(?i)\bsee\s+you\s*(next\s*time|in\s+the\s+next)?\b[.!]*",
    r"(?i)\bgoodbye\b[.!]*",
    r"(?i)\bbye[\s-]*bye\b[.!]*",
    r"(?i)\bdon'?t\s+forget\s+to\s+subscribe\b[.!]*",
    r"(?i)\bhit\s+the\s+(bell|like)\b[.!]*",
    r"(?i)\blike\s+and\s+subscribe\b[.!]*",
    r"(?i)\bthanks\s+for\s+(watching|listening)\b[.!]*",
    r"(?i)\bsubscribe\s+to\s+my\s+channel\b[.!]*",
]


def _truncate_prompt(text: str) -> str:
    """
    Truncate prompt text to stay within Whisper's 224-token limit.

    Keeps the BEGINNING of the text (where the student starts reading),
    because Whisper silently drops tokens beyond 224 from the front.
    By pre-truncating to ~180 words we ensure the most useful context
    (the start of the passage) is always included.
    """
    if not text:
        return text
    words = text.strip().split()
    if len(words) <= MAX_PROMPT_WORDS:
        return text.strip()
    return " ".join(words[:MAX_PROMPT_WORDS])


def _filter_hallucinations(
    transcript: str,
    words: list,
) -> tuple:
    """
    Remove known Whisper hallucination patterns from transcript and
    detect repetition loops (same 3-5 word phrase repeated 3+ times).

    Returns (cleaned_transcript, cleaned_words).
    """
    if not transcript:
        return transcript, words

    cleaned = transcript

    # Strip known hallucination phrases
    for pattern in HALLUCINATION_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned)

    # Detect repetition loops: if the same 3-5 word phrase appears 3+ times,
    # keep only the first occurrence — this is a strong hallucination signal.
    words_list = cleaned.split()
    if len(words_list) > 10:
        for ngram_len in [5, 4, 3]:
            ngram_counts: dict[str, int] = {}
            for i in range(len(words_list) - ngram_len + 1):
                ngram = " ".join(words_list[i:i + ngram_len]).lower()
                ngram_counts[ngram] = ngram_counts.get(ngram, 0) + 1
            for ngram, count in ngram_counts.items():
                if count >= 3:
                    # Remove all but the first occurrence
                    pattern_esc = re.escape(ngram)
                    matches = list(re.finditer(pattern_esc, cleaned, re.IGNORECASE))
                    if len(matches) > 1:
                        for match in reversed(matches[1:]):
                            cleaned = cleaned[:match.start()] + cleaned[match.end():]

    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # Re-filter the words list to match the cleaned transcript
    if words and cleaned != transcript:
        cleaned_lower_words = set(cleaned.lower().split())
        filtered_words = [
            w for w in words
            if w.get("word", "").strip().lower() in cleaned_lower_words
        ]
        words = filtered_words

    return cleaned, words


# ---------------------------------------------------------------------------
# File extension resolver
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Main transcription function
# ---------------------------------------------------------------------------

async def transcribe_audio(
    audio_bytes: bytes,
    language: str,
    content_type: Optional[str] = None,
    filename: Optional[str] = None,
    prompt: Optional[str] = None,
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
        f"size={len(audio_bytes)} bytes | ext={ext} | "
        f"prompt={'yes' if prompt else 'no'}"
    )

    request_data = {
        "model": "whisper-large-v3",
        "language": whisper_lang,
        "response_format": "verbose_json",
        "timestamp_granularities[]": "word",
        "temperature": "0.0",
    }
    # Providing the reference passage as a prompt anchors Whisper to the
    # expected vocabulary and significantly reduces hallucinations on silence
    # or unclear audio (e.g. "Thank you for watching!" artifacts).
    # We truncate to ~180 words to stay within Whisper's 224-token limit,
    # keeping the BEGINNING of the passage (where the student starts reading).
    if prompt and prompt.strip():
        request_data["prompt"] = _truncate_prompt(prompt)

    # Retry once on timeout (long recordings can be slow under API load)
    max_retries = 2
    last_error = None

    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                response = await client.post(
                    GROQ_TRANSCRIPTION_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                    },
                    files={
                        "file": (upload_filename, audio_bytes, content_type or "audio/webm"),
                    },
                    data=request_data,
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

            # Post-processing: remove hallucination artifacts
            transcript, words = _filter_hallucinations(transcript, words)

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
            last_error = "Transcription request timed out."
            logger.warning(
                f"Groq API timeout (attempt {attempt + 1}/{max_retries})"
            )
            if attempt < max_retries - 1:
                continue  # retry
            raise RuntimeError(
                "Transcription request timed out after retries. Please try again."
            )
        except httpx.RequestError as e:
            logger.error(f"Groq API request failed: {e}", exc_info=True)
            raise RuntimeError(f"Failed to connect to Groq API: {str(e)}")
        except RuntimeError:
            raise  # Re-raise our own RuntimeErrors
        except Exception as e:
            logger.error(f"Groq transcription failed: {e}", exc_info=True)
            raise RuntimeError(f"Transcription failed: {str(e)}") from e