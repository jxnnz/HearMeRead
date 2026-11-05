import pytest
from app.core.encryption import encrypt, decrypt, hash_lrn
from app.utils.passage_hash import normalize_text, compute_passage_hash


def test_student_pii_encryption_roundtrip():
    original_name = "Juan Dela Cruz"
    original_lrn = "123456789012"

    enc_name = encrypt(original_name)
    enc_lrn = encrypt(original_lrn)

    assert enc_name != original_name
    assert enc_lrn != original_lrn

    dec_name = decrypt(enc_name)
    dec_lrn = decrypt(enc_lrn)

    assert dec_name == original_name
    assert dec_lrn == original_lrn


def test_lrn_deterministic_hash():
    lrn = "123456789012"
    h1 = hash_lrn(lrn)
    h2 = hash_lrn(lrn)
    h3 = hash_lrn("987654321098")

    assert h1 is not None
    assert h1 == h2
    assert h1 != h3


def test_passage_hashing_and_whitespace_invariance():
    text1 = "Si Pagong at si Matsing ay naghati ng puno ng saging."
    text2 = "  si  pagong at si matsing ay naghati ng puno ng saging. \n\n"

    h1 = compute_passage_hash(2, content=text1)
    h2 = compute_passage_hash(2, content=text2)

    assert h1 == h2
    assert len(h1) == 64
