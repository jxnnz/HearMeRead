import secrets
import string
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
from app.models import Teacher, EmailVerificationToken, PasswordResetToken, School, UserRole
from app.schema import (
    TeacherRegister, LoginRequest, TokenResponse,
    TeacherResponse, ResendVerificationRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
    SchoolLookupResponse, TeacherProfileUpdate, ProfilePictureUrlResponse
)
from app.services.email_service import (
    send_verification_email, send_password_reset_email, send_admin_welcome_email,
)
from app.core.rate_limit import limiter
from app.services.log_service import log_activity

router = APIRouter(prefix="/auth", tags=["Auth"])

# Token validity windows
_TOKEN_EXPIRE_HOURS       = 24   # email verification
_RESET_TOKEN_EXPIRE_HOURS = 1    # password reset

_SCHOOL_CODE_ALPHABET = string.ascii_uppercase + string.digits


def _generate_token() -> str:
    """Generate a cryptographically secure 48-char hex token."""
    return secrets.token_hex(24)   # 24 bytes → 48 hex chars


def _generate_school_code() -> str:
    """Generate a random 8-char uppercase alphanumeric school code."""
    return "".join(secrets.choice(_SCHOOL_CODE_ALPHABET) for _ in range(8))


async def _generate_unique_school_code(db: AsyncSession) -> str:
    """Retry up to 5 times to find a code not already in use."""
    for _ in range(5):
        code = _generate_school_code()
        result = await db.execute(select(School).where(School.school_code == code))
        if result.scalar_one_or_none() is None:
            return code
    raise RuntimeError("Failed to generate unique school code")



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
    summary="Register a new teacher or admin account",
    description=(
        "Creates the account in an **unverified** state. "
        "A verification email is sent immediately. "
        "Admins receive their generated school code in the email. "
        "The user cannot log in until they click the verification link."
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

    school_code_out: str | None = None

    if data.role == UserRole.admin:
        # ── Admin path ──────────────────────────────────────────────────────
        # Guard: check if a school with this DepEd School ID already exists
        deped_id = data.deped_school_id.strip() if data.deped_school_id else None
        if deped_id:
            existing = await db.execute(
                select(School).where(School.deped_school_id == deped_id)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A school with this DepEd School ID is already registered. "
                           "If you are a teacher, please register with a Teacher account instead.",
                )

        school_code_out = await _generate_unique_school_code(db)
        school = School(
            school_code=school_code_out,
            deped_school_id=deped_id,
            name=data.school_name,
            admin_id=None,
        )
        db.add(school)
        await db.flush()   # get school.id

        teacher = Teacher(
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
            hashed_password=await get_password_hash(data.password),
            role=UserRole.admin,
            school_id=school.id,
            agreed_to_terms=data.agreed_to_terms,
            agreed_to_privacy=data.agreed_to_privacy,
        )
        db.add(teacher)
        await db.flush()   # get teacher.id

        school.admin_id = teacher.id

    else:
        # ── Teacher path ────────────────────────────────────────────────────
        school_id: int | None = None
        if data.deped_school_id or data.school_code:
            # Try DepEd School ID first, then fall back to school code
            school = None
            if data.deped_school_id:
                res = await db.execute(
                    select(School).where(School.deped_school_id == data.deped_school_id.strip())
                )
                school = res.scalar_one_or_none()
            if not school and data.school_code:
                res = await db.execute(
                    select(School).where(School.school_code == data.school_code.upper())
                )
                school = res.scalar_one_or_none()
            if not school:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No school found with that ID or code. Please check with your administrator.",
                )
            school_id = school.id

        teacher = Teacher(
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
            hashed_password=await get_password_hash(data.password),
            role=UserRole.teacher,
            school_id=school_id,
            agreed_to_terms=data.agreed_to_terms,
            agreed_to_privacy=data.agreed_to_privacy,
        )
        db.add(teacher)
        await db.flush()

    # Create verification token
    token_str = await _create_verification_token(db, teacher.id)
    await db.commit()
    await db.refresh(teacher)

    # Send email after commit so DB is safe even if email fails
    try:
        if data.role == UserRole.admin:
            await send_admin_welcome_email(
                to_email=teacher.email,
                first_name=teacher.first_name,
                school_name=data.school_name,
                school_code=school_code_out,
                token=token_str,
            )
        else:
            await send_verification_email(
                to_email=teacher.email,
                first_name=teacher.first_name,
                token=token_str,
            )
    except RuntimeError:
        pass

    # Build response dict — school_code not on Teacher model directly
    response_data = {
        "id":          teacher.id,
        "first_name":  teacher.first_name,
        "last_name":   teacher.last_name,
        "email":       teacher.email,
        "role":        teacher.role,
        "school_id":   teacher.school_id,
        "school_code": school_code_out,
    }
    return TeacherResponse(**response_data)


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
    if teacher.school_id:
        await log_activity(
            db, teacher.id, teacher.school_id,
            action="logged_in",
            entity_type="auth",
            metadata={"email": teacher.email},
        )
    return TokenResponse(access_token=token, role=teacher.role)


