import pytest
from unittest.mock import MagicMock, AsyncMock
from fastapi import HTTPException

from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.models import Teacher, UserRole
from app.dependencies import require_admin, get_current_teacher


@pytest.mark.asyncio
async def test_password_hash_and_verification():
    raw_pwd = "SecureTestPassword123!"
    hashed = await get_password_hash(raw_pwd)
    assert hashed != raw_pwd
    assert await verify_password(raw_pwd, hashed) is True
    assert await verify_password("WrongPassword!", hashed) is False


def test_create_and_decode_access_token():
    email = "teacher@school.edu"
    token = create_access_token({"sub": email})
    assert token is not None
    decoded = decode_access_token(token)
    assert decoded == email


def test_decode_invalid_token():
    assert decode_access_token("invalid.token.here") is None
    assert decode_access_token("") is None


@pytest.mark.asyncio
async def test_require_admin_guard():
    admin_teacher = Teacher(id=1, email="admin@school.edu", role=UserRole.admin)
    regular_teacher = Teacher(id=2, email="teacher@school.edu", role=UserRole.teacher)

    # Admin passes
    res = await require_admin(current_teacher=admin_teacher)
    assert res.role == UserRole.admin

    # Regular teacher is forbidden
    with pytest.raises(HTTPException) as exc_info:
        await require_admin(current_teacher=regular_teacher)
    assert exc_info.value.status_code == 403
    assert "Admin access required" in exc_info.value.detail


@pytest.mark.asyncio
async def test_get_current_teacher_inactive_account():
    inactive_teacher = Teacher(
        id=3,
        email="inactive@school.edu",
        role=UserRole.teacher,
        is_active=False,
    )
    db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = inactive_teacher
    db.execute.return_value = mock_res

    valid_token = create_access_token({"sub": inactive_teacher.email})

    with pytest.raises(HTTPException) as exc_info:
        await get_current_teacher(token=valid_token, db=db)
    assert exc_info.value.status_code == 403
    assert "Account is inactive" in exc_info.value.detail
