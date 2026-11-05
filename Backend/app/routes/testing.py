import logging
import random
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, or_

from app.core.config import settings
from app.core.security import get_password_hash, create_access_token
from app.core.encryption import encrypt, decrypt, hash_lrn
from app.db import get_db
from app.models import (
    Teacher, Student, Passage, Question, AssessmentSession,
    ReadingResult, SessionObservation, UserRole, GradeLevel,
    Sex, Language, AssessmentPeriod, PassageVisibility
)
from app.utils.passage_hash import compute_passage_hash

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/testing", tags=["Testing Environment"])


def assert_not_production():
    if settings.is_production or settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Testing utilities are strictly forbidden in production.",
        )


class SeedTestAccountsResponse(BaseModel):
    message: str
    admin_email: str
    teacher_email: str
    password: str
    admin_token: str
    teacher_token: str


class GenerateStudentsRequest(BaseModel):
    count: int = Field(default=5, ge=1, le=20)
    grade_level: Optional[str] = "grade_2"
    teacher_id: Optional[int] = None


class GeneratePassagesRequest(BaseModel):
    include_assessment_1: bool = True
    include_assessment_2: bool = True
    teacher_id: Optional[int] = None


class GenerateAssessmentsRequest(BaseModel):
    count: int = Field(default=3, ge=1, le=10)
    teacher_id: Optional[int] = None


class ResetTestDataRequest(BaseModel):
    confirm: bool = False
    preserve_test_accounts: bool = True


FICTIONAL_STUDENTS = [
    ("Juan", "Santos", "Reyes", Sex.male),
    ("Maria", "Dela Cruz", "Garcia", Sex.female),
    ("Carlo", "Mendoza", "Alvarez", Sex.male),
    ("Ana", "Bautista", "Flores", Sex.female),
    ("Gabriel", "Ramos", "Aquino", Sex.male),
    ("Sofia", "Gonzales", "Castro", Sex.female),
    ("Mark", "Villanueva", "Torres", Sex.male),
    ("Elena", "Navarro", "Delos Santos", Sex.female),
    ("Daniel", "Soriano", "Lim", Sex.male),
    ("Chloe", "Pascual", "Morales", Sex.female),
]


@router.get("/status")
async def get_testing_status(db: AsyncSession = Depends(get_db)):
    """Check testing environment status and count isolated test records."""
    assert_not_production()

    # Query test teachers
    teachers_res = await db.execute(
        select(func.count(Teacher.id)).where(Teacher.email.like("%@hearmeread.test"))
    )
    test_teachers_count = teachers_res.scalar() or 0

    # Query test passages
    passages_res = await db.execute(
        select(func.count(Passage.id)).where(Passage.title.like("[TEST]%"))
    )
    test_passages_count = passages_res.scalar() or 0

    # Query all students to count test students by LRN hash
    all_students_res = await db.execute(select(Student))
    all_students = all_students_res.scalars().all()
    test_students_count = 0
    real_students_count = 0
    for s in all_students:
        try:
            fn = decrypt(s.first_name) or ""
            if fn.startswith("[TEST]") or (s.lrn and "TEST" in (decrypt(s.lrn) or "")):
                test_students_count += 1
            else:
                real_students_count += 1
        except Exception:
            real_students_count += 1

    # Query sessions associated with test passages or test teachers
    sessions_res = await db.execute(
        select(func.count(AssessmentSession.id))
        .join(Passage, AssessmentSession.passage_id == Passage.id)
        .where(Passage.title.like("[TEST]%"))
    )
    test_sessions_count = sessions_res.scalar() or 0

    return {
        "environment": settings.ENVIRONMENT,
        "db_schema": settings.DB_SCHEMA,
        "is_production": settings.is_production,
        "isolation_guarantee": "Test data is prefixed with [TEST] or @hearmeread.test to protect real dev data",
        "counts": {
            "test_teachers": test_teachers_count,
            "test_students": test_students_count,
            "test_passages": test_passages_count,
            "test_sessions": test_sessions_count,
            "real_students": real_students_count,
        },
    }


