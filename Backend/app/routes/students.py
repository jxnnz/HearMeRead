from typing import Optional, List

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select, distinct, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.dependencies import get_current_teacher
from app.models import (
    AssessmentPeriod,
    AssessmentSession,
    GradeLevel,
    Language,
    ReadingResult,
    Sex,
    SessionObservation,
    Student,
    StudentEnrollment,
    Teacher,
    UserRole,
)
from app.schema import (
    BulkStudentUploadResponse,   # NEW
    ClassListResponse,
    ExcelImportResponse,
    StudentCreate,
    StudentListResponse,
    StudentResponse,
    StudentUpdate,
)
from app.services import student_service
from app.utils.excel_parser import parse_crla_excel
from app.utils.student_bulk_parser import parse_student_bulk_xlsx   # NEW
from app.core.encryption import encrypt, hash_lrn

router = APIRouter(prefix="/students", tags=["Students"])

from datetime import date

def _current_school_year() -> str:
    today = date.today()
    if today.month >= 6:
        return f"{today.year}-{today.year + 1}"
    return f"{today.year - 1}-{today.year}"


@router.get("/current-school-year", summary="Get the current school year")
async def get_current_school_year():
    return {"school_year": _current_school_year()}


@router.get("", response_model=StudentListResponse, summary="List all students")
async def list_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=2000),
    search: Optional[str] = Query(None, description="Search by first or last name"),
    grade_level: Optional[GradeLevel] = Query(None),
    section: Optional[str] = Query(None),
    school_year: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    if not school_year:
        school_year = _current_school_year()

    total, students = await student_service.get_students(
        db=db,
        teacher_id=current_teacher.id,
        page=page,
        page_size=page_size,
        search=search,
        grade_level=grade_level,
        section=section,
        school_year=school_year,
    )
    return StudentListResponse(total=total, page=page, page_size=page_size, students=students)


@router.get("/school-years", summary="List distinct school years that have sessions")
async def list_school_years(
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> dict:
    return {"school_years": [_current_school_year()]}


@router.get("/classes", response_model=ClassListResponse, summary="List class summaries")
async def list_classes(
    school_year: Optional[str] = Query(
        None,
        description=(
            "Scope student counts to this school year, using the same "
            "membership rule as GET /students (own school_year field). "
            "If omitted, falls back to the current school year."
        ),
    ),
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    if not school_year:
        school_year = _current_school_year()

    classes = await student_service.get_class_summaries(
        db=db, teacher_id=current_teacher.id, school_year=school_year
    )
    return ClassListResponse(classes=classes)


# ─── NEW: Download the bulk-upload Excel template ────────────────────────────
@router.get(
    "/bulk-upload/template",
    summary="Download the Excel template for bulk student upload",
    response_class=Response,
)
async def download_bulk_template():
    """
    Returns the pre-built Excel template (.xlsx) that teachers fill in
    before using the bulk student upload feature.
    The file is embedded as bytes so no filesystem read is needed.
    """
    import base64, pathlib
    # Template is placed alongside this file at deploy time.
    # Path: app/utils/student_bulk_template.xlsx
    template_path = pathlib.Path(__file__).parent.parent / "utils" / "student_bulk_template.xlsx"
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="Template file not found on server.")
    file_bytes = template_path.read_bytes()
    return Response(
        content=file_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=HearMeRead_BulkStudentUpload_Template.xlsx"
        },
    )


