from typing import Optional, List

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select, distinct
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
    Teacher,
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
    if teacher_id is not None and current_teacher.role == UserRole.admin:
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

    # Fetch students — check StudentEnrollment first for year-aware lookup
    enrollment_res = await db.execute(
        select(StudentEnrollment.student_id).where(
            StudentEnrollment.teacher_id == target_teacher_id,
            StudentEnrollment.school_year == school_year,
        )
    )
    enrolled_ids = [r[0] for r in enrollment_res.all()]
    if enrolled_ids:
        stmt = select(Student).where(
            Student.id.in_(enrolled_ids),
            Student.grade_level == grade_enum,
            Student.section == section,
        )
    else:
        stmt = select(Student).where(
            Student.teacher_id == target_teacher_id,
            Student.grade_level == grade_enum,
            Student.section == section,
            Student.school_year == school_year,
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
            # Update Grade label to be one level lower for CRLA (since they are assessed on lower grade materials)
            lower_grade_label = "Kindergarten" if grade_num == 1 else f"Grade {grade_num - 1}"
            ws.cell(row=7, column=3).value = lower_grade_label
            cell_e5 = ws.cell(row=5, column=5)
            if isinstance(cell_e5.value, str) and "GRADE 2" in cell_e5.value:
                cell_e5.value = cell_e5.value.replace("GRADE 2", f"GRADE {grade_num}")
            # For Grade 3, Class Record E6 label stays as MOTHER TONGUE (no longer replaced to ENGLISH)

        elif ws.title == "Class Summary":
            cell_a2 = ws.cell(row=2, column=1)
            if isinstance(cell_a2.value, str) and "GRADE 2" in cell_a2.value:
                cell_a2.value = cell_a2.value.replace("GRADE 2", f"GRADE {grade_num}")
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

    # Helper: write student identity to a scoresheet row
    def write_student_identity(ws, row_num, idx, s):
        ws.cell(row=row_num, column=1).value = idx
        ws.cell(row=row_num, column=2).value = s.lrn
        ws.cell(row=row_num, column=3).value = f"{s.last_name}, {s.first_name}" + (f", {s.middle_name}" if s.middle_name else "")
        ws.cell(row=row_num, column=4).value = s.sex.value.capitalize() if s.sex else None

    # Helper: write session scores to a scoresheet row
    def write_session_scores(ws, row_num, sess):
        if not sess:
            return
        ws.cell(row=row_num, column=5).value = sess.created_at.date()
        rr = sess.reading_result
        if not rr:
            return

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

        ws.cell(row=row_num, column=6).value = t1
        if "2l" in route:
            ws.cell(row=row_num, column=7).value = t2
        elif "2h" in route:
            ws.cell(row=row_num, column=8).value = t2

        # Write calculated values directly to Scoresheet
        ws.cell(row=row_num, column=9).value = calculated_total_score
        ws.cell(row=row_num, column=10).value = calculated_classification
        if rr.total_words is not None and rr.miscue_count is not None:
            ws.cell(row=row_num, column=13).value = rr.total_words - rr.miscue_count
        if rr.cwpm is not None:
            ws.cell(row=row_num, column=16).value = rr.cwpm
        if rr.total_words is not None and rr.total_words > 0 and rr.miscue_count is not None:
            ws.cell(row=row_num, column=17).value = (rr.total_words - rr.miscue_count) / rr.total_words
        profile_val = rr.reading_profile
        if not profile_val or str(profile_val).strip() == "":
            profile_val = "Low Emerging Reader"
        ws.cell(row=row_num, column=21).value = profile_val

        is_full_refresher = (calculated_classification == "Full Refresher" or calculated_total_score <= 10)
        if not is_full_refresher:
            if sess.passage:
                ws.cell(row=row_num, column=11).value = sess.passage.story_number or 1
            ws.cell(row=row_num, column=12).value = rr.miscue_count if rr.miscue_count is not None else 0

            time_sec = rr.reading_time_seconds or 0
            ws.cell(row=row_num, column=14).value = int(time_sec) // 60
            ws.cell(row=row_num, column=15).value = int(time_sec) % 60

            obs = sess.observation
            if obs:
                ws.cell(row=row_num, column=18).value = obs.comprehension_correct if obs.comprehension_correct is not None else 0
                ws.cell(row=row_num, column=19).value = obs.learner_experience if obs.learner_experience is not None else 0
                if obs.fluency_level:
                    ws.cell(row=row_num, column=20).value = f"Level {obs.fluency_level}"
                ws.cell(row=row_num, column=22).value = obs.teacher_remarks
            else:
                ws.cell(row=row_num, column=18).value = 0
                ws.cell(row=row_num, column=19).value = 0
        else:
            ws.cell(row=row_num, column=14).value = 0
            ws.cell(row=row_num, column=15).value = 0

            obs = sess.observation
            if obs:
                ws.cell(row=row_num, column=19).value = obs.learner_experience if obs.learner_experience is not None else 0
                if obs.fluency_level:
                    ws.cell(row=row_num, column=20).value = f"Level {obs.fluency_level}"
                ws.cell(row=row_num, column=22).value = obs.teacher_remarks

    # Write student lists and scores
    N = len(students)
    raw_cols = [5, 6, 7, 8, 11, 12, 14, 15, 18, 19, 20, 22]
    for idx, s in enumerate(students, start=1):
        row_num = 10 + idx
        
        # Write identity info on all sheets
        write_student_identity(ws_mt, row_num, idx, s)
        write_student_identity(ws_fil, row_num, idx, s)
        if ws_eng:
            write_student_identity(ws_eng, row_num, idx, s)

        # Clear score and observation columns (only raw input columns, keep formula columns!)
        for col_idx in raw_cols:
            ws_mt.cell(row=row_num, column=col_idx).value = None
            ws_fil.cell(row=row_num, column=col_idx).value = None
            if ws_eng:
                ws_eng.cell(row=row_num, column=col_idx).value = None

        # For ALL grades: MT and FIL both use the Filipino session
        fil_sess = session_map.get(s.id, {}).get("filipino")
        write_session_scores(ws_mt, row_num, fil_sess)
        write_session_scores(ws_fil, row_num, fil_sess)

        # For Grade 3: ENG sheet uses the English session
        if ws_eng:
            eng_sess = session_map.get(s.id, {}).get("english")
            write_session_scores(ws_eng, row_num, eng_sess)

    # Clear remaining rows (11 + N to 110) - ONLY clear raw data columns to preserve formulas!
    raw_cols_to_clear = [1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 14, 15, 18, 19, 20, 22]
    for r in range(11 + N, 111):
        for c in raw_cols_to_clear:
            ws_mt.cell(row=r, column=c).value = None
            ws_fil.cell(row=r, column=c).value = None
            if ws_eng:
                ws_eng.cell(row=r, column=c).value = None

    # Write Top and Bottom text labels
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.drawing.image import Image as OpenpyxlImage

    attribution_font = Font(name="Calibri", size=9, bold=False, color="000000")
    left_align_wrap = Alignment(horizontal="left", vertical="top", wrap_text=True)
    center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

    attribution_text = (
        "This Scoresheet is made possible with the assistance of USAID through ABC+: Advancing Basic Education in the Philippines. "
        "ABC+ Project is an early grades education project of the Department of Education in partnership with USAID and implemented "
        "by RTI International together with The Asia Foundation, SIL LEAD, and Florida State University."
    )

    def style_and_fill_scoresheet(ws, is_mt: bool):
        # 1. Left side title labels beside DepEd logo
        ws.merge_cells('F2:T2')
        cell_f2 = ws.cell(row=2, column=6)
        cell_f2.value = "Department of Education"
        cell_f2.font = Font(name="Calibri", size=14, bold=True, color="000000")
        cell_f2.alignment = Alignment(horizontal="left", vertical="center")
        
        ws.merge_cells('F3:T3')
        cell_f3 = ws.cell(row=3, column=6)
        cell_f3.value = "Comprehensive Rapid Literacy Assessment (CRLA)"
        cell_f3.font = Font(name="Calibri", size=14, bold=True, color="000000")
        cell_f3.alignment = Alignment(horizontal="left", vertical="center")

        # 2. Bottom USAID attribution
        ws.merge_cells('A112:R113')
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
    ws_summary.merge_cells('A89:N91')
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

    # Protect Scoring Reference worksheet so it cannot be edited
    ws_ref.protection.sheet = True

    # Force automatic formula calculation on workbook open
    wb.calculation.calcMode = 'auto'
    wb.calculation.calcOnSave = True
    wb.calculation.forceFullCalc = True

    # Save to buffer and stream back
    out = io.BytesIO()
    wb.save(out)
    out.seek(0)
    
    filename = f"{period_label}_CRLA_Assessment_Record_Grade{grade_num}_{section}_{school_year}.xlsx".replace(" ", "_")
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
            school_year = row.get("school_year"),
            teacher_id  = current_teacher.id,
        )
        db.add(student)
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
                    teacher_id  = current_teacher.id,
                )
                db.add(student)
                await db.flush()
                students_created += 1
            else:
                students_found += 1

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
