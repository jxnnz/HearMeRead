import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

AUDIO_DIR = Path("storage/audio")
AUDIO_RETENTION_DAYS = 7

_MEDIA_TYPES: dict[str, str] = {
    ".webm": "audio/webm",
    ".mp3":  "audio/mpeg",
    ".wav":  "audio/wav",
    ".m4a":  "audio/mp4",
    ".ogg":  "audio/ogg",
}


def ensure_audio_dir() -> None:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)


def save_audio(
    audio_bytes: bytes,
    session_id: int,
    extension: str,
) -> tuple[str, datetime]:
    timestamp_ms = int(time.time() * 1000)
    filename = f"{session_id}_{timestamp_ms}{extension}"
    file_path = AUDIO_DIR / filename
    file_path.write_bytes(audio_bytes)
    expires_at = datetime.now(tz=timezone.utc) + timedelta(days=AUDIO_RETENTION_DAYS)
    return str(file_path), expires_at


def delete_audio(audio_path: str) -> bool:
    path = Path(audio_path)
    if path.exists():
        path.unlink()
        return True
    return False


def get_audio_path(audio_path: str) -> Path | None:
    path = Path(audio_path)
    return path if path.exists() else None


def get_audio_media_type(audio_path: str) -> str:
    ext = Path(audio_path).suffix.lower()
    return _MEDIA_TYPES.get(ext, "audio/webm")