@router.post("/seed-accounts", response_model=SeedTestAccountsResponse)
async def seed_test_accounts(db: AsyncSession = Depends(get_db)):
    """Idempotently seed test admin and test teacher accounts with known credentials."""
    assert_not_production()

    admin_email = "test.admin@hearmeread.test"
    teacher_email = "test.teacher@hearmeread.test"
    test_password = "TestPassword123!"
    hashed_pwd = await get_password_hash(test_password)

    # 1. Admin account
    admin_res = await db.execute(select(Teacher).where(Teacher.email == admin_email))
    admin_user = admin_res.scalar_one_or_none()
    if not admin_user:
        admin_user = Teacher(
            first_name="[TEST] Admin",
            last_name="Tester",
            email=admin_email,
            hashed_password=hashed_pwd,
            is_active=True,
            is_verified=True,
            role=UserRole.admin,
            agreed_to_terms=True,
            agreed_to_privacy=True,
        )
        db.add(admin_user)
    else:
        admin_user.is_active = True
        admin_user.is_verified = True
        admin_user.hashed_password = hashed_pwd
        admin_user.role = UserRole.admin

    # 2. Teacher account
    teacher_res = await db.execute(select(Teacher).where(Teacher.email == teacher_email))
    teacher_user = teacher_res.scalar_one_or_none()
    if not teacher_user:
        teacher_user = Teacher(
            first_name="[TEST] Teacher",
            last_name="Tester",
            email=teacher_email,
            hashed_password=hashed_pwd,
            is_active=True,
            is_verified=True,
            role=UserRole.teacher,
            grade_level=GradeLevel.grade_2,
            section="Sampaguita",
            agreed_to_terms=True,
            agreed_to_privacy=True,
        )
        db.add(teacher_user)
    else:
        teacher_user.is_active = True
        teacher_user.is_verified = True
        teacher_user.hashed_password = hashed_pwd
        teacher_user.role = UserRole.teacher
        teacher_user.grade_level = GradeLevel.grade_2

    await db.commit()
    await db.refresh(admin_user)
    await db.refresh(teacher_user)

    admin_token = create_access_token({"sub": admin_email})
    teacher_token = create_access_token({"sub": teacher_email})

    return SeedTestAccountsResponse(
        message="Test accounts created or updated successfully.",
        admin_email=admin_email,
        teacher_email=teacher_email,
        password=test_password,
        admin_token=admin_token,
        teacher_token=teacher_token,
    )


