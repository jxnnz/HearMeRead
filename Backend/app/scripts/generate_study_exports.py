import asyncio
import csv
import os
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db import AsyncSessionLocal
from app.models import AssessmentSession, Teacher, Student, ReadingResult, SessionObservation, School, Passage
from app.core.encryption import decrypt

async def main():
    # Define exports directory in the workspace root
    exports_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "exports"))
    os.makedirs(exports_dir, exist_ok=True)
    
    async with AsyncSessionLocal() as session:
        # Load all completed assessment sessions
        stmt = (
            select(AssessmentSession)
            .options(
                selectinload(AssessmentSession.teacher).selectinload(Teacher.school),
                selectinload(AssessmentSession.student),
                selectinload(AssessmentSession.reading_result),
                selectinload(AssessmentSession.observation),
                selectinload(AssessmentSession.passage)
            )
            .where(AssessmentSession.is_completed == True, AssessmentSession.is_archived == False)
            .order_by(AssessmentSession.created_at.desc())
        )
        
        result = await session.execute(stmt)
        sessions = result.scalars().all()
        print(f"Loaded {len(sessions)} completed sessions.")
        
        # Headers for Results
        headers_all = [
            "Session ID", "School Year", "Period", "Language", "Date Completed",
            "School Code", "School Name",
            "Teacher ID", "Teacher Email", "Teacher First Name", "Teacher Last Name",
            "Student ID", "Student LRN", "Student First Name", "Student Last Name", "Student Sex",
            "Student Grade Level", "Student Section",
            # Assessment 1 fields
            "A1 Task 1 Correct", "A1 Task 2 Correct", "A1 Total Score", "A1 Classification", "A1 Route",
            # Assessment 2 fields
            "A2 Passage ID", "A2 Passage Title", "A2 Reading Time (sec)", "A2 Total Words in Passage",
            "A2 Miscue Count", "A2 CWPM", "A2 Reading Profile",
            "A2 Comprehension Correct", "A2 Comprehension Total", "A2 Fluency Level Rating", 
            "A2 Learner Experience Rating", "A2 Teacher Remarks"
        ]
        
        rows_all = []
        rows_a1_only = []
        rows_a1_a2 = []
        
        for s in sessions:
            # Decrypt Teacher info
            t_first = decrypt(s.teacher.first_name) if s.teacher and s.teacher.first_name else ""
            t_last = decrypt(s.teacher.last_name) if s.teacher and s.teacher.last_name else ""
            t_email = s.teacher.email if s.teacher else ""
            t_id = s.teacher.id if s.teacher else ""
            
            # School Info
            school_code = s.teacher.school.school_code if s.teacher and s.teacher.school else ""
            school_name = s.teacher.school.name if s.teacher and s.teacher.school else ""
            
            # Decrypt Student info
            s_first = decrypt(s.student.first_name) if s.student and s.student.first_name else ""
            s_last = decrypt(s.student.last_name) if s.student and s.student.last_name else ""
            s_lrn = decrypt(s.student.lrn) if s.student and s.student.lrn else ""
            s_sex = s.student.sex.value if s.student and s.student.sex else ""
            s_grade = s.student.grade_level.value if s.student and s.student.grade_level else ""
            s_section = s.student.section if s.student else ""
            s_id = s.student.id if s.student else ""
            
            # A1 fields
            has_rr = s.reading_result is not None
            a1_t1_correct = s.reading_result.part1_task1_correct if has_rr else ""
            a1_t2_correct = s.reading_result.part1_task2_correct if has_rr else ""
            a1_total = s.reading_result.part1_total_score if has_rr else ""
            a1_class = s.reading_result.part1_classification if has_rr else ""
            a1_route = s.reading_result.part1_route if has_rr else ""
            
            # A2 fields
            p_id = s.passage_id if s.passage_id else ""
            p_title = s.passage.title if s.passage else ""
            
            a2_time = s.reading_result.reading_time_seconds if has_rr else ""
            a2_words = s.reading_result.total_words if has_rr else ""
            a2_miscues = s.reading_result.miscue_count if has_rr else ""
            a2_cwpm = s.reading_result.cwpm if has_rr else ""
            a2_profile = s.reading_result.reading_profile if has_rr else ""
            
            has_obs = s.observation is not None
            a2_comp_correct = s.observation.comprehension_correct if has_obs else ""
            a2_comp_total = s.observation.comprehension_total if has_obs else ""
            a2_fluency = s.observation.fluency_level if has_obs else ""
            a2_exp = s.observation.learner_experience if has_obs else ""
            a2_remarks = s.observation.teacher_remarks if has_obs else ""
            
            # Build unified row
            row_data = [
                s.id, s.school_year, s.period.value if s.period else "", s.language.value if s.language else "", s.updated_at.isoformat() if s.updated_at else "",
                school_code, school_name,
                t_id, t_email, t_first, t_last,
                s_id, s_lrn, s_first, s_last, s_sex, s_grade, s_section,
                # A1 fields
                a1_t1_correct, a1_t2_correct, a1_total, a1_class, a1_route,
                # A2 fields
                p_id, p_title, a2_time, a2_words, a2_miscues, a2_cwpm, a2_profile,
                a2_comp_correct, a2_comp_total, a2_fluency, a2_exp, a2_remarks
            ]
            
            rows_all.append(row_data)
            
            # Determine if this student completed both assessments or just assessment 1
            # If they didn't do A2, fields like CWPM, Profile, etc. are blank
            is_a1_only = True
            if a2_cwpm is not None and a2_cwpm != "":
                is_a1_only = False
            elif a2_profile is not None and a2_profile != "":
                is_a1_only = False
            elif a2_comp_correct is not None and a2_comp_correct != "":
                is_a1_only = False
            
            if is_a1_only:
                rows_a1_only.append(row_data)
            else:
                rows_a1_a2.append(row_data)
        
        # Write files
        file_all = os.path.join(exports_dir, "all_completed_assessment_results.csv")
        with open(file_all, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(headers_all)
            writer.writerows(rows_all)
            
        file_a1 = os.path.join(exports_dir, "assessment_1_only_results.csv")
        with open(file_a1, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(headers_all)
            writer.writerows(rows_a1_only)
            
        file_a2 = os.path.join(exports_dir, "assessment_1_and_2_completed_results.csv")
        with open(file_a2, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(headers_all)
            writer.writerows(rows_a1_a2)
            
        print(f"Successfully generated files in: {exports_dir}")
        print(f"  - all_completed_assessment_results.csv: {len(rows_all)} records")
        print(f"  - assessment_1_only_results.csv: {len(rows_a1_only)} records")
        print(f"  - assessment_1_and_2_completed_results.csv: {len(rows_a1_a2)} records")

if __name__ == "__main__":
    asyncio.run(main())
