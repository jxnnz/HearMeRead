import asyncio, os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models import Student, StudentEnrollment, Teacher
from app.core.encryption import decrypt

async def backfill_for_url(db_url: str, label: str):
    print(f"\n==========================================")
    print(f"Running backfill for {label}...")
    engine = create_async_engine(
        db_url,
        connect_args={"ssl": "require", "statement_cache_size": 0, "prepared_statement_cache_size": 0}
    )
    Session = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as session:
        t_res = await session.execute(select(Teacher))
        teacher_map = {t.id: t for t in t_res.scalars().all()}

        s_res = await session.execute(select(Student).where(Student.is_archived == False))
        students = s_res.scalars().all()

        e_res = await session.execute(select(StudentEnrollment))
        enrollments = e_res.scalars().all()
        enrolled_keys = {(e.student_id, e.teacher_id, e.school_year) for e in enrollments}

        added = 0
        for s in students:
            t = teacher_map.get(s.teacher_id)
            if not t or not t.school_id:
                continue
            sy = s.school_year or "2026-2027"
            key = (s.id, s.teacher_id, sy)
            if key not in enrolled_keys:
                enrollment = StudentEnrollment(
                    student_id=s.id,
                    teacher_id=s.teacher_id,
                    school_id=t.school_id,
                    grade_level=s.grade_level,
                    section=s.section,
                    school_year=sy,
                )
                session.add(enrollment)
                enrolled_keys.add(key)
                added += 1
                fn = decrypt(s.first_name) if s.first_name else ""
                ln = decrypt(s.last_name) if s.last_name else ""
                print(f"  Enrolling Student {s.id} ({ln}, {fn}) -> Teacher {t.id}, SY: {sy}, Grade: {s.grade_level}, Sec: {s.section}")

        if added > 0:
            await session.commit()
            print(f"Successfully backfilled {added} missing student enrollments for {label}!")
        else:
            print(f"All students are already enrolled for {label}.")

    await engine.dispose()

async def main():
    prod_url = "postgresql+asyncpg://postgres.dybsixttckdzsnyqtvlo:HearMeRead2026@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
    local_url = "postgresql+asyncpg://postgres.bqdgomkpemjqokkoudww:HearMeRead2026@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

    await backfill_for_url(prod_url, "PRODUCTION")
    await backfill_for_url(local_url, "LOCAL/DEV")

if __name__ == "__main__":
    asyncio.run(main())
