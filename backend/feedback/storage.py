import logging
import uuid

import boto3
from django.conf import settings

logger = logging.getLogger(__name__)

CONTENT_TYPE_TO_EXT = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
}


def upload_screenshot(file_obj, content_type: str) -> str | None:
    """Upload screenshot to S3. Returns the public URL or None on failure."""
    bucket = getattr(settings, "AWS_S3_BUCKET_NAME", "")
    region = getattr(settings, "AWS_S3_REGION", "ap-south-1")

    if not bucket:
        logger.warning("AWS_S3_BUCKET_NAME not configured — skipping screenshot upload")
        return None

    try:
        s3 = boto3.client(
            "s3",
            region_name=region,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        ext = CONTENT_TYPE_TO_EXT.get(content_type, "png")
        key = f"feedback-screenshots/{uuid.uuid4()}.{ext}"

        s3.upload_fileobj(
            file_obj,
            bucket,
            key,
            ExtraArgs={"ContentType": content_type},
        )
        return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
    except Exception:
        logger.exception("Failed to upload screenshot to S3")
        return None
