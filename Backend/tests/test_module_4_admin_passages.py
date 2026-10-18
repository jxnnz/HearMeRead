import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from app.models import Teacher, Passage, Language, GradeLevel
from app.routes.admin import (
    create_public_passage,
    update_public_passage,
    archive_public_passage,
    restore_public_passage,
)


@pytest.mark.asyncio
async def test_create_public_passage_with_story_number():
    mock_admin = MagicMock(spec=Teacher)
    mock_admin.id = 1
    mock_admin.school_id = 10

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    payload = {
        "title": "Ang Matalinong Pagong",
        "assessment_type": 2,
        "grade_level": "grade_2",
        "language": "filipino",
        "content": "May isang matalinong pagong...",
        "word_count": 50,
        "story_number": 3,
    }

    res = await create_public_passage(payload, current_admin=mock_admin, db=mock_db)
    assert mock_db.add.called
    created_passage = mock_db.add.call_args[0][0]
    assert created_passage.story_number == 3
    assert created_passage.title == "Ang Matalinong Pagong"


@pytest.mark.asyncio
async def test_update_public_passage_direct_own_school():
    mock_admin = MagicMock(spec=Teacher)
    mock_admin.id = 1
    mock_admin.school_id = 10

    passage_owner = MagicMock(spec=Teacher)
    passage_owner.school_id = 10

    passage = MagicMock(spec=Passage)
    passage.id = 101
    passage.teacher_id = 1
    passage.title = "Old Title"
    passage.story_number = 1
    passage.original_passage_id = None
    passage.teacher = passage_owner

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = passage

    mock_creator_res = MagicMock()
    mock_creator_res.scalar_one_or_none.return_value = passage_owner

    mock_db.execute = AsyncMock(side_effect=[mock_result, mock_creator_res])
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    payload = {
        "title": "Updated Title",
        "story_number": 4,
    }

    res = await update_public_passage(101, payload, current_admin=mock_admin, db=mock_db)
    assert passage.title == "Updated Title"
    assert passage.story_number == 4


@pytest.mark.asyncio
async def test_update_public_passage_clone_on_write():
    mock_admin = MagicMock(spec=Teacher)
    mock_admin.id = 2
    mock_admin.school_id = 20

    passage_owner = MagicMock(spec=Teacher)
    passage_owner.school_id = 10  # Different school

    passage = MagicMock(spec=Passage)
    passage.id = 201
    passage.teacher_id = 1
    passage.title = "Global Title"
    passage.assessment_type = 2
    passage.grade_level = GradeLevel.grade_1
    passage.language = Language.english
    passage.content = "Original story text."
    passage.task1_content = None
    passage.task2_words = None
    passage.task2_sentences = None
    passage.comprehension_questions = None
    passage.story_number = 2
    passage.word_count = 20
    passage.file_path = None
    passage.original_passage_id = None
    passage.teacher = passage_owner

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = passage

    mock_creator_res = MagicMock()
    mock_creator_res.scalar_one_or_none.return_value = passage_owner

    mock_qs_res = MagicMock()
    mock_qs_res.scalars.return_value.all.return_value = []

    mock_db.execute = AsyncMock(side_effect=[mock_result, mock_creator_res, mock_qs_res])
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    payload = {
        "title": "Cloned & Updated Title",
        "story_number": 5,
    }

    res = await update_public_passage(201, payload, current_admin=mock_admin, db=mock_db)
    assert mock_db.add.called
    cloned = mock_db.add.call_args[0][0]
    assert cloned.teacher_id == mock_admin.id
    assert cloned.original_passage_id == 201
    assert cloned.title == "Cloned & Updated Title"
    assert cloned.story_number == 5


@pytest.mark.asyncio
async def test_archive_public_passage_clone_on_archive_for_different_school():
    mock_admin = MagicMock(spec=Teacher)
    mock_admin.id = 3
    mock_admin.school_id = 30

    passage_owner = MagicMock(spec=Teacher)
    passage_owner.school_id = 10  # Different school

    passage = MagicMock(spec=Passage)
    passage.id = 301
    passage.teacher_id = 1
    passage.title = "Global Passage"
    passage.assessment_type = 2
    passage.grade_level = GradeLevel.grade_2
    passage.language = Language.filipino
    passage.content = "Kwento"
    passage.task1_content = None
    passage.task2_words = None
    passage.task2_sentences = None
    passage.comprehension_questions = None
    passage.story_number = 1
    passage.word_count = 15
    passage.file_path = None
    passage.original_passage_id = None
    passage.is_archived = False
    passage.teacher = passage_owner

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = passage

    mock_creator_res = MagicMock()
    mock_creator_res.scalar_one_or_none.return_value = passage_owner

    mock_override_res = MagicMock()
    mock_override_res.scalar_one_or_none.return_value = None

    mock_db.execute = AsyncMock(side_effect=[mock_result, mock_creator_res, mock_override_res])
    mock_db.add = MagicMock()
    mock_db.flush = AsyncMock()
    mock_db.commit = AsyncMock()

    with patch("app.services.log_service.log_activity", new_callable=AsyncMock) as mock_log:
        res = await archive_public_passage(301, current_admin=mock_admin, db=mock_db)
        assert res["detail"] == "Passage archived successfully"
        # Passage itself must NOT be archived directly
        assert passage.is_archived is False
        # A cloned override record must be added with is_archived = True
        assert mock_db.add.called
        archived_override = mock_db.add.call_args[0][0]
        assert archived_override.teacher_id == mock_admin.id
        assert archived_override.original_passage_id == 301
        assert archived_override.is_archived is True
        assert mock_log.called
        assert mock_log.call_args[1]["action"] == "archived_passage"