# ─── NEW: Export CRLA records using Excel Template ───────────────────────────
@router.get(
    "/export-crla",
    summary="Export student reading records using the official CRLA Excel template",
    response_class=Response,
)
async def export_crla(
    grade_level: str = Query(...),
    section: str = Query(...),
    school_year: str = Query(...),
    period: str = Query(...),
    teacher_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    import io
    import openpyxl
    from sqlalchemy.orm import selectinload
    from app.services.student_service import _decrypt_student
    import pathlib
    import copy

    try:
        grade_enum = GradeLevel(grade_level)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid grade level: {grade_level}")

    try:
        period_enum = AssessmentPeriod(period)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid period: {period}")

    grade_num = 2
    if grade_enum == GradeLevel.grade_1:
        grade_num = 1
    elif grade_enum == GradeLevel.grade_3:
        grade_num = 3

    # Target teacher logic
    target_teacher = current_teacher
    target_teacher_id = current_teacher.id
    if teacher_id is not None and (current_teacher.role == UserRole.admin or str(current_teacher.role).upper() in ("ADMIN", "USERROLE.ADMIN")):
        t_res = await db.execute(
            select(Teacher).where(
                Teacher.id == teacher_id,
                Teacher.school_id == current_teacher.school_id,
            )
        )
        found_t = t_res.scalar_one_or_none()
        if found_t:
            target_teacher = found_t
            target_teacher_id = found_t.id

    # Period label for filename
    period_label_map = {"beginning": "BoSY", "middle": "MoSY", "end": "EoSY"}
    period_label = period_label_map.get(period, period)

    old_mt_name = "G2 MT Reading Scoresheet"
    old_fil_name = "G2 FIL Reading Scoresheet"
    new_mt_name = f"G{grade_num} MT Reading Scoresheet"
    new_fil_name = f"G{grade_num} FIL Reading Scoresheet"
    new_eng_name = f"G{grade_num} ENG Reading Scoresheet"

    # Fetch students — check both StudentEnrollment AND direct assignment for year-aware lookup
    enrollment_res = await db.execute(
        select(StudentEnrollment.student_id).where(
            StudentEnrollment.teacher_id == target_teacher_id,
            StudentEnrollment.school_year == school_year,
        )
    )
    enrolled_ids = [r[0] for r in enrollment_res.all()]
    membership_condition = or_(
        Student.id.in_(enrolled_ids) if enrolled_ids else False,
        and_(
            Student.teacher_id == target_teacher_id,
            or_(Student.school_year == school_year, Student.school_year.is_(None)),
        ),
    )
    stmt = select(Student).where(
        membership_condition,
        Student.grade_level == grade_enum,
        Student.section == section,
        Student.is_archived == False,
    )
    res = await db.execute(stmt)
    students = res.scalars().all()

    # Decrypt students
    for s in students:
        _decrypt_student(s)

    # Sort students: Male first, then Female; alphabetically by name
    students = sorted(
        students,
        key=lambda s: (
            0 if s.sex == Sex.male else 1,
            (s.last_name or "").lower(),
            (s.first_name or "").lower()
        )
    )

    male_count = sum(1 for s in students if s.sex == Sex.male)
    female_count = sum(1 for s in students if s.sex == Sex.female)

    # Fetch sessions
    student_ids = [s.id for s in students]
    sessions = []
    if student_ids:
        sessions_stmt = (
            select(AssessmentSession)
            .options(
                selectinload(AssessmentSession.reading_result),
                selectinload(AssessmentSession.observation),
                selectinload(AssessmentSession.passage)
            )
            .where(
                AssessmentSession.student_id.in_(student_ids),
                AssessmentSession.period == period_enum,
                AssessmentSession.is_completed == True,
                AssessmentSession.is_archived == False,
            )
        )
        sessions_res = await db.execute(sessions_stmt)
        sessions = sessions_res.scalars().all()

    # Map sessions: student_id -> {language_str -> AssessmentSession}
    session_map = {}
    for sess in sessions:
        sid = sess.student_id
        lang_str = sess.language.value if hasattr(sess.language, "value") else str(sess.language)
        if sid not in session_map:
            session_map[sid] = {}
        session_map[sid][lang_str] = sess

    # Load Excel template
    template_path = pathlib.Path(__file__).parent.parent / "utils" / "templates" / "BOSY-CRLA-GR2-Template.xlsx"
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="CRLA Export template not found on server.")

    wb = openpyxl.load_workbook(template_path, data_only=False)

    # Rename worksheets
    ws_mt = wb[old_mt_name]
    ws_mt.title = new_mt_name
    ws_fil = wb[old_fil_name]
    ws_fil.title = new_fil_name

    # For Grade 3, create a 3rd English scoresheet by copying the MT sheet
    ws_eng = None
    if grade_num == 3:
        ws_eng = wb.copy_worksheet(ws_mt)
        ws_eng.title = new_eng_name
        # Copy embedded header and footer logo images from ws_mt
        if hasattr(ws_mt, "_images") and ws_mt._images:
            ws_eng._images = [copy.deepcopy(img) for img in ws_mt._images]
        # Reorder worksheets so English is placed alongside MT and FIL (MT, FIL, ENG, followed by other sheets)
        wb._sheets.remove(ws_eng)
        fil_idx = wb._sheets.index(ws_fil)
        wb._sheets.insert(fil_idx + 1, ws_eng)

    def replace_text(val: str) -> str:
        if not val or val.startswith("="):
            return val
        new_val = val
        new_val = new_val.replace("GRADE 2", f"GRADE {grade_num}")
        new_val = new_val.replace("Grade 2", f"Grade {grade_num}")
        new_val = new_val.replace("grade 2", f"grade {grade_num}")
        
        # Replace minutes
        if grade_num == 1:
            new_val = new_val.replace("2 minutes", "1 minute")
            new_val = new_val.replace("2 Mins", "1 Min")
            new_val = new_val.replace("2 mins", "1 min")
        elif grade_num == 3:
            new_val = new_val.replace("2 minutes", "3 minutes")
            new_val = new_val.replace("2 Mins", "3 Mins")
            new_val = new_val.replace("2 mins", "3 mins")

        # NOTE: No longer replacing "Mother Tongue" -> "English" for Grade 3.
        # MT stays as Mother Tongue for all grades; the separate ENG sheet handles English.
        return new_val

    # Rename formula references and update raw labels
    for ws in wb.worksheets:
        for r in range(1, ws.max_row + 1):
            for c in range(1, ws.max_column + 1):
                cell = ws.cell(row=r, column=c)
                val = cell.value
                if isinstance(val, str):
                    if val.startswith("="):
                        new_val = val
                        if old_mt_name in new_val:
                            new_val = new_val.replace(old_mt_name, new_mt_name)
                        if old_fil_name in new_val:
                            new_val = new_val.replace(old_fil_name, new_fil_name)
                        if new_val != val:
                            cell.value = new_val
                    else:
                        new_val = replace_text(val)
                        if new_val != val:
                            cell.value = new_val

    # Replace specific text labels on Class Record/Summary sheets and fix conditional formatting
    for ws in wb.worksheets:
        # Fix conditional formatting rules to prevent endless black highlight on empty rows
        for cf in list(ws.conditional_formatting):
            for rule in cf.rules:
                if rule.formula:
                    formula_str = str(rule.formula[0]).replace(" ", "")
                    if formula_str == "$F11<7":
                        rule.formula = ["AND($F11<>\"\",$F11<7)"]
                    elif formula_str == "$F11>6":
                        rule.formula = ["AND($F11<>\"\",$F11>6)"]

        if ws.title == "Class Record":
            # Set Grade label to current grade level (e.g. Grade 1, Grade 2, Grade 3)
            ws.cell(row=7, column=3).value = f"Grade {grade_num}"
            ws.cell(row=5, column=5).value = f"GRADE {grade_num} Reading Assessment CLASS RECORD"

        elif ws.title == "Class Summary":
            cell_a8 = ws.cell(row=8, column=1)
            if cell_a8.value == "Grade 2":
                cell_a8.value = f"Grade {grade_num}"

    # Write teacher metadata and school information
    teacher_name = f"{target_teacher.first_name} {target_teacher.last_name}"
    try:
        t_first = decrypt(target_teacher.first_name) if target_teacher.first_name else ""
        t_last = decrypt(target_teacher.last_name) if target_teacher.last_name else ""
        teacher_name = f"{t_first} {t_last}"
    except Exception:
        pass

    # Helper: write metadata header to a scoresheet
    def write_sheet_metadata(ws, language_label):
        ws.cell(row=6, column=3).value = teacher_name
        ws.cell(row=7, column=3).value = f"Grade {grade_num}"
        ws.cell(row=8, column=3).value = section
        ws.cell(row=9, column=3).value = language_label
        ws.cell(row=6, column=4).value = male_count
        ws.cell(row=6, column=5).value = female_count

    write_sheet_metadata(ws_mt, "Tagalog")
    write_sheet_metadata(ws_fil, "Tagalog")
    if ws_eng:
        write_sheet_metadata(ws_eng, "English")

    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.drawing.image import Image as OpenpyxlImage

    thin_border = Border(
        left=Side(style="thin", color="BFBFBF"),
        right=Side(style="thin", color="BFBFBF"),
        top=Side(style="thin", color="BFBFBF"),
        bottom=Side(style="thin", color="BFBFBF"),
    )

    from openpyxl.worksheet.cell_range import CellRange
    from openpyxl.cell.cell import Cell

    def safe_unmerge(ws, target_range_str):
        for r in list(ws.merged_cells.ranges):
            if str(r) == target_range_str or r.coord == target_range_str:
                try:
                    ws.merged_cells.remove(r)
                    for row in range(r.min_row, r.max_row + 1):
                        for col in range(r.min_col, r.max_col + 1):
                            if (row, col) in ws._cells:
                                ws._cells[(row, col)] = Cell(ws, row=row, column=col)
                except Exception:
                    pass

    def safe_merge(ws, target_range_str):
        try:
            target_cr = CellRange(target_range_str)
            for r in list(ws.merged_cells.ranges):
                if str(r) == target_range_str or r.coord == target_range_str:
                    return
                if not (r.max_row < target_cr.min_row or r.min_row > target_cr.max_row or
                        r.max_col < target_cr.min_col or r.min_col > target_cr.max_col):
                    try:
                        ws.merged_cells.remove(r)
                        for row in range(r.min_row, r.max_row + 1):
                            for col in range(r.min_col, r.max_col + 1):
                                if (row, col) in ws._cells:
                                    ws._cells[(row, col)] = Cell(ws, row=row, column=col)
                    except Exception:
                        pass
            ws.merge_cells(target_range_str)
        except Exception:
            try:
                ws.merge_cells(target_range_str)
            except Exception:
                pass

    ws_cr = wb["Class Record"]

    # For Grade 3, add another table for English on the Class Record tab
    if grade_num == 3:
        safe_unmerge(ws_cr, "E5:Q5")
        safe_unmerge(ws_cr, "Q6:Q8")

        eng_fill = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")
        header_font_10 = Font(name="Arial", size=10, bold=True, color="000000")
        header_font_9 = Font(name="Arial", size=9, bold=True, color="000000")
        header_font_8 = Font(name="Arial", size=8, bold=True, color="000000")
        center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

        ws_cr.cell(row=5, column=5).value = "GRADE 3 Reading Assessment CLASS RECORD"

        # Row 6
        for c in range(17, 23):
            cell = ws_cr.cell(row=6, column=c)
            cell.fill = eng_fill
            cell.border = thin_border
        ws_cr.cell(row=6, column=17).value = "ENGLISH"
        ws_cr.cell(row=6, column=17).font = header_font_10
        ws_cr.cell(row=6, column=17).alignment = center_align

        ws_cr.cell(row=6, column=23).value = "Remarks"
        ws_cr.cell(row=6, column=23).font = header_font_10
        ws_cr.cell(row=6, column=23).alignment = center_align
        for r in range(6, 9):
            ws_cr.cell(row=r, column=23).border = thin_border

        # Row 7
        for c in range(17, 23):
            cell = ws_cr.cell(row=7, column=c)
            cell.fill = eng_fill
            cell.border = thin_border
        ws_cr.cell(row=7, column=17).value = "Assessment Part 1"
        ws_cr.cell(row=7, column=17).font = header_font_9
        ws_cr.cell(row=7, column=17).alignment = center_align

        ws_cr.cell(row=7, column=19).value = "Assessment Part 2"
        ws_cr.cell(row=7, column=19).font = header_font_9
        ws_cr.cell(row=7, column=19).alignment = center_align

        ws_cr.cell(row=7, column=22).value = "READING PROFILE"
        ws_cr.cell(row=7, column=22).font = header_font_9
        ws_cr.cell(row=7, column=22).alignment = center_align

        # Row 8
        headers_r8 = {
            17: ("Assessment Part 1 Reading Level", header_font_9),
            18: ("% of Total Score", header_font_9),
            19: ("Reading Fluency", header_font_9),
            20: ("Reading Comprehension", header_font_8),
            21: ("Average Word Per Minute", header_font_8),
            22: (None, header_font_9),
        }
        for c, (h_text, h_font) in headers_r8.items():
            cell = ws_cr.cell(row=8, column=c)
            cell.fill = eng_fill
            cell.border = thin_border
            if h_text:
                cell.value = h_text
                cell.font = h_font
                cell.alignment = center_align

        safe_merge(ws_cr, "E5:W5")
        safe_merge(ws_cr, "Q6:V6")
        safe_merge(ws_cr, "W6:W8")
        safe_merge(ws_cr, "Q7:R7")
        safe_merge(ws_cr, "S7:U7")
        safe_merge(ws_cr, "V7:V8")

        # Widths
        widths = {
            "Q": 19.0, "R": 10.0, "S": 10.0, "T": 14.0, "U": 10.0, "V": 26.0, "W": 40.0
        }
        for col_l, w in widths.items():
            ws_cr.column_dimensions[col_l].width = w

    # Helper: calculate session summary metrics for scoresheet and class record
    def get_session_metrics(sess):
        if not sess:
            return None
        rr = sess.reading_result
        if not rr:
            return None

        t1 = rr.part1_task1_correct if rr.part1_task1_correct is not None else 0
        t2 = rr.part1_task2_correct if rr.part1_task2_correct is not None else 0
        route = (rr.part1_route or "").lower()

        # Calculate CRLA Total Score
        if "2h" in route:
            calculated_total_score = t1 + 10 + t2
        else:
            calculated_total_score = t1 + t2

        # Calculate CRLA Classification
        if t1 < 7:
            if calculated_total_score <= 10:
                calculated_classification = "Full Refresher"
            else:
                calculated_classification = "Moderate Refresher"
        else:
            if calculated_total_score < 27:
                calculated_classification = "Light Refresher"
            else:
                calculated_classification = "Grade Ready"

        pct_score = calculated_total_score / 30.0

        profile_val = rr.reading_profile
        if not profile_val or str(profile_val).strip() == "":
            profile_val = "Low Emerging Reader"

        is_full_refresher = (calculated_classification == "Full Refresher" or calculated_total_score <= 10)

        fluency = None
        comp = None
        cwpm = None
        obs = sess.observation
        remarks = obs.teacher_remarks if (obs and obs.teacher_remarks) else ""

        if not is_full_refresher:
            if rr.total_words is not None and rr.total_words > 0 and rr.miscue_count is not None:
                fluency = (rr.total_words - rr.miscue_count) / rr.total_words
            if obs and obs.comprehension_correct is not None:
                total_q = 6
                if sess.passage and hasattr(sess.passage, "questions") and sess.passage.questions:
                    total_q = len(sess.passage.questions)
                comp = min(1.0, obs.comprehension_correct / float(total_q))
            if rr.cwpm is not None:
                cwpm = rr.cwpm

        return {
            "t1": t1,
            "t2": t2,
            "route": route,
            "total_score": calculated_total_score,
            "classification": calculated_classification,
            "pct_score": pct_score,
            "fluency": fluency,
            "comp": comp,
            "cwpm": cwpm,
            "profile": profile_val,
            "remarks": remarks,
            "is_full_refresher": is_full_refresher,
            "story_number": (sess.passage.story_number if sess.passage and sess.passage.story_number else 1),
            "miscue_count": (rr.miscue_count if rr.miscue_count is not None else 0),
            "total_words": rr.total_words,
            "time_sec": (rr.reading_time_seconds or 0),
            "comp_raw": (obs.comprehension_correct if (obs and obs.comprehension_correct is not None) else 0),
            "learner_exp": (obs.learner_experience if (obs and obs.learner_experience is not None) else 0),
            "fluency_level": (f"Level {obs.fluency_level}" if (obs and obs.fluency_level) else None),
            "created_at": sess.created_at.date() if sess.created_at else None,
        }

    # Helper: write student identity to a scoresheet row
    def write_student_identity(ws, row_num, idx, s):
        ws.cell(row=row_num, column=1).value = idx
        ws.cell(row=row_num, column=2).value = s.lrn
        ws.cell(row=row_num, column=3).value = f"{s.last_name}, {s.first_name}" + (f", {s.middle_name}" if s.middle_name else "")
        ws.cell(row=row_num, column=4).value = s.sex.value.capitalize() if s.sex else None

    # Helper: write session scores to a scoresheet row
    def write_session_scores(ws, row_num, m):
        if not m:
            return
        if m["created_at"]:
            ws.cell(row=row_num, column=5).value = m["created_at"]

        ws.cell(row=row_num, column=6).value = m["t1"]
        if "2l" in m["route"]:
            ws.cell(row=row_num, column=7).value = m["t2"]
        elif "2h" in m["route"]:
            ws.cell(row=row_num, column=8).value = m["t2"]

        # Write calculated values directly to Scoresheet
        ws.cell(row=row_num, column=9).value = m["total_score"]
        ws.cell(row=row_num, column=10).value = m["classification"]
        if m["total_words"] is not None and m["miscue_count"] is not None:
            ws.cell(row=row_num, column=13).value = m["total_words"] - m["miscue_count"]
        if m["cwpm"] is not None:
            ws.cell(row=row_num, column=16).value = m["cwpm"]
        if m["fluency"] is not None:
            ws.cell(row=row_num, column=17).value = m["fluency"]
        ws.cell(row=row_num, column=21).value = m["profile"]

        if not m["is_full_refresher"]:
            ws.cell(row=row_num, column=11).value = m["story_number"]
            ws.cell(row=row_num, column=12).value = m["miscue_count"]

            time_sec = m["time_sec"]
            ws.cell(row=row_num, column=14).value = int(time_sec) // 60
            ws.cell(row=row_num, column=15).value = int(time_sec) % 60

            ws.cell(row=row_num, column=18).value = m["comp_raw"]
            ws.cell(row=row_num, column=19).value = m["learner_exp"]
            if m["fluency_level"]:
                ws.cell(row=row_num, column=20).value = m["fluency_level"]
            ws.cell(row=row_num, column=22).value = m["remarks"]
        else:
            ws.cell(row=row_num, column=14).value = 0
            ws.cell(row=row_num, column=15).value = 0
            ws.cell(row=row_num, column=19).value = m["learner_exp"]
            if m["fluency_level"]:
                ws.cell(row=row_num, column=20).value = m["fluency_level"]
            ws.cell(row=row_num, column=22).value = m["remarks"]

    # Write student lists and scores
    N = len(students)
    raw_cols = [5, 6, 7, 8, 11, 12, 14, 15, 18, 19, 20, 22]
    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center")
    align_left_wrap = Alignment(horizontal="left", vertical="center", wrap_text=True)

    for idx, s in enumerate(students, start=1):
        scoresheet_row = 10 + idx
        cr_row = 8 + idx

        # Write identity info on all scoresheets
        write_student_identity(ws_mt, scoresheet_row, idx, s)
        write_student_identity(ws_fil, scoresheet_row, idx, s)
        if ws_eng:
            write_student_identity(ws_eng, scoresheet_row, idx, s)

        # Clear score and observation columns on scoresheets
        for col_idx in raw_cols:
            ws_mt.cell(row=scoresheet_row, column=col_idx).value = None
            ws_fil.cell(row=scoresheet_row, column=col_idx).value = None
            if ws_eng:
                ws_eng.cell(row=scoresheet_row, column=col_idx).value = None

        # Fetch sessions & calculate metrics
        fil_sess = session_map.get(s.id, {}).get("filipino")
        mt_sess = session_map.get(s.id, {}).get("mother_tongue") or fil_sess
        eng_sess = session_map.get(s.id, {}).get("english") if ws_eng else None

        mt_metrics = get_session_metrics(mt_sess)
        fil_metrics = get_session_metrics(fil_sess)
        eng_metrics = get_session_metrics(eng_sess) if ws_eng else None

        write_session_scores(ws_mt, scoresheet_row, mt_metrics)
        write_session_scores(ws_fil, scoresheet_row, fil_metrics)
        if ws_eng:
            write_session_scores(ws_eng, scoresheet_row, eng_metrics)

        # Write to Class Record
        full_name = f"{s.last_name}, {s.first_name}" + (f", {s.middle_name}" if s.middle_name else "")
        ws_cr.cell(row=cr_row, column=1).value = idx
        ws_cr.cell(row=cr_row, column=1).alignment = align_center

        ws_cr.cell(row=cr_row, column=2).value = s.lrn
        ws_cr.cell(row=cr_row, column=2).alignment = align_left
        ws_cr.cell(row=cr_row, column=2).number_format = "0"

        ws_cr.cell(row=cr_row, column=3).value = full_name
        ws_cr.cell(row=cr_row, column=3).alignment = align_left

        ws_cr.cell(row=cr_row, column=4).value = s.sex.value.capitalize() if s.sex else None
        ws_cr.cell(row=cr_row, column=4).alignment = align_center

        # Mother Tongue (Cols 5-10: E..J)
        if mt_metrics:
            ws_cr.cell(row=cr_row, column=5).value = mt_metrics["classification"]
            ws_cr.cell(row=cr_row, column=6).value = mt_metrics["pct_score"]
            ws_cr.cell(row=cr_row, column=6).number_format = "0%"
            ws_cr.cell(row=cr_row, column=7).value = mt_metrics["fluency"]
            if mt_metrics["fluency"] is not None:
                ws_cr.cell(row=cr_row, column=7).number_format = "0%"
            ws_cr.cell(row=cr_row, column=8).value = mt_metrics["comp"]
            if mt_metrics["comp"] is not None:
                ws_cr.cell(row=cr_row, column=8).number_format = "0%"
            ws_cr.cell(row=cr_row, column=9).value = mt_metrics["cwpm"]
            if mt_metrics["cwpm"] is not None:
                ws_cr.cell(row=cr_row, column=9).number_format = "0"
            ws_cr.cell(row=cr_row, column=10).value = mt_metrics["profile"]
        else:
            for c in range(5, 11):
                ws_cr.cell(row=cr_row, column=c).value = None

        # Filipino (Cols 11-16: K..P)
        if fil_metrics:
            ws_cr.cell(row=cr_row, column=11).value = fil_metrics["classification"]
            ws_cr.cell(row=cr_row, column=12).value = fil_metrics["pct_score"]
            ws_cr.cell(row=cr_row, column=12).number_format = "0%"
            ws_cr.cell(row=cr_row, column=13).value = fil_metrics["fluency"]
            if fil_metrics["fluency"] is not None:
                ws_cr.cell(row=cr_row, column=13).number_format = "0%"
            ws_cr.cell(row=cr_row, column=14).value = fil_metrics["comp"]
            if fil_metrics["comp"] is not None:
                ws_cr.cell(row=cr_row, column=14).number_format = "0%"
            ws_cr.cell(row=cr_row, column=15).value = fil_metrics["cwpm"]
            if fil_metrics["cwpm"] is not None:
                ws_cr.cell(row=cr_row, column=15).number_format = "0"
            ws_cr.cell(row=cr_row, column=16).value = fil_metrics["profile"]
        else:
            for c in range(11, 17):
                ws_cr.cell(row=cr_row, column=c).value = None

        if grade_num == 3:
            # English (Cols 17-22: Q..V)
            if eng_metrics:
                ws_cr.cell(row=cr_row, column=17).value = eng_metrics["classification"]
                ws_cr.cell(row=cr_row, column=18).value = eng_metrics["pct_score"]
                ws_cr.cell(row=cr_row, column=18).number_format = "0%"
                ws_cr.cell(row=cr_row, column=19).value = eng_metrics["fluency"]
                if eng_metrics["fluency"] is not None:
                    ws_cr.cell(row=cr_row, column=19).number_format = "0%"
                ws_cr.cell(row=cr_row, column=20).value = eng_metrics["comp"]
                if eng_metrics["comp"] is not None:
                    ws_cr.cell(row=cr_row, column=20).number_format = "0%"
                ws_cr.cell(row=cr_row, column=21).value = eng_metrics["cwpm"]
                if eng_metrics["cwpm"] is not None:
                    ws_cr.cell(row=cr_row, column=21).number_format = "0"
                ws_cr.cell(row=cr_row, column=22).value = eng_metrics["profile"]
            else:
                for c in range(17, 23):
                    ws_cr.cell(row=cr_row, column=c).value = None

            # Remarks (Col 23: W)
            remarks_parts = []
            if mt_metrics and mt_metrics.get("remarks"):
                remarks_parts.append(f"MT: {mt_metrics['remarks']}")
            if fil_metrics and fil_metrics.get("remarks"):
                remarks_parts.append(f"FIL: {fil_metrics['remarks']}")
            if eng_metrics and eng_metrics.get("remarks"):
                remarks_parts.append(f"ENG: {eng_metrics['remarks']}")
            ws_cr.cell(row=cr_row, column=23).value = " ".join(remarks_parts) if remarks_parts else None
            ws_cr.cell(row=cr_row, column=23).alignment = align_left_wrap
        else:
            # Remarks (Col 17: Q)
            remarks_parts = []
            if mt_metrics and mt_metrics.get("remarks"):
                remarks_parts.append(f"MT: {mt_metrics['remarks']}")
            if fil_metrics and fil_metrics.get("remarks"):
                remarks_parts.append(f"FIL: {fil_metrics['remarks']}")
            ws_cr.cell(row=cr_row, column=17).value = " ".join(remarks_parts) if remarks_parts else None
            ws_cr.cell(row=cr_row, column=17).alignment = align_left_wrap

    # Clear remaining rows (11 + N to 110) on scoresheets - ONLY clear raw data columns to preserve formulas!
    raw_cols_to_clear = [1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 14, 15, 18, 19, 20, 22]
    for r in range(11 + N, 111):
        for c in raw_cols_to_clear:
            ws_mt.cell(row=r, column=c).value = None
            ws_fil.cell(row=r, column=c).value = None
            if ws_eng:
                ws_eng.cell(row=r, column=c).value = None

    # Clear remaining rows on Class Record (9 + N to 110)
    max_cr_col = 23 if grade_num == 3 else 17
    for r in range(9 + N, 111):
        for c in range(1, max_cr_col + 1):
            ws_cr.cell(row=r, column=c).value = None

    attribution_font = Font(name="Calibri", size=9, bold=False, color="000000")
    left_align_wrap = Alignment(horizontal="left", vertical="top", wrap_text=True)
    center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

    attribution_text = (
        "This Scoresheet is made possible with the assistance of USAID through ABC+: Advancing Basic Education in the Philippines. "
        "ABC+ Project is an early grades education project of the Department of Education in partnership with USAID and implemented "
        "by RTI International together with The Asia Foundation, SIL LEAD, and Florida State University."
    )

    def style_and_fill_scoresheet(ws, is_mt: bool):
        # Bottom USAID attribution
        safe_merge(ws, 'A112:R113')
        attr_cell = ws.cell(row=112, column=1)
        attr_cell.value = attribution_text
        attr_cell.font = attribution_font
        attr_cell.alignment = left_align_wrap

    style_and_fill_scoresheet(ws_mt, is_mt=True)
    style_and_fill_scoresheet(ws_fil, is_mt=False)
    if ws_eng:
        style_and_fill_scoresheet(ws_eng, is_mt=False)

    # Class Summary bottom attribution text
    ws_summary = wb["Class Summary"]
    safe_merge(ws_summary, "A89:N91")
    summary_attr_cell = ws_summary.cell(row=89, column=1)
    summary_attr_cell.value = attribution_text
    summary_attr_cell.font = attribution_font
    summary_attr_cell.alignment = left_align_wrap

    # Replace Scoring Reference Flowchart Image
    ws_ref = wb["Scoring Reference"]
    templates_dir = pathlib.Path(__file__).parent.parent / "utils" / "templates"

    def get_resized_flowchart(path):
        img = OpenpyxlImage(str(path))
        w, h = img.width, img.height
        ratio = h / w
        img.width = 900
        img.height = int(900 * ratio)
        return img

    if grade_num == 1:
        grade1_flowchart = templates_dir / "Grade1.png"
        if grade1_flowchart.exists():
            ws_ref._images.clear()
            img = get_resized_flowchart(grade1_flowchart)
            ws_ref.add_image(img, "A13")
    elif grade_num == 3:
        eng_flowchart = templates_dir / "Grade3-English.png"
        fil_flowchart = templates_dir / "Grade3-Filipino.png"
        if eng_flowchart.exists() or fil_flowchart.exists():
            ws_ref._images.clear()
        if eng_flowchart.exists():
            img_eng = get_resized_flowchart(eng_flowchart)
            ws_ref.add_image(img_eng, "A13")
        if fil_flowchart.exists():
            img_fil = get_resized_flowchart(fil_flowchart)
            ws_ref.add_image(img_fil, "A55")

    # Protect all worksheets so formulas, layout, and scoresheets cannot be accidentally edited
    for ws_item in wb.worksheets:
        ws_item.protection.sheet = True
        ws_item.protection.enable()

    # Force automatic formula calculation on workbook open
    wb.calculation.calcMode = 'auto'
    wb.calculation.calcOnSave = True
    wb.calculation.forceFullCalc = True

    # Save to buffer and stream back
    out = io.BytesIO()
    wb.save(out)
    out.seek(0)
    
    grade_str = grade_enum.value if hasattr(grade_enum, "value") else str(grade_level)
    filename = f"CRLA_{period_label}_Assessment_Record_{grade_str}_{section}.xlsx".replace(" ", "_")
    return Response(
        content=out.read(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        },
    )


