"""
CRLA Excel parser — reads the official DepEd CRLA assessment spreadsheet
and returns structured data for bulk import.

Supports the standard CRLA format:
  - Top rows contain metadata: Grade, Section, Language
  - A header row is identified by finding the "LRN" column
  - CRLA files often have TWO header rows (group labels + column names);
    both are detected and merged into a single col_map
  - Data rows follow immediately below the last header row
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


# Helpers
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
    """
    Convert a cell value to a grade enum string.

    Matches:
      - Standalone single digit: "2" → "grade_2"
      - "Grade N" / "Grade Level: N" (not followed by a range dash): "Grade 2" → "grade_2"
      - Roman numerals I–III (standalone): "II" → "grade_2"
      - Kinder variants: "K", "Kinder", "Kindergarten" → "kindergarten"

    Does NOT match ranges like "Grade 1-6" or long sentences that happen
    to contain a grade number (e.g. title rows).
    """
    r = raw.strip().lower()
    if r in ("k", "kinder", "kindergarten"):
        return "kindergarten"
    # Standalone single digit only (not "25" or "100")
    if re.fullmatch(r"\d", r):
        n = int(r)
        if 1 <= n <= 3:
            return f"grade_{n}"
    # "Grade 2", "Grade Level: 2" — NOT followed by a range dash/hyphen
    m = re.search(r"\bgrade(?:\s+level)?\s*[:\s]\s*(\d)\b(?!\s*[-–—])", r)
    if m:
        n = int(m.group(1))
        if 1 <= n <= 3:
            return f"grade_{n}"
    # Standalone Roman numerals
    roman = {"i": 1, "ii": 2, "iii": 3}
    if r in roman:
        return f"grade_{roman[r]}"
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


def _fill_col_map(row, col_map: dict, overwrite: bool = True) -> None:
    """
    Map column indices from a header row into col_map.
    If overwrite=False, existing keys are not replaced (used for sub-header rows).
    """
    for idx, cell in enumerate(row):
        h = _str(cell).strip()
        if not h:
            continue

        def _set(key: str) -> None:
            if overwrite or key not in col_map:
                col_map[key] = idx

        hl = h.lower()

        if hl == "lrn":
            _set("lrn")
        elif _col_matches(h, "name of learner", "student name", "name"):
            _set("name")
        elif hl in ("sex", "gender"):
            _set("sex")
        elif _col_matches(h, "date of assess", "date"):
            _set("date")
        elif _col_matches(h, "task 1", "task1"):
            _set("task1")
        elif _col_matches(h, "task 2l", "task2l", "2l word", "rhyme"):
            _set("task2l")
        elif _col_matches(h, "task 2h", "task2h", "2h sent", "sentence"):
            _set("task2h")
        elif _col_matches(h, "total score", "total scor"):
            _set("total_score")
        elif _col_matches(h, "part 1 reading", "part1 reading", "reading level", "classification"):
            _set("classification")
        elif _col_matches(h, "story number", "story no"):
            pass  # skip
        elif _col_matches(h, "total words per", "total words in", "words per story"):
            _set("total_words")
        elif _col_matches(h, "total words"):
            if overwrite or "total_words" not in col_map:
                col_map.setdefault("total_words", idx)
        elif _col_matches(h, "number of miscue", "no. of miscue", "miscue"):
            _set("miscue_count")
        elif _col_matches(h, "words read", "word read"):
            pass  # computed, skip
        elif _col_matches(h, "total time", "time used", "reading time"):
            _set("reading_time")
        elif _col_matches(h, "wpm", "words per min"):
            _set("cwpm")
        elif _col_matches(h, "% of correct", "% correct word", "percent correct"):
            pass  # computed, skip
        elif _col_matches(h, "total correct answer", "correct answer", "comprehension"):
            _set("comprehension_correct")
        elif _col_matches(h, "learner exp", "learner's exp"):
            _set("learner_experience")
        elif _col_matches(h, "observation level", "obs", "fluency"):
            _set("fluency_level")
        elif _col_matches(h, "reading profile", "profile"):
            _set("reading_profile")
        elif _col_matches(h, "remark"):
            _set("teacher_remarks")


# Data classes
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


# Main parser
def parse_crla_excel(file_bytes: bytes) -> ParsedExcel:
    if openpyxl is None:
        raise RuntimeError("openpyxl is not installed. Add it to requirements.txt.")

    wb = openpyxl.load_workbook(BytesIO(file_bytes), read_only=True, data_only=True)
    ws = wb.active

    all_rows = list(ws.iter_rows())
    wb.close()

    if not all_rows:
        raise ValueError("The uploaded file appears to be empty.")

    # Step 1: Scan top rows for metadata
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

        # Extract Grade — only from cells ADJACENT to a "grade" label cell
        # (avoids picking up digits from title rows like "CRLA FOR GRADE 1-6")
        if grade_level is None and "grade" in row_text:
            for j, c in enumerate(row):
                if "grade" in _str(c).lower():
                    # Try this cell itself ("Grade 2", "Grade Level: 2")
                    g = _normalize_grade(_str(c))
                    if g:
                        grade_level = g
                        break
                    # Try the next few cells (label "Grade Level:" → value "2")
                    for nc in row[j + 1: j + 5]:
                        v = _str(nc).strip()
                        if v:
                            g = _normalize_grade(v)
                            if g:
                                grade_level = g
                                break
                    if grade_level:
                        break

        # Extract Section
        if section is None:
            for j, c in enumerate(row):
                if "section" in _str(c).lower():
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

    # Step 2: Build column map from header row
    col_map: dict[str, int] = {}
    _fill_col_map(all_rows[header_row_idx], col_map, overwrite=True)

    # Handle CRLA two-row headers: Row A has LRN/Name/Sex/Date + group labels
    # (merged cells); Row B has the actual score column names.
    # If the cell at the LRN position in the next row is NOT a 12-digit number,
    # treat that row as a second header row and merge its mappings.
    data_start = header_row_idx + 1
    if data_start < len(all_rows):
        next_row = all_rows[data_start]
        lrn_idx  = col_map.get("lrn", 0)
        raw_next_lrn = _str(next_row[lrn_idx]) if lrn_idx < len(next_row) else ""
        next_lrn_digits = re.sub(r"\D", "", raw_next_lrn.strip())
        if len(next_lrn_digits) != 12:
            # Not a data row — treat as sub-header carrying score column names
            _fill_col_map(next_row, col_map, overwrite=False)
            data_start += 1  # skip this row when parsing data

    if "lrn" not in col_map and "name" not in col_map:
        raise ValueError(
            "Header row found but required columns (LRN, Student Name) are missing."
        )

    # Step 3: Parse data rows
    parsed_rows: list[ParsedImportRow] = []
    parse_errors: list[str] = []

    def get(row, key) -> str:
        idx = col_map.get(key)
        if idx is None or idx >= len(row):
            return ""
        return _str(row[idx])

    for row_idx, row in enumerate(all_rows[data_start:], start=data_start + 1):
        lrn_raw  = get(row, "lrn").strip()
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

        time_raw     = get(row, "reading_time")
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
