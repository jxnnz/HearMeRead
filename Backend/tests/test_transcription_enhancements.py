import pytest
from app.services.asr_service import _truncate_prompt, _filter_hallucinations, MAX_PROMPT_WORDS
from app.services.levenshtein_service import preprocess

def test_truncate_prompt():
    # Short text remains untouched
    short_text = "Si Pagong at si Matsing ay matalik na magkaibigan."
    assert _truncate_prompt(short_text) == short_text

    # Empty text
    assert _truncate_prompt("") == ""
    assert _truncate_prompt(None) is None

    # Text exceeding MAX_PROMPT_WORDS is truncated at the end (keeping the front)
    long_words = [f"salita{i}" for i in range(250)]
    long_text = " ".join(long_words)
    truncated = _truncate_prompt(long_text)
    
    truncated_words = truncated.split()
    assert len(truncated_words) == MAX_PROMPT_WORDS
    assert truncated_words[0] == "salita0"
    assert truncated_words[-1] == f"salita{MAX_PROMPT_WORDS - 1}"

def test_filter_hallucinations_patterns():
    raw_text = "Bumisita sila sa bukid. Thank you for watching! Please subscribe."
    cleaned, _ = _filter_hallucinations(raw_text, [])
    assert "Thank you for watching" not in cleaned
    assert "subscribe" not in cleaned
    assert cleaned.strip() == "Bumisita sila sa bukid."

def test_filter_hallucinations_repetition_loop():
    # Simulate Whisper loop hallucination
    loop_text = "Nagbasa siya ng aklat. at lumakad sila at lumakad sila at lumakad sila pauwi."
    cleaned, _ = _filter_hallucinations(loop_text, [])
    # Should reduce multiple repetitions
    assert cleaned.count("at lumakad sila") <= 1

def test_preprocess_hyphens_and_diacritics():
    # Hyphenated words should be separated
    tokens = preprocess("pag-ibig at nag-aral")
    assert "pag" in tokens
    assert "ibig" in tokens
    assert "nag" in tokens
    assert "aral" in tokens

def test_preprocess_whisper_artifacts():
    # Bracketed/parenthesized speech markers should be removed
    tokens = preprocess("Magandang umaga [Music] sa inyong (applause) lahat.")
    assert "music" not in tokens
    assert "applause" not in tokens
    assert tokens == ["magandang", "umaga", "sa", "inyong", "lahat"]
