import logging

import resend
from django.conf import settings

logger = logging.getLogger(__name__)

FRONTEND_URL = settings.FRONTEND_URL if hasattr(settings, "FRONTEND_URL") else "http://localhost:3000"


def send_invite_email(*, invitation) -> str | None:
    """Send a clinic invitation email. Returns Resend email ID or None."""
    resend.api_key = settings.RESEND_API_KEY

    accept_url = f"{FRONTEND_URL}/invite/accept?token={invitation.token}"
    clinic_name = invitation.clinic.name
    inviter_name = invitation.invited_by.get_full_name() or invitation.invited_by.username
    role_display = invitation.get_role_display()

    subject = f"You're invited to join {clinic_name}"

    html = f"""\
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #065f46; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 22px;">{clinic_name}</h1>
    <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">Team Invitation</p>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; color: #1f2937;">
      Hello <strong>{invitation.first_name}</strong>,
    </p>
    <p style="font-size: 15px; color: #374151; line-height: 1.6;">
      <strong>{inviter_name}</strong> has invited you to join
      <strong>{clinic_name}</strong> as a <strong>{role_display}</strong>.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="{accept_url}"
         style="background-color: #065f46; color: white; padding: 12px 32px;
                border-radius: 6px; text-decoration: none; font-size: 16px;
                font-weight: 600; display: inline-block;">
        Accept Invitation
      </a>
    </div>
    <p style="font-size: 14px; color: #6b7280; text-align: center;">
      This invitation expires in 7 days.
    </p>
    <p style="font-size: 13px; color: #9ca3af; text-align: center; margin-top: 16px;">
      If you can't click the button, copy this link:<br>
      <a href="{accept_url}" style="color: #065f46; word-break: break-all;">{accept_url}</a>
    </p>
  </div>
</div>"""

    try:
        resp = resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": [invitation.email],
            "subject": subject,
            "html": html,
        })
        return resp.get("id", "")
    except Exception:
        logger.exception("Failed to send invite email to %s", invitation.email)
        return None
