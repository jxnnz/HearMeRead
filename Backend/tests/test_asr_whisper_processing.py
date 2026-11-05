import io
import pytest
from unittest.mock import patch, MagicMock, AsyncMock

from app.services.asr_service import (
    transcribe_audio,
    _truncate_prompt,
    _filter_hallucinations,
    SUPPORTED_MIME_TYPES,
    MAX_PROMPT_WORDS,
)


def test_supported_mime_types():
    assert "audio/webm" in SUPPORTED_MIME_TYPES
    assert "audio/wav" in SUPPORTED_MIME_TYPES
    assert "audio/mpeg" in SUPPORTED_MIME_TYPES


def test_anti_hallucination_filtering():
    raw = "Magandang umaga po sa inyong lahat. Please like and subscribe! Thank you for watching."
    filtered, removed = _filter_hallucinations(raw, [])
    assert "Please like and subscribe" not in filtered
    assert "Thank you for watching" not in filtered
    assert "Magandang umaga po sa inyong lahat." in filtered


def test_prompt_truncation_limits():
    prompt = " ".join([f"word{i}" for i in range(MAX_PROMPT_WORDS + 50)])
    truncated = _truncate_prompt(prompt)
    assert len(truncated.split()) == MAX_PROMPT_WORDS


@pytest.mark.asyncio
async def test_transcribe_audio_mocked_groq_whisper():
    fake_audio_bytes = b"RIFF....WAVEfmt ...."

    mock_whisper_response = {
        "text": "Ang munting ibon ay lumipad sa mataas na sanga.",
        "words": [
            {"word": "Ang", "start": 0.0, "end": 0.3},
            {"word": "munting", "start": 0.4, "end": 0.8},
            {"word": "ibon", "start": 0.9, "end": 1.2},
        ],
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = mock_whisper_response

    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_resp)):
        with patch("app.core.config.settings.GROQ_API_KEY", "mock-groq-key"):
            result = await transcribe_audio(
                audio_bytes=fake_audio_bytes,
                language="filipino",
                content_type="audio/wav",
                filename="test.wav",
                prompt="Ang munting ibon",
            )

            assert "Ang munting ibon" in result["transcript"]
            assert len(result["words"]) >= 3
            assert result["words"][0]["word"].lower() == "ang"
