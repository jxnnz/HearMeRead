"""
CLI Script to safely purge ONLY records tagged as test data ([TEST] prefix or @hearmeread.test).
Safety: Real development records are completely preserved.
Usage:
    cd Backend
    venv\\Scripts\\python -m app.scripts.reset_test_data [--keep-accounts]
"""
import asyncio
import os
import sys

# Ensure Backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.config import settings
from app.db import AsyncSessionLocal
from app.routes.testing import reset_test_data, ResetTestDataRequest


async def main():
    if settings.is_production:
        print("[ERROR] Cannot run test reset in production environment!")
        sys.exit(1)

    print("=" * 60)
    print(" HearMeRead Test Data Reset (CLI)")
    print(f" Target Schema: {settings.DB_SCHEMA}")
    print(f" Environment  : {settings.ENVIRONMENT}")
    print(" Safety Guarantee: Only records with [TEST] or @hearmeread.test are deleted.")
    print("=" * 60)

    confirm = input("Are you sure you want to purge all test data? (yes/no): ").strip().lower()
    if confirm not in ("yes", "y"):
        print("Aborted by user.")
        return

    try:
        async with AsyncSessionLocal() as db:
            res = await reset_test_data(
                ResetTestDataRequest(confirm=True, preserve_test_accounts=True),
                db=db,
            )
            print(f"\n[OK] {res['message']}")
            print(f"Deleted counts: {res['deleted_counts']}")
    except Exception as exc:
        print(f"\n[DATABASE NOTICE] Could not connect to remote dev database: {exc}")
        print("Note: If the Supabase dev instance is currently paused or inactive,")
        print("unpause it on supabase.com to apply changes to the live database.")


if __name__ == "__main__":
    asyncio.run(main())
