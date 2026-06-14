from io import BytesIO
from typing import List, Tuple, Dict, Any, Optional

try:
    import openpyxl
except ImportError:
    openpyxl = None


def _str(cell) -> str:
    v = cell.value
    if v is None:
        return ""
    return str(v).strip()


def _normalize_sex(raw: str) -> Optional[str]:
    r = raw.lower().strip()
    if r in ("male", "m", "lalaki"):
        return "male"
    if r in ("female", "f", "babae"):
        return "female"
    return None


def _normalize_grade(raw: str) -> Optional[str]:
    import re
    r = raw.lower().strip()
    # "grade 1", "grade_1", "1", "gr. 1", "gr1"
    m = re.search(r"(\d)", r)
    if m:
        n = int(m.group(1))
        if 1 <= n <= 3:
            return f"grade_{n}"
    return None


def _find_header_row(all_rows) -> Optional[int]:
    """Find the row index that contains column headers (identified by 'last name' or 'lrn')."""
    for i, row in enumerate(all_rows[:10]):
        texts = [_str(c).lower() for c in row]
        if any(t in ("lrn", "last name", "lastname", "last_name") for t in texts):
            return i
    return None


def _build_col_map(header_row) -> Dict[str, int]:
    """Map column keys to column indices from the header row."""
    col_map: Dict[str, int] = {}
    for idx, cell in enumerate(header_row):
        h = _str(cell).lower()
        if h == "lrn":
            col_map["lrn"] = idx
        elif "last" in h and "name" in h:
            col_map["last_name"] = idx
        elif "first" in h and "name" in h:
            col_map["first_name"] = idx
        elif "middle" in h and "name" in h:
            col_map["middle_name"] = idx
        elif h in ("sex", "gender"):
            col_map["sex"] = idx
        elif "grade" in h:
            col_map["grade_level"] = idx
        elif "section" in h:
            col_map["section"] = idx
        elif "school" in h and "year" in h:
            col_map["school_year"] = idx
    return col_map


def parse_student_bulk_xlsx(
    file_bytes: bytes,
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parse the HearMeRead bulk student upload Excel template.

    Returns:
        rows         — list of dicts with keys:
                       lrn, first_name, last_name, middle_name,
                       sex, grade_level, section, school_year, row_number
        parse_errors — list of non-fatal warning strings
    """
    if openpyxl is None:
        raise RuntimeError("openpyxl is not installed.")

    wb = openpyxl.load_workbook(BytesIO(file_bytes), read_only=True, data_only=True)
    # Always use the first sheet (the "Student List" sheet)
    ws = wb.active
    all_rows = list(ws.iter_rows())
    wb.close()

    if not all_rows:
        raise ValueError("The uploaded file is empty.")

    header_idx = _find_header_row(all_rows)
    if header_idx is None:
        raise ValueError(
            "Could not find the header row. Make sure you are using the "
            "HearMeRead bulk student upload template."
        )

    col_map = _build_col_map(all_rows[header_idx])

    if "last_name" not in col_map or "first_name" not in col_map:
        raise ValueError(
            "Template is missing required columns 'Last Name' or 'First Name'. "
            "Please use the official HearMeRead template."
        )

    rows: List[Dict[str, Any]] = []
    parse_errors: List[str] = []

    for row_idx, row in enumerate(all_rows[header_idx + 1:], start=header_idx + 2):
        # Skip completely empty rows
        if all(_str(c) == "" for c in row):
            continue

        def get(key: str) -> str:
            idx = col_map.get(key)
            if idx is None:
                return ""
            try:
                return _str(row[idx])
            except IndexError:
                return ""

        lrn         = get("lrn").replace(" ", "").replace("-", "")
        last_name   = get("last_name").title()
        first_name  = get("first_name").title()
        middle_name = get("middle_name").title()
        sex_raw     = get("sex")
        grade_raw   = get("grade_level")
        section     = get("section")
        school_year = get("school_year")

        # Validate LRN length if provided
        if lrn and len(lrn) != 12:
            parse_errors.append(
                f"Row {row_idx}: LRN '{lrn}' is not 12 digits — LRN ignored for this student."
            )
            lrn = ""

        sex         = _normalize_sex(sex_raw) if sex_raw else None
        grade_level = _normalize_grade(grade_raw) if grade_raw else None

        if grade_raw and not grade_level:
            parse_errors.append(
                f"Row {row_idx}: Could not read grade level '{grade_raw}' — will default to Grade 1."
            )

        rows.append({
            "lrn":         lrn or None,
            "last_name":   last_name,
            "first_name":  first_name,
            "middle_name": middle_name or None,
            "sex":         sex,
            "grade_level": grade_level,
            "section":     section or None,
            "school_year": school_year or None,
            "row_number":  row_idx,
        })

    return rows, parse_errors
