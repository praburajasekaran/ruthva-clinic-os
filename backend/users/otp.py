import hashlib
import hmac
import secrets
import string

from django.conf import settings

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
    send_email(
        to=email,
        subject=f"Your login code is {code}",
        html=(
            f"<p>Your verification code is:</p>"
            f"<h1 style='font-size:36px;letter-spacing:8px;font-family:monospace'>{code}</h1>"
            f"<p>This code expires in 10 minutes.</p>"
            f"<p>If you didn't request this, you can safely ignore this email.</p>"
        ),
    )
