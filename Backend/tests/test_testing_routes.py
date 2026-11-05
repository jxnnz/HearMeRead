import pytest
from unittest.mock import patch
from fastapi import HTTPException

from app.routes.testing import assert_not_production


def test_production_safety_guard_blocks_testing():
    with patch("app.routes.testing.settings") as mock_settings:
        mock_settings.is_production = True
        mock_settings.ENVIRONMENT = "production"
        with pytest.raises(HTTPException) as exc:
            assert_not_production()
        assert exc.value.status_code == 403
        assert "strictly forbidden in production" in exc.value.detail


def test_development_mode_allows_testing():
    with patch("app.routes.testing.settings") as mock_settings:
        mock_settings.is_production = False
        mock_settings.ENVIRONMENT = "development"
        # Should execute cleanly without raising
        assert_not_production()
