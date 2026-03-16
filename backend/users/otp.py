import hashlib
import hmac
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


def send_otp_email(email: str, code: str):
    """Send OTP via Amazon SES."""
    content = (
        email_header("Login Code")
        + email_heading("Your verification code")
        + email_code(code)
        + email_text("This code expires in <strong>10 minutes</strong>.")
        + email_muted_text(
            "If you didn't request this code, you can safely ignore this email."
        )
        + email_footer()
    )
    send_email(
        to=email,
        subject=f"Your login code is {code}",
        html=email_wrapper(content, preview_text=f"Your login code is {code}"),
    )
