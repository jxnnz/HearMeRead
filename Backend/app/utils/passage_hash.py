import re
import hashlib
from typing import Optional


def normalize_text(text: Optional[str]) -> str:
    """
    Normalizes text for duplicate content comparison:
    - Replaces CRLF/CR with LF
    - Strips leading/trailing whitespace on each line
    - Collapses consecutive whitespace (spaces/tabs) within lines to a single space
    - Collapses 3+ consecutive newlines to 2 newlines
    - Strips leading/trailing document whitespace
    - Lowercases text
    """
    if not text:
        return ""
    # Standardize line endings
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    # Clean whitespace line by line
    cleaned_lines = []
    for line in normalized.split("\n"):
        line_clean = re.sub(r"[ \t]+", " ", line).strip()
        cleaned_lines.append(line_clean)
    normalized = "\n".join(cleaned_lines)
    # Collapse multiple blank lines
    normalized = re.sub(r"\n{3,}", "\n\n", normalized).strip().lower()
    return normalized


def compute_passage_hash(
    assessment_type: Optional[int],
    content: Optional[str] = None,
    task1_content: Optional[str] = None,
    task2_words: Optional[str] = None,
    task2_sentences: Optional[str] = None,
) -> Optional[str]:
    """
    Computes a canonical SHA-256 hash for a passage based on its normalized content.
    Returns None if there is no substantive content.
    """
    is_a1 = (assessment_type == 1) or (assessment_type is None and task1_content is not None)

    if is_a1:
        n_t1 = normalize_text(task1_content)
        n_t2w = normalize_text(task2_words)
        n_t2s = normalize_text(task2_sentences)
        if not n_t1 and not n_t2w and not n_t2s:
            return None
        payload = f"a1:{n_t1}|{n_t2w}|{n_t2s}"
    else:
        n_content = normalize_text(content)
        if not n_content:
            return None
        payload = f"a2:{n_content}"

    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