@router.post("/generate-students")
async def generate_fictional_students(
    req: GenerateStudentsRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate fictional test students tagged with [TEST]."""
    assert_not_production()

    # Determine teacher
    teacher_id = req.teacher_id
    if not teacher_id:
        teacher_res = await db.execute(
            select(Teacher.id).where(Teacher.email == "test.teacher@hearmeread.test")
        )
        teacher_id = teacher_res.scalar_one_or_none()
        if not teacher_id:
            # Fallback to any teacher
            any_teacher = await db.execute(select(Teacher.id).limit(1))
            teacher_id = any_teacher.scalar_one_or_none()

    if not teacher_id:
        raise HTTPException(
            status_code=400,
            detail="No teacher account found. Please run seed-accounts first.",
        )

    grade = GradeLevel.grade_2
    if req.grade_level and hasattr(GradeLevel, req.grade_level):
        grade = getattr(GradeLevel, req.grade_level)

    created_students = []
    base_epoch = int(datetime.now().timestamp()) % 100000

    for i in range(req.count):
        fn_raw, ln_raw, mn_raw, sex = FICTIONAL_STUDENTS[i % len(FICTIONAL_STUDENTS)]
        first_name = f"[TEST] {fn_raw}"
        last_name = ln_raw
        middle_name = mn_raw
        raw_lrn = f"TEST-LRN-{base_epoch:05d}{i:02d}"

        student = Student(
            first_name=encrypt(first_name),
            last_name=encrypt(last_name),
            middle_name=encrypt(middle_name),
            grade_level=grade,
            section="Sampaguita",
            school_year="2026-2027",
            lrn=encrypt(raw_lrn),
            lrn_hash=hash_lrn(raw_lrn),
            sex=sex,
            teacher_id=teacher_id,
            is_archived=False,
        )
        db.add(student)
        created_students.append({
            "first_name": first_name,
            "last_name": last_name,
            "lrn": raw_lrn,
            "grade_level": grade.value,
        })

    await db.commit()
    return {
        "message": f"Successfully generated {len(created_students)} test students.",
        "students": created_students,
    }


@router.post("/generate-passages")
async def generate_sample_passages(
    req: GeneratePassagesRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate sample fictional reading passages tagged with [TEST]."""
    assert_not_production()

    teacher_id = req.teacher_id
    if not teacher_id:
        teacher_res = await db.execute(
            select(Teacher.id).where(Teacher.email == "test.teacher@hearmeread.test")
        )
        teacher_id = teacher_res.scalar_one_or_none()
        if not teacher_id:
            any_teacher = await db.execute(select(Teacher.id).limit(1))
            teacher_id = any_teacher.scalar_one_or_none()

    if not teacher_id:
        raise HTTPException(status_code=400, detail="Please seed accounts first.")

    generated = []

    # 1. Assessment 1 Passage
    if req.include_assessment_1:
        t1_content = "m, s, a, i, o, b, t, k, l, y"
        t2_words = "aso, pusa, bola, mesa, dahon, gatas, araw, ulan, bata, puno"
        t2_sentences = "Ang bata ay naglalaro sa bakuran. Si Nanay ay nagluluto ng masarap na ulam."
        a1_hash = compute_passage_hash(
            1,
            task1_content=t1_content,
            task2_words=t2_words,
            task2_sentences=t2_sentences,
        )

        p1 = Passage(
            teacher_id=teacher_id,
            title="[TEST] Filipino Baitang 2 — Assessment 1",
            language=Language.filipino,
            grade_level=GradeLevel.grade_2,
            assessment_type=1,
            task1_content=t1_content,
            task2_words=t2_words,
            task2_sentences=t2_sentences,
            visibility=PassageVisibility.private,
            content_hash=a1_hash,
            word_count=len(t2_sentences.split()) + len(t2_words.split()),
        )
        db.add(p1)
        generated.append("[TEST] Filipino Baitang 2 — Assessment 1")

    # 2. Assessment 2 Story Passage
    if req.include_assessment_2:
        story_text = (
            "Isang maaraw na umaga, naglakad ang maliit na pagong patungo sa ilog. "
            "Nakita niya ang kanyang kaibigang ibon na kumakanta sa itaas ng puno. "
            "Magkasama silang naghanap ng mga hinog na prutas at masayang nagkuwentuhan buong maghapon."
        )
        a2_hash = compute_passage_hash(2, content=story_text)

        p2 = Passage(
            teacher_id=teacher_id,
            title="[TEST] Ang Matalinong Pagong",
            content=story_text,
            language=Language.filipino,
            grade_level=GradeLevel.grade_2,
            assessment_type=2,
            visibility=PassageVisibility.private,
            content_hash=a2_hash,
            word_count=len(story_text.split()),
        )
        db.add(p2)
        await db.flush()

        # Add questions
        q1 = Question(
            passage_id=p2.id,
            text="Saan naglakad ang maliit na pagong?",
            answer_key="Sa ilog",
            order=1,
        )
        q2 = Question(
            passage_id=p2.id,
            text="Sino ang nakita ng pagong sa itaas ng puno?",
            answer_key="Ang kanyang kaibigang ibon",
            order=2,
        )
        q3 = Question(
            passage_id=p2.id,
            text="Ano ang ginawa ng magkaibigan buong maghapon?",
            answer_key="Naghanap ng hinog na prutas at masayang nagkuwentuhan",
            order=3,
        )
        db.add_all([q1, q2, q3])
        generated.append("[TEST] Ang Matalinong Pagong")

    await db.commit()
    return {"message": f"Generated passages: {', '.join(generated)}"}


@router.post("/generate-assessments")
async def generate_sample_assessments(
    req: GenerateAssessmentsRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate completed reading assessments with realistic CWPM and comprehension data."""
    assert_not_production()

    # Find test passage
    passage_res = await db.execute(
        select(Passage).where(Passage.title.like("[TEST]%"), Passage.assessment_type == 2).limit(1)
    )
    passage = passage_res.scalar_one_or_none()
    if not passage:
        raise HTTPException(
            status_code=400,
            detail="No test story passage found. Please generate passages first.",
        )

    # Find test students
    students_res = await db.execute(select(Student).where(Student.teacher_id == passage.teacher_id))
    students = students_res.scalars().all()
    test_students = [
        s for s in students
        if decrypt(s.first_name).startswith("[TEST]")
    ]

    if not test_students:
        raise HTTPException(
            status_code=400,
            detail="No test students found. Please generate students first.",
        )

    created_sessions = []
    limit = min(req.count, len(test_students))

    for i in range(limit):
        student = test_students[i]
        session = AssessmentSession(
            teacher_id=passage.teacher_id,
            student_id=student.id,
            passage_id=passage.id,
            school_year="2026-2027",
            period=AssessmentPeriod.beginning,
            language=Language.filipino,
            is_completed=True,
            is_archived=False,
        )
        db.add(session)
        await db.flush()

        # Fictional reading metrics
        reading_time = 45.0 + (i * 5.0)
        total_words = passage.word_count or 35
        miscues = random.randint(1, 4)
        cwpm = round(((total_words - miscues) / (reading_time / 60.0)), 1)

        result = ReadingResult(
            session_id=session.id,
            reading_time_seconds=reading_time,
            total_words=total_words,
            miscue_count=miscues,
            cwpm=cwpm,
            reading_profile="Developing Reader" if cwpm < 50 else "Transitioning Reader",
            part2_alignments_json="[]",
        )
        db.add(result)

        observation = SessionObservation(
            session_id=session.id,
            comprehension_correct=3,
            comprehension_total=3,
            fluency_level=3,
            learner_experience=4,
            teacher_remarks="Good phrasing with minor self-corrections on multisyllabic words.",
        )
        db.add(observation)
        created_sessions.append(session.id)

    await db.commit()
    return {
        "message": f"Successfully generated {len(created_sessions)} completed assessment records.",
        "session_ids": created_sessions,
    }


@router.post("/reset-test-data")
async def reset_test_data(
    req: ResetTestDataRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Safely delete ONLY records tagged as test data ([TEST] prefix or @hearmeread.test).
    Leaves all production/real development records completely intact.
    """
    assert_not_production()

    if not req.confirm:
        raise HTTPException(
            status_code=400,
            detail="Confirmation required. Please set confirm=true.",
        )

    # 1. Identify test passages
    test_passages_res = await db.execute(
        select(Passage.id).where(Passage.title.like("[TEST]%"))
    )
    test_passage_ids = [r[0] for r in test_passages_res.all()]

    # 2. Identify test students
    students_res = await db.execute(select(Student))
    all_students = students_res.scalars().all()
    test_student_ids = []
    for s in all_students:
        try:
            fn = decrypt(s.first_name) or ""
            if fn.startswith("[TEST]") or (s.lrn and "TEST" in (decrypt(s.lrn) or "")):
                test_student_ids.append(s.id)
        except Exception:
            pass

    # 3. Identify test sessions
    sessions_query = select(AssessmentSession.id).where(
        or_(
            AssessmentSession.passage_id.in_(test_passage_ids) if test_passage_ids else False,
            AssessmentSession.student_id.in_(test_student_ids) if test_student_ids else False,
        )
    )
    test_sessions_res = await db.execute(sessions_query)
    test_session_ids = [r[0] for r in test_sessions_res.all()]

    # Delete test reading results and observations
    if test_session_ids:
        await db.execute(
            delete(ReadingResult).where(ReadingResult.session_id.in_(test_session_ids))
        )
        await db.execute(
            delete(SessionObservation).where(SessionObservation.session_id.in_(test_session_ids))
        )
        await db.execute(
            delete(AssessmentSession).where(AssessmentSession.id.in_(test_session_ids))
        )

    # Delete questions of test passages
    if test_passage_ids:
        await db.execute(
            delete(Question).where(Question.passage_id.in_(test_passage_ids))
        )
        await db.execute(
            delete(Passage).where(Passage.id.in_(test_passage_ids))
        )

    # Delete test students
    if test_student_ids:
        await db.execute(
            delete(Student).where(Student.id.in_(test_student_ids))
        )

    # Optionally delete test accounts
    deleted_accounts = 0
    if not req.preserve_test_accounts:
        del_acc = await db.execute(
            delete(Teacher).where(Teacher.email.like("%@hearmeread.test"))
        )
        deleted_accounts = del_acc.rowcount or 0

    await db.commit()

    return {
        "message": "Test data reset completed cleanly. Real development data was preserved.",
        "deleted_counts": {
            "sessions": len(test_session_ids),
            "passages": len(test_passage_ids),
            "students": len(test_student_ids),
            "accounts": deleted_accounts,
        },
    }