@pytest.mark.asyncio
async def test_archive_and_restore_public_passage_own_school():
    mock_admin = MagicMock(spec=Teacher)
    mock_admin.id = 1
    mock_admin.school_id = 10

    passage_owner = MagicMock(spec=Teacher)
    passage_owner.school_id = 10

    passage = MagicMock(spec=Passage)
    passage.id = 401
    passage.teacher_id = 1
    passage.title = "Own School Passage"
    passage.is_archived = False
    passage.original_passage_id = None
    passage.teacher = passage_owner

    mock_db = AsyncMock()
    mock_result1 = MagicMock()
    mock_result1.scalar_one_or_none.return_value = passage
    mock_creator_res = MagicMock()
    mock_creator_res.scalar_one_or_none.return_value = passage_owner

    mock_result2 = MagicMock()
    mock_result2.scalar_one_or_none.return_value = passage
    mock_creator_res2 = MagicMock()
    mock_creator_res2.scalar_one_or_none.return_value = passage_owner

    mock_db.execute = AsyncMock(side_effect=[mock_result1, mock_creator_res, mock_result2, mock_creator_res2])
    mock_db.commit = AsyncMock()

    with patch("app.services.log_service.log_activity", new_callable=AsyncMock) as mock_log:
        # 1. Archive
        res_arch = await archive_public_passage(401, current_admin=mock_admin, db=mock_db)
        assert res_arch["detail"] == "Passage archived successfully"
        assert passage.is_archived is True
        assert mock_log.call_args[1]["action"] == "archived_passage"

        # 2. Restore
        res_rest = await restore_public_passage(401, current_admin=mock_admin, db=mock_db)
        assert res_rest["detail"] == "Passage restored successfully"
        assert passage.is_archived is False
        assert mock_log.call_args[1]["action"] == "restored_passage"


@pytest.mark.asyncio
async def test_super_admin_archive_globally():
    # Super admin user
    mock_super_admin = MagicMock(spec=Teacher)
    mock_super_admin.id = 99
    mock_super_admin.email = "senya.sign@gmail.com"
    mock_super_admin.school_id = 1

    passage = MagicMock(spec=Passage)
    passage.id = 501
    passage.title = "Passage to delete globally"
    passage.original_passage_id = None
    passage.is_archived = False

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = passage

    mock_db.execute = AsyncMock(return_value=mock_result)
    mock_db.commit = AsyncMock()

    with patch("app.services.log_service.log_activity", new_callable=AsyncMock) as mock_log:
        res = await archive_public_passage(501, current_admin=mock_super_admin, db=mock_db)
        assert "globally" in res["detail"]
        assert passage.is_archived is True
        assert mock_log.called
        assert mock_log.call_args[1]["action"] == "superadmin_archived_passage_globally"


@pytest.mark.asyncio
async def test_super_admin_restore_globally():
    mock_super_admin = MagicMock(spec=Teacher)
    mock_super_admin.id = 99
    mock_super_admin.email = "senya.sign@gmail.com"
    mock_super_admin.school_id = 1

    passage = MagicMock(spec=Passage)
    passage.id = 501
    passage.title = "Passage to restore globally"
    passage.original_passage_id = None
    passage.is_archived = True

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = passage

    mock_db.execute = AsyncMock(return_value=mock_result)
    mock_db.commit = AsyncMock()

    with patch("app.services.log_service.log_activity", new_callable=AsyncMock) as mock_log:
        res = await restore_public_passage(501, current_admin=mock_super_admin, db=mock_db)
        assert res["detail"] == "Passage restored successfully"
        assert passage.is_archived is False
        assert mock_log.called
        assert mock_log.call_args[1]["action"] == "restored_passage"
