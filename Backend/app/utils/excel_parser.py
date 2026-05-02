"""
CRLA Excel parser — reads the official DepEd CRLA assessment spreadsheet
and returns structured data for bulk import.

Supports the standard CRLA format:
  - Top rows contain metadata: Grade, Section, Language
  - A header row is identified by finding the "LRN" column
  - Data rows follow immediately below the header row
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from io import BytesIO
from typing import Optional

try:
    import openpyxl
except ImportError:
    openpyxl = None  # type: ignore


# ── Helpers ───────────────────────────────────────────────────────────────────

def _str(cell) -> str:
    """Return cell value as a stripped string, or ''."""
    v = cell.value if hasattr(cell, "value") else cell
    return str(v).strip() if v is not None else ""


def _int(cell) -> Optional[int]:
    v = cell.value if hasattr(cell, "value") else cell
    if v is None or str(v).strip() in ("", "—", "-"):
        return None
    try:
        return int(float(str(v).strip().replace("%", "")))
    except (ValueError, TypeError):
        return None


def _float(cell) -> Optional[float]:
    v = cell.value if hasattr(cell, "value") else cell
    if v is None or str(v).strip() in ("", "—", "-"):
        return None
    try:
        return float(str(v).strip().replace("%", ""))
    except (ValueError, TypeError):
        return None


def _parse_time(raw: str) -> Optional[float]:
    """Convert 'M:SS' or a plain number (seconds) to float seconds."""
    raw = raw.strip()
    if not raw or raw in ("—", "-"):
        return None
    m = re.match(r"^(\d+):(\d{1,2})$", raw)
    if m:
        return int(m.group(1)) * 60 + int(m.group(2))
    try:
        return float(raw)
    except ValueError:
        return None


def _normalize_grade(raw: str) -> Optional[str]:
    """Convert 'Grade 2', '2', 'Kindergarten' → 'grade_2', 'kindergarten', etc."""
    r = raw.strip().lower()
    if r in ("k", "kinder", "kindergarten"):
        return "kindergarten"
    m = re.search(r"(\d+)", r)
    if m:
        n = int(m.group(1))
        if 1 <= n <= 6:
            return f"grade_{n}"
    return None


def _normalize_language(raw: str) -> str:
    r = raw.strip().lower()
    if "eng" in r:
        return "english"
    return "filipino"


def _normalize_sex(raw: str) -> Optional[str]:
    r = raw.strip().lower()
    if r.startswith("f"):
        return "female"
    if r.startswith("m"):
        return "male"
    return None


def _col_matches(header: str, *keywords: str) -> bool:
    """True if the header contains ANY of the keywords (case-insensitive)."""
    h = header.lower()
    return any(k in h for k in keywords)


# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class ParsedImportRow:
    lrn:                   Optional[str]
    first_name:            str
    last_name:             str
    sex:                   Optional[str]
    task1_correct:         Optional[int]
    task2_correct:         Optional[int]
    task2_route:           Optional[str]   # "task_2l" or "task_2h"
    total_score:           Optional[int]
    classification:        Optional[str]   # Part 1 reading level
    total_words:           Optional[int]
    miscue_count:          Optional[int]
    reading_time_seconds:  Optional[float]
    cwpm:                  Optional[float]
    reading_profile:       Optional[str]
    comprehension_correct: Optional[int]
    learner_experience:    Optional[int]
    fluency_level:         Optional[int]
    teacher_remarks:       Optional[str]
    row_number:            int = 0
    warning:               str = ""


@dataclass
class ParsedExcel:
    grade_level:  Optional[str]
    section:      Optional[str]
    language:     str
    rows:         list[ParsedImportRow] = field(default_factory=list)
    parse_errors: list[str]            = field(default_factory=list)


# ── Main parser ───────────────────────────────────────────────────────────────

def parse_crla_excel(file_bytes: bytes) -> ParsedExcel:
    if openpyxl is None:
        raise RuntimeError("openpyxl is not installed. Add it to requirements.txt.")

    wb = openpyxl.load_workbook(BytesIO(file_bytes), read_only=True, data_only=True)
    ws = wb.active

    all_rows = list(ws.iter_rows())
    wb.close()

    if not all_rows:
        raise ValueError("The uploaded file appears to be empty.")

    # ── Step 1: Scan top rows for metadata ────────────────────────────────────
    grade_level: Optional[str] = None
    section:     Optional[str] = None
    language:    str           = "filipino"

    header_row_idx: Optional[int] = None

    for i, row in enumerate(all_rows[:30]):
        row_text = " ".join(_str(c) for c in row).lower()

        # Detect header row by presence of "lrn"
        for c in row:
            if _str(c).strip().lower() == "lrn":
                header_row_idx = i
                break

        if header_row_idx is not None:
            break

        # Extract Grade
        if grade_level is None and "grade" in row_text:
            for c in row:
                val = _str(c)
                g = _normalize_grade(val)
                if g:
                    grade_level = g
                    break

        # Extract Section
        if section is None:
            for j, c in enumerate(row):
                if "section" in _str(c).lower():
                    # Value is usually in the next cell(s)
                    for nc in row[j + 1:]:
                        v = _str(nc)
                        if v and "section" not in v.lower():
                            section = v
                            break
                    break

        # Extract Language
        if "language" in row_text or "tagalog" in row_text or "english" in row_text:
            for c in row:
                v = _str(c).lower()
                if "tagalog" in v or "filipino" in v:
                    language = "filipino"
                    break
                if "english" in v:
                    language = "english"
                    break

    if header_row_idx is None:
        raise ValueError(
            'Could not find the data header row. '
            'Make sure the file has a column labelled "LRN".'
        )

    # ── Step 2: Build column map from header row ───────────────────────────────
    header_row = all_rows[header_row_idx]
    col_map: dict[str, int] = {}

    for idx, cell in enumerate(header_row):
        h = _str(cell).strip()
        if not h:
            continue
        hl = h.lower()

        if hl == "lrn":
            col_map["lrn"] = idx
        elif _col_matches(h, "name of learner", "student name", "name"):
            col_map["name"] = idx
        elif hl in ("sex", "gender"):
            col_map["sex"] = idx
        elif _col_matches(h, "date of assess", "date"):
            col_map["date"] = idx
        elif _col_matches(h, "task 1", "task1"):
            col_map["task1"] = idx
        elif _col_matches(h, "task 2l", "task2l", "2l word", "rhyme"):
            col_map["task2l"] = idx
        elif _col_matches(h, "task 2h", "task2h", "2h sent", "sentence"):
            col_map["task2h"] = idx
        elif _col_matches(h, "total score", "total scor"):
            col_map["total_score"] = idx
        elif _col_matches(h, "part 1 reading", "part1 reading", "reading level", "classification"):
            col_map["classification"] = idx
        elif _col_matches(h, "story number", "story no"):
            pass  # skip
        elif _col_matches(h, "total words per", "total words in", "words per story"):
            col_map["total_words"] = idx
        elif _col_matches(h, "total words"):
            col_map["total_words"] = col_map.get("total_words", idx)
        elif _col_matches(h, "number of miscue", "no. of miscue", "miscue"):
            col_map["miscue_count"] = idx
        elif _col_matches(h, "words read", "word read"):
            pass  # computed, skip
        elif _col_matches(h, "total time", "time used", "reading time"):
            col_map["reading_time"] = idx
        elif _col_matches(h, "wpm", "words per min"):
            col_map["cwpm"] = idx
        elif _col_matches(h, "% of correct", "% correct word", "percent correct"):
            pass  # computed, skip
        elif _col_matches(h, "total correct answer", "correct answer", "comprehension"):
            col_map["comprehension_correct"] = idx
        elif _col_matches(h, "learner exp", "learner's exp"):
            col_map["learner_experience"] = idx
        elif _col_matches(h, "observation level", "obs", "fluency"):
            col_map["fluency_level"] = idx
        elif _col_matches(h, "reading profile", "profile"):
            col_map["reading_profile"] = idx
        elif _col_matches(h, "remark"):
            col_map["teacher_remarks"] = idx

    if "lrn" not in col_map and "name" not in col_map:
        raise ValueError(
            "Header row found but required columns (LRN, Student Name) are missing."
        )

    # ── Step 3: Parse data rows ────────────────────────────────────────────────
    parsed_rows: list[ParsedImportRow] = []
    parse_errors: list[str] = []

    def get(row, key) -> str:
        idx = col_map.get(key)
        if idx is None or idx >= len(row):
            return ""
        return _str(row[idx])

    for row_idx, row in enumerate(all_rows[header_row_idx + 1:], start=header_row_idx + 2):
        lrn_raw = get(row, "lrn").strip()
        name_raw = get(row, "name").strip()

        # Skip empty rows
        if not lrn_raw and not name_raw:
            continue

        # Validate LRN: must be 12 digits
        lrn: Optional[str] = None
        if lrn_raw:
            digits_only = re.sub(r"\D", "", lrn_raw)
            if len(digits_only) == 12:
                lrn = digits_only
            else:
                parse_errors.append(
                    f"Row {row_idx}: LRN '{lrn_raw}' is not 12 digits — skipped."
                )
                continue

        # Parse name: "Last Name, First Name" or "First Name Last Name"
        if "," in name_raw:
            parts = name_raw.split(",", 1)
            last_name  = parts[0].strip().title()
            first_name = parts[1].strip().title()
        else:
            parts = name_raw.split()
            if len(parts) >= 2:
                first_name = parts[0].title()
                last_name  = " ".join(parts[1:]).title()
            else:
                first_name = name_raw.title()
                last_name  = ""

        # Determine Task 2 route
        task2l_raw = get(row, "task2l")
        task2h_raw = get(row, "task2h")
        task2l_val = _int(row[col_map["task2l"]]) if "task2l" in col_map else None
        task2h_val = _int(row[col_map["task2h"]]) if "task2h" in col_map else None

        if task2l_val is not None:
            task2_correct = task2l_val
            task2_route   = "task_2l"
        elif task2h_val is not None:
            task2_correct = task2h_val
            task2_route   = "task_2h"
        else:
            task2_correct = None
            task2_route   = None

        time_raw = get(row, "reading_time")
        reading_time = _parse_time(time_raw)

        parsed_rows.append(ParsedImportRow(
            lrn                   = lrn,
            first_name            = first_name,
            last_name             = last_name,
            sex                   = _normalize_sex(get(row, "sex")),
            task1_correct         = _int(row[col_map["task1"]]) if "task1" in col_map else None,
            task2_correct         = task2_correct,
            task2_route           = task2_route,
            total_score           = _int(row[col_map["total_score"]]) if "total_score" in col_map else None,
            classification        = get(row, "classification") or None,
            total_words           = _int(row[col_map["total_words"]]) if "total_words" in col_map else None,
            miscue_count          = _int(row[col_map["miscue_count"]]) if "miscue_count" in col_map else None,
            reading_time_seconds  = reading_time,
            cwpm                  = _float(row[col_map["cwpm"]]) if "cwpm" in col_map else None,
            reading_profile       = get(row, "reading_profile") or None,
            comprehension_correct = _int(row[col_map["comprehension_correct"]]) if "comprehension_correct" in col_map else None,
            learner_experience    = _int(row[col_map["learner_experience"]]) if "learner_experience" in col_map else None,
            fluency_level         = _int(row[col_map["fluency_level"]]) if "fluency_level" in col_map else None,
            teacher_remarks       = get(row, "teacher_remarks") or None,
            row_number            = row_idx,
        ))

    return ParsedExcel(
        grade_level  = grade_level,
        section      = section,
        language     = language,
        rows         = parsed_rows,
        parse_errors = parse_errors,
    )