# ─── NEW: Bulk student upload ────────────────────────────────────────────────
@router.post(
    "/bulk-upload",
    response_model=BulkStudentUploadResponse,
    status_code=200,
    summary="Bulk-upload students from the HearMeRead Excel template",
)
async def bulk_upload_students(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    """
    Accepts the HearMeRead bulk student upload template (.xlsx).
    Creates new students only — never updates existing ones.
    Rows with a matching LRN already in this teacher's roster are skipped.
    Rows missing Last Name or First Name are skipped with an error message.
    Assessment data is NOT created here; assessment must be done through the app.
    """
    if not (file.filename or "").lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported.")

    file_bytes = await file.read()

    try:
        rows, parse_errors = parse_student_bulk_xlsx(file_bytes)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Failed to parse the uploaded file. Make sure you're using the HearMeRead template.",
        )

    students_created  = 0
    students_skipped  = 0
    students_invalid  = 0
    errors            = list(parse_errors)

    for row in rows:
        # Validate required fields
        if not row.get("last_name") or not row.get("first_name"):
            students_invalid += 1
            errors.append(f"Row {row.get('row_number', '?')}: Missing Last Name or First Name — skipped.")
            continue

        # Duplicate check by LRN hash
        if row.get("lrn"):
            lrn_hash = hash_lrn(row["lrn"])
            res = await db.execute(
                select(Student).where(
                    Student.lrn_hash == lrn_hash,
                    Student.teacher_id == current_teacher.id,
                )
            )
            if res.scalar_one_or_none():
                students_skipped += 1
                continue

        # Resolve grade level
        grade_level: Optional[GradeLevel] = None
        if row.get("grade_level"):
            try:
                grade_level = GradeLevel(row["grade_level"])
            except ValueError:
                errors.append(
                    f"Row {row.get('row_number', '?')}: Unrecognized grade level "
                    f"'{row['grade_level']}' — student created with Grade 1 as default."
                )

        student = Student(
            first_name  = encrypt(row["first_name"].strip().title()),
            last_name   = encrypt(row["last_name"].strip().title()),
            middle_name = encrypt(row["middle_name"].strip().title()) if row.get("middle_name") else None,
            lrn         = encrypt(row["lrn"]) if row.get("lrn") else None,
            lrn_hash    = hash_lrn(row["lrn"]) if row.get("lrn") else None,
            sex         = Sex(row["sex"]) if row.get("sex") in ("female", "male") else None,
            grade_level = grade_level or GradeLevel.grade_1,
            section     = row.get("section"),
            school_year = row.get("school_year") or _current_school_year(),
            teacher_id  = current_teacher.id,
        )
        db.add(student)
        await db.flush()

        if current_teacher.school_id:
            sy = student.school_year or _current_school_year()
            enrollment = StudentEnrollment(
                student_id=student.id,
                teacher_id=current_teacher.id,
                school_id=current_teacher.school_id,
                grade_level=student.grade_level,
                section=student.section,
                school_year=sy,
            )
            db.add(enrollment)

        students_created += 1

    await db.commit()

    return BulkStudentUploadResponse(
        students_created  = students_created,
        students_skipped  = students_skipped,
        students_invalid  = students_invalid,
        errors            = errors,
    )


