import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from app.models import Teacher, UserRole, GradeLevel, TeacherAssignment, Student
from app.routes.admin import ReassignStudentsRequest, reassign_students, _current_school_year
from app.core.encryption import encrypt, decrypt


def test_encryption_and_decryption_middle_name():
    original = "Santos"
    enc = encrypt(original)
    dec = decrypt(enc)
    assert dec == original


@pytest.mark.asyncio
async def test_reassign_students_rejects_inactive_target_teacher():
    # Admin
    mock_admin = MagicMock(spec=Teacher)
    mock_admin.id = 1
    mock_admin.school_id = 10

    # Source teacher
    from_teacher = MagicMock(spec=Teacher)
    from_teacher.id = 2
    from_teacher.school_id = 10
    from_teacher.is_active = False

    # Target teacher (inactive)
    to_teacher = MagicMock(spec=Teacher)
    to_teacher.id = 3
    to_teacher.school_id = 10
    to_teacher.is_active = False

    mock_db = AsyncMock()

    # Mock execute results
    async def mock_execute(query):
        mock_result = MagicMock()
        # check query string or params
        query_str = str(query)
        if "teachers.id = :id_1" in query_str or "teachers.id = 2" in query_str:
            mock_result.scalar_one_or_none.return_value = from_teacher
        elif "teachers.id = 3" in query_str:
            mock_result.scalar_one_or_none.return_value = to_teacher
        else:
            mock_result.scalar_one_or_none.return_value = from_teacher
        return mock_result

    # First call returns from_teacher, second call returns to_teacher
    res1 = MagicMock()
    res1.scalar_one_or_none.return_value = from_teacher
    res2 = MagicMock()
    res2.scalar_one_or_none.return_value = to_teacher

    mock_db.execute = AsyncMock(side_effect=[res1, res2])

    payload = ReassignStudentsRequest(
        from_teacher_id=2,
        grade_level="grade_1",
        section="Emerald",
        to_teacher_id=3,
    )

    with pytest.raises(HTTPException) as exc_info:
        await reassign_students(
            payload=payload,
            current_admin=mock_admin,
            db=mock_db,
        )
    assert exc_info.value.status_code == 400
    assert "Cannot reassign students to an inactive or archived teacher" in exc_info.value.detail


@pytest.mark.asyncio
async def test_reassign_students_success():
    mock_admin = MagicMock(spec=Teacher)
    mock_admin.id = 1
    mock_admin.school_id = 10

    from_teacher = MagicMock(spec=Teacher)
    from_teacher.id = 2
    from_teacher.school_id = 10
    from_teacher.is_active = False
    from_teacher.grade_level = GradeLevel.grade_1
    from_teacher.section = "Emerald"

    to_teacher = MagicMock(spec=Teacher)
    to_teacher.id = 3
    to_teacher.school_id = 10
    to_teacher.is_active = True
    to_teacher.grade_level = None
    to_teacher.section = None

    old_asgn = MagicMock(spec=TeacherAssignment)
    old_asgn.is_active = True

    res1 = MagicMock()
    res1.scalar_one_or_none.return_value = from_teacher
    res2 = MagicMock()
    res2.scalar_one_or_none.return_value = to_teacher

    res_old_asgns = MagicMock()
    res_old_asgns.scalars.return_value.all.return_value = [old_asgn]

    res_new_asgn = MagicMock()
    res_new_asgn.scalar_one_or_none.return_value = None

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.execute = AsyncMock(side_effect=[
        res1,               # from_res
        res2,               # to_res
        MagicMock(),        # update(Student)
        MagicMock(),        # update(StudentEnrollment)
        res_old_asgns,      # old_asgns_res
        res_new_asgn,       # asgn_check
    ])

    payload = ReassignStudentsRequest(
        from_teacher_id=2,
        grade_level="grade_1",
        section="Emerald",
        to_teacher_id=3,
    )

    res = await reassign_students(
        payload=payload,
        current_admin=mock_admin,
        db=mock_db,
    )

    assert res["detail"] == "Students reassigned successfully"
    # Old teacher's grade and section were cleared
    assert from_teacher.grade_level is None
    assert from_teacher.section is None
    # Old assignment was deactivated
    assert old_asgn.is_active is False
    # New teacher acquired grade and section
    assert to_teacher.grade_level == GradeLevel.grade_1
    assert to_teacher.section == "Emerald"
    # DB was committed
    assert mock_db.commit.await_count >= 1


@pytest.mark.asyncio
async def test_list_class_cards_handles_inactive_teachers_and_orphaned_classes():
    from app.routes.admin import list_class_cards

    current_year = _current_school_year()

    mock_admin = MagicMock(spec=Teacher)
    mock_admin.id = 1
    mock_admin.school_id = 10

    # Inactive teacher who had assignments
    inactive_teacher = MagicMock(spec=Teacher)
    inactive_teacher.id = 2
    inactive_teacher.first_name = encrypt("Maria")
    inactive_teacher.last_name = encrypt("Clara")
    inactive_teacher.is_active = False
    inactive_teacher.grade_level = GradeLevel.grade_1
    inactive_teacher.section = "Emerald"
    inactive_teacher.school_id = 10
    inactive_teacher.role = UserRole.teacher

    # Current year assignment
    asgn_cur = MagicMock(spec=TeacherAssignment)
    asgn_cur.teacher_id = 2
    asgn_cur.grade_level = GradeLevel.grade_1
    asgn_cur.section = "Emerald"
    asgn_cur.school_year = current_year
    asgn_cur.is_active = True

    # Past year assignment
    asgn_past = MagicMock(spec=TeacherAssignment)
    asgn_past.teacher_id = 2
    asgn_past.grade_level = GradeLevel.grade_1
    asgn_past.section = "Emerald"
    asgn_past.school_year = "2023-2024"
    asgn_past.is_active = True

    res_asgn = MagicMock()
    res_asgn.scalars.return_value.all.return_value = [asgn_cur, asgn_past]

    res_cur_teachers = MagicMock()
    res_cur_teachers.scalars.return_value.all.return_value = [inactive_teacher]

    res_teacher_map = MagicMock()
    res_teacher_map.scalars.return_value.all.return_value = [inactive_teacher]

    res_enr = MagicMock()
    res_enr.fetchall.return_value = []

    res_stu = MagicMock()
    res_stu.fetchall.return_value = []

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(side_effect=[
        res_asgn,
        res_cur_teachers,
        res_teacher_map,
        res_enr,
        res_stu,
    ])

    cards = await list_class_cards(current_admin=mock_admin, db=mock_db)

    assert len(cards) == 2
    # Current year card is orphaned
    cur_card = next(c for c in cards if c["school_year"] == current_year)
    assert cur_card["has_active_teacher"] is False
    assert cur_card["teacher_name"] == "No Adviser Assigned"

    # Past year card retains historical teacher name
    past_card = next(c for c in cards if c["school_year"] == "2023-2024")
    assert past_card["has_active_teacher"] is True
    assert past_card["teacher_name"] == "Maria Clara"

