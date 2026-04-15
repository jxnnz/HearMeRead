"""
Utility functions for parsing .docx uploads into plain text.

Passage .docx:  Any Word document — all paragraph text is joined into the passage content.
Question .docx: A numbered or plain list — each non-empty paragraph becomes one question.
                Numbering prefixes like "1.", "2)", "Q1:" etc. are automatically stripped.

Both parsers use python-docx (free, no external APIs).
"""

import re
from io import BytesIO
from typing import List

from docx import Document
from fastapi import HTTPException, status


def _read_docx(file_bytes: bytes) -> Document:
    try:
        return Document(BytesIO(file_bytes))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not read the uploaded file. Make sure it is a valid .docx document.",
        )


def parse_passage_docx(file_bytes: bytes) -> str:
    """
    Extract all paragraph text from a .docx and return it as a single
    whitespace-normalised string suitable for storing as passage content.
    """
    doc = _read_docx(file_bytes)
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]

    if not paragraphs:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The uploaded document appears to be empty.",
        )

    return "\n".join(paragraphs)


# Matches common numbering prefixes: "1.", "1)", "Q1.", "Q1:", "(1)", "1 -"
_NUMBER_PREFIX = re.compile(r"^\s*(?:Q\s*)?\d+[\.\)\-\:]\s*|^\s*\(\d+\)\s*", re.IGNORECASE)


def parse_questions_docx(file_bytes: bytes) -> List[str]:
    """
    Extract each non-empty paragraph as a question.
    Strips leading numbering prefixes automatically.
    Returns a list of clean question strings.
    """
    doc = _read_docx(file_bytes)
    questions: List[str] = []

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        # Strip numbering prefix if present
        text = _NUMBER_PREFIX.sub("", text).strip()
        if text:
            questions.append(text)

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No questions found in the uploaded document.",
        )

    return questions