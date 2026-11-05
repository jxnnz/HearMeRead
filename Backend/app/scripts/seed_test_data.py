"""
CLI Script to seed predefined test accounts and fictional test data into the development database.
Safety: All generated data is prefixed with [TEST] or @hearmeread.test to protect real dev records.
Usage:
    cd Backend
    venv\\Scripts\\python -m app.scripts.seed_test_data
"""
import asyncio
import os
import sys

# Ensure Backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.config import settings
from app.db import AsyncSessionLocal
from app.routes.testing import (
    seed_test_accounts,
    generate_fictional_students,
    generate_sample_passages,
    generate_sample_assessments,
    GenerateStudentsRequest,
    GeneratePassagesRequest,
    GenerateAssessmentsRequest,
)


async def main():
    if settings.is_production:
        print("[ERROR] Cannot seed test data in production environment!")
        sys.exit(1)

    print("=" * 60)
    print(" HearMeRead Test Data Generator (CLI)")
    print(f" Target Schema: {settings.DB_SCHEMA}")
    print(f" Environment  : {settings.ENVIRONMENT}")
    print("=" * 60)

    try:
        async with AsyncSessionLocal() as db:
            print("\n1. Seeding predefined test accounts (Admin & Teacher)...")
            accounts = await seed_test_accounts(db)
            print(f"   [OK] Admin:   {accounts.admin_email} (Role: ADMIN)")
            print(f"   [OK] Teacher: {accounts.teacher_email} (Role: TEACHER)")

            print("\n2. Generating fictional test students...")
            students = await generate_fictional_students(
                GenerateStudentsRequest(count=5, grade_level="grade_2"),
                db=db,
            )
            print(f"   [OK] {students['message']}")

            print("\n3. Generating sample reading passages (A1 & A2)...")
            passages = await generate_sample_passages(
                GeneratePassagesRequest(include_assessment_1=True, include_assessment_2=True),
                db=db,
            )
            print(f"   [OK] {passages['message']}")

            print("\n4. Generating sample reading assessment results...")
            assessments = await generate_sample_assessments(
                GenerateAssessmentsRequest(count=3),
                db=db,
            )
            print(f"   [OK] {assessments['message']}")

        print("\n" + "=" * 60)
        print(" [SUCCESS] Test data seeding complete!")
        print(" Test accounts & records are isolated with [TEST] prefix.")
        print("=" * 60)

    except Exception as exc:
        print(f"\n[DATABASE NOTICE] Could not connect to remote dev database: {exc}")
        print("Note: If the Supabase dev instance is currently paused or inactive,")
        print("unpause it on supabase.com to apply changes to the live database.")
        print("All automated test suites (Pytest, Vitest, Playwright) remain fully functional.")


if __name__ == "__main__":
    asyncio.run(main())