# ── Me ────────────────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=TeacherResponse,
    summary="Get the currently authenticated teacher",
)
async def get_me(
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    from app.services.storage_service import get_presigned_url
    
    # Eagerly load school relationship
    if current_teacher.school_id:
        school_result = await db.execute(
            select(School).where(School.id == current_teacher.school_id)
        )
        school = school_result.scalar_one_or_none()
    else:
        school = None

    response_data = TeacherResponse.model_validate(current_teacher)
    if school:
        response_data.school_name = school.name
        response_data.school_code = school.school_code
        response_data.deped_school_id = school.deped_school_id
    if current_teacher.profile_picture_url:
        response_data.profile_picture_url = get_presigned_url(current_teacher.profile_picture_url, expires_in=3600)
    return response_data


@router.patch(
    "/me",
    response_model=TeacherResponse,
    summary="Update the currently authenticated teacher's profile",
)
async def update_me(
    data: TeacherProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    from app.services.storage_service import get_presigned_url
    
    if data.first_name is not None:
        current_teacher.first_name = data.first_name
    if data.last_name is not None:
        current_teacher.last_name = data.last_name
    if data.employee_id is not None:
        if data.employee_id:
            conflict = await db.execute(
                select(Teacher).where(
                    Teacher.employee_id == data.employee_id,
                    Teacher.id != current_teacher.id,
                )
            )
            if conflict.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This Employee ID is already in use by another account.",
                )
        current_teacher.employee_id = data.employee_id
    if data.profile_picture_url is not None:
        current_teacher.profile_picture_url = data.profile_picture_url

    await db.commit()
    await db.refresh(current_teacher)
    
    # Eagerly load school relationship
    if current_teacher.school_id:
        school_result = await db.execute(
            select(School).where(School.id == current_teacher.school_id)
        )
        school = school_result.scalar_one_or_none()
    else:
        school = None

    response_data = TeacherResponse.model_validate(current_teacher)
    if school:
        response_data.school_name = school.name
        response_data.school_code = school.school_code
        response_data.deped_school_id = school.deped_school_id
    if current_teacher.profile_picture_url:
        response_data.profile_picture_url = get_presigned_url(current_teacher.profile_picture_url, expires_in=3600)
    return response_data


@router.get(
    "/me/profile-picture-url",
    response_model=ProfilePictureUrlResponse,
    summary="Get a presigned URL to upload a profile picture",
)
async def get_profile_picture_upload_url(
    content_type: str = Query(..., description="MIME type of the image, e.g. image/jpeg or image/png"),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    if content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported image format. Allowed: image/jpeg, image/png, image/webp"
        )
        
    from app.services.storage_service import _make_key, generate_presigned_put_url
    import os
    ext = content_type.split("/")[-1]
    key = _make_key(f"profiles/{current_teacher.id}", f"profile.{ext}")
    
    url = generate_presigned_put_url(key, content_type=content_type, expires_in=300)
    return ProfilePictureUrlResponse(presigned_url=url, key=key)


# ── School lookup ─────────────────────────────────────────────────────────────

@router.get(
    "/school-lookup",
    response_model=SchoolLookupResponse,
    summary="Look up a school by school code or DepEd School ID",
)
@limiter.limit("10/minute")
async def school_lookup(
    request: Request,
    school_code: str | None = Query(None, min_length=8, max_length=8),
    school_id:   str | None = Query(None, min_length=1, max_length=6),
    db: AsyncSession = Depends(get_db),
):
    if not school_code and not school_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide either school_code or school_id",
        )
    school = None
    if school_id:
        result = await db.execute(select(School).where(School.deped_school_id == school_id.strip()))
        school = result.scalar_one_or_none()
    if not school and school_code:
        result = await db.execute(select(School).where(School.school_code == school_code.upper()))
        school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")
    return school


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