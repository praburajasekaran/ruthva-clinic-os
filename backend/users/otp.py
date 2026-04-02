import hashlib
import hmac
import logging
import secrets
import string

from django.conf import settings

from utils.email_templates import (
    email_code,
    email_footer,
    email_header,
    email_heading,
    email_muted_text,
    email_text,
    email_wrapper,
)
from utils.ses import send_email

logger = logging.getLogger(__name__)


def generate_otp(length=6):
    """Generate a cryptographically secure numeric OTP."""
    return "".join(secrets.choice(string.digits) for _ in range(length))


def hash_otp(code: str) -> str:
    """Hash OTP with HMAC-SHA256 using Django SECRET_KEY."""
    return hmac.new(
        settings.SECRET_KEY.encode(),
        code.encode(),
        hashlib.sha256,
    ).hexdigest()


def verify_otp_hash(code: str, hashed: str) -> bool:
    """Constant-time comparison of OTP against stored hash."""
    return hmac.compare_digest(hash_otp(code), hashed)


def send_otp_email(email: str, code: str, purpose: str = "login"):
    """Send OTP via Amazon SES.

    Args:
        purpose: "login" or "signup" — changes the email subject line.
    """
    if purpose == "signup":
        subject = f"Your verification code is {code}"
        header_title = "Verification Code"
    else:
        subject = f"Your login code is {code}"
        header_title = "Login Code"

    if settings.DEBUG:
        logger.info("[DEV] OTP for %s: %s", email, code)
        print(f"\n{'='*50}")
        print(f"  OTP for {email}: {code}")
        print(f"{'='*50}\n")
        return

    content = (
        email_header(header_title)
        + email_heading("Your verification code")
        + email_code(code)
        + email_text("This code expires in <strong>10 minutes</strong>.")
        + email_muted_text(
            "If you didn't request this code, you can safely ignore this email."
        )
        + email_footer()
    )
    result = send_email(
        to=email,
        subject=subject,
        html=email_wrapper(content, preview_text=subject),
    )
    if result is None:
        raise RuntimeError("Failed to send OTP email via SES")
