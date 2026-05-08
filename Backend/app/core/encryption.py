import hashlib
import hmac

from cryptography.fernet import Fernet

from app.core.config import settings

_fernet = Fernet(settings.ENCRYPTION_KEY.encode())


def encrypt(value: str | None) -> str | None:
    if not value:
        return value
    return _fernet.encrypt(value.encode()).decode()


def decrypt(value: str | None) -> str | None:
    if not value:
        return value
    return _fernet.decrypt(value.encode()).decode()


def hash_lrn(lrn: str | None) -> str | None:
    """Deterministic HMAC-SHA256 of an LRN — used for uniqueness checks without storing plaintext."""
    if not lrn:
        return None
    return hmac.new(settings.ENCRYPTION_KEY.encode(), lrn.encode(), hashlib.sha256).hexdigest()


def hash_token(token: str) -> str:
    """One-way SHA-256 of a single-use token — what gets stored in the DB."""
    return hashlib.sha256(token.encode()).hexdigest()
