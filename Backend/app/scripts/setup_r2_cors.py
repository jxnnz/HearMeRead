"""
One-time script to configure CORS on the Cloudflare R2 bucket.
Run with: python -m app.scripts.setup_r2_cors
"""
import boto3
from botocore.config import Config
import os
import sys

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.core.config import settings


def setup_cors():
    client = boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )

    cors_config = {
        "CORSRules": [
            {
                "AllowedOrigins": [
                    "http://localhost:5173",
                    "http://localhost:3000",
                    "https://hearmeread.pages.dev",
                    "https://www.hearmeread.site",
                    "https://hearmeread.site",
                ],
                "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
                "AllowedHeaders": ["*"],
                "MaxAgeSeconds": 3600,
            }
        ]
    }

    client.put_bucket_cors(
        Bucket=settings.R2_BUCKET_NAME,
        CORSConfiguration=cors_config,
    )

    print(f"✅ CORS configured on bucket '{settings.R2_BUCKET_NAME}'")
    print("   Allowed origins:")
    for origin in cors_config["CORSRules"][0]["AllowedOrigins"]:
        print(f"     - {origin}")


if __name__ == "__main__":
    setup_cors()
