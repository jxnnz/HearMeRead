import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.config import settings
from app.core.encryption import hash_token as _hash_token
from app.core.security import verify_password, get_password_hash, create_access_token
from app.db import get_db
from app.dependencies import get_current_teacher
from app.models import Teacher, EmailVerificationToken, PasswordResetToken
from app.schema import (
    TeacherRegister, LoginRequest, TokenResponse,
    TeacherResponse, ResendVerificationRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
)
from app.services.email_service import send_verification_email, send_password_reset_email
from app.core.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["Auth"])

# Token validity windows
_TOKEN_EXPIRE_HOURS       = 24   # email verification
_RESET_TOKEN_EXPIRE_HOURS = 1    # password reset


def _generate_token() -> str:
    """Generate a cryptographically secure 48-char hex token."""
    return secrets.token_hex(24)   # 24 bytes → 48 hex chars



async def _create_verification_token(db: AsyncSession, teacher_id: int) -> str:
    """
    Invalidate any existing unused tokens for this teacher,
    then create and persist a fresh one. Returns the raw token string.
    """
    # Expire all previous unused tokens for this teacher
    await db.execute(
        update(EmailVerificationToken)
        .where(
            EmailVerificationToken.teacher_id == teacher_id,
            EmailVerificationToken.used_at.is_(None),
        )
        .values(expires_at=datetime.now(timezone.utc))  # set to past → expired
    )

    token_str = _generate_token()
    token_obj = EmailVerificationToken(
        teacher_id=teacher_id,
        token=_hash_token(token_str),  # store hash; raw token goes only in the email
        expires_at=datetime.now(timezone.utc) + timedelta(hours=_TOKEN_EXPIRE_HOURS),
    )
    db.add(token_obj)
    await db.flush()   # get the id without committing
    return token_str


