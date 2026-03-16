import html as html_mod
import logging

from django.conf import settings

from utils.email_templates import (
    email_button,
    email_fallback_link,
    email_footer,
    email_header,
    email_heading,
    email_muted_text,
    email_text,
    email_wrapper,
)
from utils.ses import send_email

logger = logging.getLogger(__name__)

_frontend_url = getattr(settings, "FRONTEND_URL", None)
if not _frontend_url:
    _frontend_url = "http://localhost:3000"
    logger.warning("FRONTEND_URL not configured, using localhost fallback")
FRONTEND_URL = _frontend_url


def send_invite_email(*, invitation) -> str | None:
    """Send a clinic invitation email. Returns SES message ID or None."""
    accept_url = f"{FRONTEND_URL}/invite/accept?token={invitation.token}"
    clinic_name = html_mod.escape(invitation.clinic.name)
    inviter_name = html_mod.escape(
        invitation.invited_by.get_full_name() or invitation.invited_by.username
    )
    role_display = html_mod.escape(invitation.get_role_display())
    first_name = html_mod.escape(invitation.first_name)
    safe_accept_url = html_mod.escape(accept_url)

    subject = f"You're invited to join {clinic_name}"

    content = (
        email_header("Team Invitation")
        + email_heading(f"Hello {first_name}")
        + email_text(
            f"<strong>{inviter_name}</strong> has invited you to join "
            f"<strong>{clinic_name}</strong> as a <strong>{role_display}</strong>."
        )
        + email_button("Accept Invitation", safe_accept_url)
        + email_muted_text("This invitation expires in 7 days.")
        + email_fallback_link(safe_accept_url)
        + email_footer()
    )

    return send_email(
        to=invitation.email,
        subject=subject,
        html=email_wrapper(
            content,
            preview_text=f"{inviter_name} invited you to join {clinic_name}",
        ),
    )
