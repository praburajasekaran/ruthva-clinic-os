import logging

import boto3
from botocore.exceptions import ClientError
from django.conf import settings

logger = logging.getLogger(__name__)


def send_email(*, to: str | list[str], subject: str, html: str) -> str | None:
    """Send an email via Amazon SES. Returns message ID or None on failure."""
    client = boto3.client(
        "ses",
        region_name=settings.AWS_SES_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )

    recipients = [to] if isinstance(to, str) else to

    try:
        resp = client.send_email(
            Source=settings.DEFAULT_FROM_EMAIL,
            Destination={"ToAddresses": recipients},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {"Html": {"Data": html, "Charset": "UTF-8"}},
            },
        )
        return resp["MessageId"]
    except ClientError:
        logger.exception("SES failed to send email to %s", recipients)
        return None
