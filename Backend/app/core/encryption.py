import hashlib
import hmac

from cryptography.fernet import Fernet

from app.core.config import settings

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        _fernet = Fernet(settings.ENCRYPTION_KEY.encode())
    return _fernet


def encrypt(value: str | None) -> str | None:
    if not value:
        return value
    return _get_fernet().encrypt(value.encode()).decode()


def decrypt(value: str | None) -> str | None:
    if not value:
        return value
    return _get_fernet().decrypt(value.encode()).decode()


def hash_lrn(lrn: str | None) -> str | None:
    """Deterministic HMAC-SHA256 of an LRN — used for uniqueness checks without storing plaintext."""
    if not lrn:
        return None
    return hmac.new(settings.ENCRYPTION_KEY.encode(), lrn.encode(), hashlib.sha256).hexdigest()