# ─── EXISTING: Import CRLA Excel records ────────────────────────────────────
@router.post("/import", response_model=ExcelImportResponse, status_code=200, summary="Import CRLA records from Excel")
async def import_excel_records(
    file: UploadFile = File(...),
    school_year: str = Form(...),
    period: AssessmentPeriod = Form(...),
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    if not (file.filename or "").lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported.")

    file_bytes = await file.read()

    try:
        parsed = parse_crla_excel(file_bytes)
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to parse the uploaded file. Please check the format.")

    grade_level: Optional[GradeLevel] = None
    if parsed.grade_level:
        try:
            grade_level = GradeLevel(parsed.grade_level)
        except ValueError:
            pass

    try:
        language = Language(parsed.language)
    except ValueError:
        language = Language.filipino

    students_created          = 0
    students_found            = 0
    sessions_created          = 0
    sessions_skipped          = 0
    sessions_empty_assessment = 0   # NEW
    errors                    = list(parsed.parse_errors)

    if grade_level is None:
        errors.append(
            "Warning: Grade level could not be read from the file header. "
            "Students were created with Grade 1 as default — use 'Edit Class Info' "
            "on the Class Record page to correct the grade level."
        )

    for row in parsed.rows:
        try:
            student: Optional[Student] = None
            if row.lrn:
                lrn_hash = hash_lrn(row.lrn)
                res = await db.execute(
                    select(Student).where(
                        Student.lrn_hash == lrn_hash,
                        Student.teacher_id == current_teacher.id,
                    )
                )
                student = res.scalar_one_or_none()

            if student is None:
                student = Student(
                    first_name  = encrypt(row.first_name or "Unknown"),
                    last_name   = encrypt(row.last_name  or "Unknown"),
                    lrn         = encrypt(row.lrn) if row.lrn else None,
                    lrn_hash    = hash_lrn(row.lrn),
                    sex         = Sex(row.sex) if row.sex in ("female", "male") else None,
                    grade_level = grade_level or GradeLevel.grade_1,
                    section     = parsed.section,
                    school_year = school_year,
                    teacher_id  = current_teacher.id,
                )
                db.add(student)
                await db.flush()
                students_created += 1
            else:
                students_found += 1

            if current_teacher.school_id:
                enr_check = await db.execute(
                    select(StudentEnrollment).where(
                        StudentEnrollment.student_id == student.id,
                        StudentEnrollment.teacher_id == current_teacher.id,
                        StudentEnrollment.school_year == school_year,
                    )
                )
                if not enr_check.scalar_one_or_none():
                    enrollment = StudentEnrollment(
                        student_id=student.id,
                        teacher_id=current_teacher.id,
                        school_id=current_teacher.school_id,
                        grade_level=student.grade_level,
                        section=student.section,
                        school_year=school_year,
                    )
                    db.add(enrollment)

            dup = await db.execute(
                select(AssessmentSession).where(
                    AssessmentSession.student_id == student.id,
                    AssessmentSession.school_year == school_year,
                    AssessmentSession.period == period,
                )
            )
            if dup.scalar_one_or_none():
                sessions_skipped += 1
                continue

            session = AssessmentSession(
                teacher_id   = current_teacher.id,
                student_id   = student.id,
                passage_id   = None,
                school_year  = school_year,
                period       = period,
                language     = language,
                is_completed = True,
            )
            db.add(session)
            await db.flush()

            # ── NEW: track whether this row has any score data ────────────
            has_score_data = any(v is not None for v in [
                row.task1_correct, row.task2_correct,
                row.total_score, row.total_words,
                row.miscue_count, row.cwpm,
                row.comprehension_correct, row.learner_experience,
                row.fluency_level, row.teacher_remarks,
            ])
            if not has_score_data:
                sessions_empty_assessment += 1
            # ─────────────────────────────────────────────────────────────

            if any(v is not None for v in [
                row.task1_correct, row.task2_correct,
                row.total_score, row.total_words,
                row.miscue_count, row.cwpm,
            ]):
                db.add(ReadingResult(
                    session_id           = session.id,
                    part1_task1_correct  = row.task1_correct,
                    part1_task2_correct  = row.task2_correct,
                    part1_route          = row.task2_route,
                    part1_total_score    = row.total_score,
                    part1_classification = row.classification,
                    total_words          = row.total_words,
                    miscue_count         = row.miscue_count,
                    reading_time_seconds = row.reading_time_seconds,
                    cwpm                 = row.cwpm,
                    reading_profile      = row.reading_profile,
                ))

            if any(v is not None for v in [
                row.comprehension_correct, row.learner_experience,
                row.fluency_level, row.teacher_remarks,
            ]):
                db.add(SessionObservation(
                    session_id            = session.id,
                    comprehension_correct = row.comprehension_correct,
                    fluency_level         = row.fluency_level,
                    learner_experience    = row.learner_experience,
                    teacher_remarks       = row.teacher_remarks,
                ))

            sessions_created += 1

        except Exception as exc:
            errors.append(f"Row {row.row_number}: {exc}")
            continue

    await db.commit()

    return ExcelImportResponse(
        students_created          = students_created,
        students_found            = students_found,
        sessions_created          = sessions_created,
        sessions_skipped          = sessions_skipped,
        sessions_empty_assessment = sessions_empty_assessment,   # NEW
        errors                    = errors,
    )


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED, summary="Create a student")
async def create_student(
    data: StudentCreate,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    return await student_service.create_student(db=db, data=data, teacher_id=current_teacher.id)


@router.get("/{student_id}", response_model=StudentResponse, summary="Get a student")
async def get_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    return await student_service.get_student_by_id(
        db=db, student_id=student_id, teacher_id=current_teacher.id
    )


@router.patch("/{student_id}", response_model=StudentResponse, summary="Update a student")
async def update_student(
    student_id: int,
    data: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    return await student_service.update_student(
        db=db, student_id=student_id, data=data, teacher_id=current_teacher.id
    )


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a student")
async def delete_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    await student_service.delete_student(
        db=db, student_id=student_id, teacher_id=current_teacher.id
    )
