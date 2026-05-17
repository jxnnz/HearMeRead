"""
letter_normalizer.py
HearMeRead — Filipino Letter Sound Normalizer

Handles post-processing of Whisper transcriptions for Grade 1 Task 1,
where students read individual letter sounds (b, ng, T, e, p, etc.).

Whisper often transcribes letter sounds as syllables (e.g., "ba" for "b",
"nga" for "ng"). This module normalizes those outputs back to canonical
letter forms before Levenshtein alignment.
"""

import re
from typing import Optional


# ---------------------------------------------------------------------------
# Filipino letter-sound mapping
# Keys: canonical letter (lowercase for matching)
# Values: common Whisper transcription variants
# ---------------------------------------------------------------------------

FILIPINO_LETTER_MAP: dict[str, list[str]] = {
    "b":  ["b", "ba", "bee", "bi", "be", "buh", "bah", "bay"],
    "ng": ["ng", "nga", "enji", "en ji", "nang", "nge", "ung", "ang", "ing"],
    "t":  ["t", "ta", "tee", "ti", "te", "tuh", "tu"],
    "e":  ["e", "eh", "ei", "ay", "ae"],
    "p":  ["p", "pa", "pee", "pi", "pe", "puh", "pu"],
    "s":  ["s", "sa", "es", "si", "se", "suh", "su"],
    "h":  ["h", "ha", "heych", "hi", "he", "huh", "hu", "aitch", "ach"],
    "g":  ["g", "ga", "gee", "gi", "ge", "guh", "gu"],
    "u":  ["u", "oo", "yu", "ou", "ooh", "wu"],
    "l":  ["l", "la", "el", "li", "le", "luh", "lu"],
    # Extended Filipino alphabet letters (for future use)
    "a":  ["a", "ah", "ay"],
    "d":  ["d", "da", "dee", "di", "de", "du"],
    "i":  ["i", "ee", "ih"],
    "k":  ["k", "ka", "key", "ki", "ke", "ku"],
    "m":  ["m", "ma", "em", "mi", "me", "mu"],
    "n":  ["n", "na", "en", "ni", "ne", "nu"],
    "o":  ["o", "oh", "ow"],
    "r":  ["r", "ra", "ar", "ri", "re", "ru"],
    "w":  ["w", "wa", "double u", "wi", "we", "wu"],
    "y":  ["y", "ya", "yee", "yi", "ye", "yu"],
}

# Build a reverse lookup: variant → canonical letter
_REVERSE_MAP: dict[str, str] = {}
for _letter, _variants in FILIPINO_LETTER_MAP.items():
    for _variant in _variants:
        _REVERSE_MAP[_variant.lower()] = _letter


def _clean_token(token: str) -> str:
    """Lowercase and strip punctuation from a single token."""
    return re.sub(r"[^\w\s]", "", token.lower()).strip()


def normalize_single_token(token: str) -> str:
    """
    Normalize a single Whisper token to its canonical letter form.
    Returns the canonical letter if found, otherwise returns the cleaned token.
    """
    cleaned = _clean_token(token)
    if not cleaned:
        return token

    # Direct lookup
    if cleaned in _REVERSE_MAP:
        return _REVERSE_MAP[cleaned]

    # Try matching first 1-2 characters (handles cases like "bah" → "b")
    for length in [3, 2, 1]:
        prefix = cleaned[:length]
        if prefix in _REVERSE_MAP:
            return _REVERSE_MAP[prefix]

    return cleaned


def normalize_letter_transcript(
    transcript: str,
    reference_letters: list[str],
) -> str:
    """
    Normalize a full Whisper transcript of letter sounds.

    Takes the raw Whisper output (e.g., "ba nga te e pa sa ha ga oo la")
    and normalizes each token to its canonical letter form
    (e.g., "b ng t e p s h g u l").

    Parameters
    ----------
    transcript : str
        Raw Whisper transcript of the student reading letter sounds.
    reference_letters : list[str]
        The expected letters (e.g., ["b", "ng", "T", "e", "p", ...]).
        Used to constrain the normalization output.

    Returns
    -------
    str
        Space-separated normalized letter tokens ready for Levenshtein alignment.
    """
    if not transcript or not transcript.strip():
        return ""

    # Clean and tokenize the transcript
    text = transcript.lower().strip()
    text = re.sub(r"[^\w\s]", "", text)
    tokens = text.split()

    if not tokens:
        return ""

    # Build a set of expected letters (lowercase) for reference-guided matching
    expected_set = {letter.lower() for letter in reference_letters}

    normalized = []
    i = 0
    while i < len(tokens):
        token = tokens[i]

        # Try combining with next token for multi-character letters (e.g., "en" + "ji" → "ng")
        if i + 1 < len(tokens):
            combined = f"{token} {tokens[i + 1]}"
            combined_clean = _clean_token(combined)
            if combined_clean in _REVERSE_MAP:
                normalized.append(_REVERSE_MAP[combined_clean])
                i += 2
                continue

        # Single token normalization
        result = normalize_single_token(token)
        normalized.append(result)
        i += 1

    return " ".join(normalized)


def is_letter_content(task1_content: str) -> bool:
    """
    Detect if task1_content represents individual letters (Grade 1)
    vs. sentences/words (Grades 2-3).

    Letters are typically single characters or 2-character digraphs (ng)
    separated by spaces, with no more than 3 characters per token.
    """
    if not task1_content or not task1_content.strip():
        return False

    tokens = task1_content.strip().split()
    if not tokens:
        return False

    # If most tokens are very short (≤ 3 chars), it's likely letters
    short_count = sum(1 for t in tokens if len(t) <= 3)
    return short_count / len(tokens) >= 0.7 and len(tokens) >= 5
