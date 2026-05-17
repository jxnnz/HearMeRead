import boto3
from botocore.config import Config
from app.core.config import settings
import uuid
from datetime import datetime

_s3_client = None


def _get_client():
    """Lazily create the S3 client so the module can be imported without R2 credentials."""
    global _s3_client
    if _s3_client is None:
        if not settings.R2_ACCOUNT_ID:
            raise RuntimeError(
                "Cloudflare R2 is not configured. "
                "Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, "
                "and R2_BUCKET_NAME in your .env file."
            )
        _s3_client = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
    return _s3_client


BUCKET = settings.R2_BUCKET_NAME


def _make_key(folder: str, filename: str) -> str:
    """Generate a structured object key."""
    date_prefix = datetime.utcnow().strftime("%Y/%m")
    unique = uuid.uuid4().hex[:8]
    return f"{folder}/{date_prefix}/{unique}_{filename}"


async def upload_audio(file_bytes: bytes, filename: str, session_id: str) -> str:
    """Upload assessment audio recording."""
    key = f"audio/sessions/{session_id}/{uuid.uuid4().hex[:8]}_{filename}"
    _get_client().put_object(
        Bucket=BUCKET,
        Key=key,
        Body=file_bytes,
        ContentType="audio/webm",  # adjust per format if needed
    )
    return key


async def upload_profile_image(file_bytes: bytes, filename: str, teacher_id: str) -> str:
    key = _make_key(f"profiles/{teacher_id}", filename)
    _get_client().put_object(
        Bucket=BUCKET,
        Key=key,
        Body=file_bytes,
        ContentType="image/jpeg",
    )
    return key


async def upload_export(file_bytes: bytes, filename: str, school_id: str) -> str:
    key = _make_key(f"exports/{school_id}", filename)
    _get_client().put_object(
        Bucket=BUCKET,
        Key=key,
        Body=file_bytes,
        ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    return key


async def upload_import(file_bytes: bytes, filename: str, teacher_id: str) -> str:
    key = _make_key(f"imports/{teacher_id}", filename)
    _get_client().put_object(
        Bucket=BUCKET,
        Key=key,
        Body=file_bytes,
    )
    return key


async def upload_archive(file_bytes: bytes, filename: str, school_id: str) -> str:
    key = _make_key(f"archives/{school_id}", filename)
    _get_client().put_object(
        Bucket=BUCKET,
        Key=key,
        Body=file_bytes,
        ContentType="application/zip",
    )
    return key


def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    """Generate a temporary signed URL for private file access."""
    if not key:
        return ""
    # If the bucket is public and settings.R2_PUBLIC_URL is provided, we could just return the public URL.
    # Otherwise we generate a presigned URL.
    if settings.R2_PUBLIC_URL:
        return f"{settings.R2_PUBLIC_URL.rstrip('/')}/{key}"
        
    return _get_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET, "Key": key},
        ExpiresIn=expires_in,
    )


def generate_presigned_put_url(key: str, content_type: str, expires_in: int = 3600) -> str:
    """Generate a temporary signed URL for the frontend to upload directly to R2."""
    return _get_client().generate_presigned_url(
        "put_object",
        Params={"Bucket": BUCKET, "Key": key, "ContentType": content_type},
        ExpiresIn=expires_in,
        HttpMethod="PUT"
    )


async def delete_file(key: str) -> bool:
    """Soft-delete equivalent: use archiving pattern instead where possible."""
    try:
        _get_client().delete_object(Bucket=BUCKET, Key=key)
        return True
    except Exception:
        return False