# ── Register ──────────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=TeacherResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new teacher account",
    description=(
        "Creates the account in an **unverified** state. "
        "A verification email is sent immediately. "
        "The teacher cannot log in until they click the link."
    ),
)
@limiter.limit("3/minute")
async def register(request: Request, data: TeacherRegister, db: AsyncSession = Depends(get_db)):
    # 1. Duplicate email check
    result = await db.execute(select(Teacher).where(Teacher.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # 2. Create teacher (is_verified=False by default)
    teacher = Teacher(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        hashed_password=await get_password_hash(data.password),
    )
    db.add(teacher)
    await db.flush()   # gives teacher.id without full commit

    # 3. Create verification token
    token_str = await _create_verification_token(db, teacher.id)

    # 4. Commit everything together so we never have a teacher without a token
    await db.commit()
    await db.refresh(teacher)

    # 5. Send verification email (after commit so DB is safe even if email fails)
    try:
        await send_verification_email(
            to_email=teacher.email,
            first_name=teacher.first_name,
            token=token_str,
        )
    except RuntimeError:
        # Email failed — account exists but is unverified.
        # Teacher can use /resend-verification to get a new link.
        # We do NOT roll back the account — that would be worse UX.
        pass

    return teacher


# ── Verify email ──────────────────────────────────────────────────────────────

@router.get(
    "/verify",
    summary="Verify email address via token link",
    description=(
        "Called when the teacher clicks the link in their email. "
        "On success, marks the account as verified and redirects to "
        "`{FRONTEND_URL}/login?verified=true`. "
        "On failure, redirects to `{FRONTEND_URL}/login?error=invalid_token`."
    ),
)
@limiter.limit("5/minute")
async def verify_email(
    request: Request,
    token: str = Query(..., description="The verification token from the email link"),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)

    # 1. Look up the token by its hash (raw token is never stored in DB)
    result = await db.execute(
        select(EmailVerificationToken)
        .where(EmailVerificationToken.token == _hash_token(token))
    )
    token_obj = result.scalar_one_or_none()

    frontend_login = f"{settings.FRONTEND_URL}/login"

    # 2. Validate: exists, not used, not expired
    if (
        not token_obj
        or token_obj.used_at is not None
        or token_obj.expires_at < now
    ):
        return RedirectResponse(
            url=f"{frontend_login}?error=invalid_token",
            status_code=status.HTTP_302_FOUND,
        )

    # 3. Mark token as used
    token_obj.used_at = now

    # 4. Mark teacher as verified
    result = await db.execute(
        select(Teacher).where(Teacher.id == token_obj.teacher_id)
    )
    teacher = result.scalar_one_or_none()
    if not teacher:
        return RedirectResponse(
            url=f"{frontend_login}?error=invalid_token",
            status_code=status.HTTP_302_FOUND,
        )

    teacher.is_verified = True
    await db.commit()

    # 5. Redirect to login page with success flag
    return RedirectResponse(
        url=f"{frontend_login}?verified=true",
        status_code=status.HTTP_302_FOUND,
    )


# ── Resend verification ───────────────────────────────────────────────────────

@router.post(
    "/resend-verification",
    status_code=status.HTTP_200_OK,
    summary="Resend the email verification link",
    description=(
        "Use this when the teacher did not receive the first email or the link expired. "
        "Always returns 200 — never reveals whether the email exists (prevents enumeration)."
    ),
)
@limiter.limit("3/minute")
async def resend_verification(
    request: Request,
    data: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Teacher).where(Teacher.email == data.email))
    teacher = result.scalar_one_or_none()

    # Always return the same response — don't leak whether the email exists
    ok_response = {"message": "If that email is registered and unverified, a new link has been sent."}

    if not teacher or teacher.is_verified or not teacher.is_active:
        return ok_response

    # Generate new token (old ones are expired inside this helper)
    token_str = await _create_verification_token(db, teacher.id)
    await db.commit()

    try:
        await send_verification_email(
            to_email=teacher.email,
            first_name=teacher.first_name,
            token=token_str,
        )
    except RuntimeError:
        pass  # Silently fail — don't reveal SMTP issues to callers

    return ok_response


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with email and password",
)
@limiter.limit("5/minute")
async def login(request: Request, data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Teacher).where(Teacher.email == data.email))
    teacher = result.scalar_one_or_none()

    # Constant-time path: run verify_password even for missing teachers
    # so timing attacks cannot enumerate valid email addresses
    dummy_hash = "$2b$12$KIXnMqiEdSY9CSoRYqYTuO2R6w1J/EeRKRpjLxDqZQeUVOZ9r7Pce"
    password_ok = await verify_password(
        data.password,
        teacher.hashed_password if teacher else dummy_hash,
    )

    if not teacher or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Guard: account must be verified before login is allowed
    if not teacher.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in. "
                   "Check your inbox or request a new verification link.",
        )

    if not teacher.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact your administrator.",
        )

    token = create_access_token(
        data={"sub": teacher.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(access_token=token)


# ── Me ────────────────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=TeacherResponse,
    summary="Get the currently authenticated teacher",
)
async def get_me(current_teacher: Teacher = Depends(get_current_teacher)):
    return current_teacher


# ── Forgot password ───────────────────────────────────────────────────────────

@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK,
    summary="Request a password reset link",
    description=(
        "Sends a password reset email if the address is registered. "
        "Always returns 200 — never reveals whether the email exists."
    ),
)
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    ok_response = {"message": "If that email is registered, a password reset link has been sent."}

    result = await db.execute(select(Teacher).where(Teacher.email == data.email))
    teacher = result.scalar_one_or_none()

    if not teacher or not teacher.is_active:
        return ok_response

    # Invalidate any existing unused reset tokens for this teacher
    await db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.teacher_id == teacher.id,
            PasswordResetToken.used_at.is_(None),
        )
        .values(expires_at=datetime.now(timezone.utc))
    )

    token_str = _generate_token()
    token_obj = PasswordResetToken(
        teacher_id=teacher.id,
        token=_hash_token(token_str),  # store hash; raw token goes only in the email
        expires_at=datetime.now(timezone.utc) + timedelta(hours=_RESET_TOKEN_EXPIRE_HOURS),
    )
    db.add(token_obj)
    await db.commit()

    try:
        await send_password_reset_email(
            to_email=teacher.email,
            first_name=teacher.first_name,
            token=token_str,
        )
    except RuntimeError:
        pass  # Silently fail — don't reveal SMTP issues to callers

    return ok_response


# ── Reset password ────────────────────────────────────────────────────────────

@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    summary="Reset password using a valid token",
)
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token == _hash_token(data.token))
    )
    token_obj = result.scalar_one_or_none()

    if (
        not token_obj
        or token_obj.used_at is not None
        or token_obj.expires_at < now
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link is invalid or has expired.",
        )

    result = await db.execute(
        select(Teacher).where(Teacher.id == token_obj.teacher_id)
    )
    teacher = result.scalar_one_or_none()

    if not teacher or not teacher.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link is invalid or has expired.",
        )

    teacher.hashed_password = await get_password_hash(data.new_password)
    token_obj.used_at = now
    await db.commit()

    return {"message": "Password reset successfully. You can now log in with your new password."}