import base64
import hashlib
import hmac
import os

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

# For backward compatibility with legacy Fernet-encrypted database records
_fernet = Fernet(settings.ENCRYPTION_KEY.encode())

# Initialize AES-256-GCM using the decoded 32-byte ENCRYPTION_KEY
# Fernet keys are base64encoded 32-byte values.
_raw_key = base64.urlsafe_b64decode(settings.ENCRYPTION_KEY.encode())
_aesgcm = AESGCM(_raw_key)


def encrypt(value: str | None) -> str | None:
    if not value:
        return value
    
    # Encrypt using AES-GCM with a random 12-byte initialization vector (nonce)
    nonce = os.urandom(12)
    ciphertext = _aesgcm.encrypt(nonce, value.encode(), None)
    
    # Combine nonce and ciphertext and base64url-encode
    combined = nonce + ciphertext
    return base64.urlsafe_b64encode(combined).decode().rstrip("=")


def decrypt(value: str | None) -> str | None:
    if not value:
        return value
    
    # Check if the ciphertext is in the legacy Fernet format (always starts with 'gAAAAA')
    if value.startswith("gAAAAA"):
        try:
            return _fernet.decrypt(value.encode()).decode()
        except InvalidToken:
            return value
        except Exception:
            return value

    # Decrypt using AES-GCM
    try:
        # Pad base64 url-safe string if needed
        padding_needed = 4 - (len(value) % 4)
        if padding_needed != 4:
            value_padded = value + ("=" * padding_needed)
        else:
            value_padded = value
        
        combined = base64.urlsafe_b64decode(value_padded.encode())
        if len(combined) < 12:
            return value
        
        nonce = combined[:12]
        ciphertext = combined[12:]
        return _aesgcm.decrypt(nonce, ciphertext, None).decode()
    except Exception:
        return value


def hash_lrn(lrn: str | None) -> str | None:
    """Deterministic HMAC-SHA256 of an LRN — used for uniqueness checks without storing plaintext."""
    if not lrn:
        return None
    return hmac.new(settings.ENCRYPTION_KEY.encode(), lrn.encode(), hashlib.sha256).hexdigest()


def hash_token(token: str) -> str:
    """One-way SHA-256 of a single-use token — what gets stored in the DB."""
    return hashlib.sha256(token.encode()).hexdigest()
