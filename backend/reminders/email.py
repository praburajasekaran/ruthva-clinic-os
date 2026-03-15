import logging

from utils.ses import send_email

logger = logging.getLogger(__name__)




def send_prescription_followup_email(
    *,
    patient_name: str,
    patient_email: str,
    follow_up_date,
    diagnosis: str,
    follow_up_notes: str,
    consultation_date,
) -> str | None:
    """Send a prescription follow-up reminder. Returns SES message ID or None."""

    formatted_date = follow_up_date.strftime("%d %B %Y")
    subject = f"Follow-up Reminder - {formatted_date} | {settings.CLINIC_NAME}"

    notes_html = ""
    if follow_up_notes:
        notes_html = (
            '<p style="margin: 0; font-size: 15px; color: #1f2937;">'
            f"<strong>Notes:</strong> {follow_up_notes}</p>"
        )

    html = f"""\
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #065f46; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 22px;">{settings.CLINIC_NAME}</h1>
    <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">Follow-up Reminder</p>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; color: #1f2937;">Dear <strong>{patient_name}</strong>,</p>
    <p style="font-size: 15px; color: #374151; line-height: 1.6;">
      This is a reminder that you have a follow-up consultation scheduled for
      <strong style="color: #065f46;">{formatted_date}</strong>.
    </p>
    <div style="background-color: #f0fdf4; border-left: 4px solid #065f46; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">Consultation Details</p>
      <p style="margin: 0 0 4px; font-size: 15px; color: #1f2937;">
        <strong>Diagnosis:</strong> {diagnosis or "General follow-up"}
      </p>
      <p style="margin: 0 0 4px; font-size: 15px; color: #1f2937;">
        <strong>Last Visit:</strong> {consultation_date.strftime("%d %B %Y")}
      </p>
      {notes_html}
    </div>
    <p style="font-size: 15px; color: #374151;">
      Please visit the clinic at your scheduled time. If you need to reschedule,
      kindly contact us in advance.
    </p>
    <p style="font-size: 15px; color: #374151; margin-top: 24px;">
      Warm regards,<br>
      <strong>{settings.CLINIC_DOCTOR_NAME}</strong><br>
      {settings.CLINIC_NAME}
    </p>
  </div>
  <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 16px;">
    This is an automated reminder from {settings.CLINIC_NAME}.
  </p>
</div>"""

    return send_email(to=patient_email, subject=subject, html=html)


def send_procedure_followup_email(
    *,
    patient_name: str,
    patient_email: str,
    follow_up_date,
    procedure_name: str,
    consultation_date,
) -> str | None:
    """Send a procedure follow-up reminder. Returns SES message ID or None."""

    formatted_date = follow_up_date.strftime("%d %B %Y")
    subject = f"Procedure Follow-up Reminder - {formatted_date} | {settings.CLINIC_NAME}"

    html = f"""\
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #065f46; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 22px;">{settings.CLINIC_NAME}</h1>
    <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">Procedure Follow-up Reminder</p>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; color: #1f2937;">Dear <strong>{patient_name}</strong>,</p>
    <p style="font-size: 15px; color: #374151; line-height: 1.6;">
      This is a reminder that you have a follow-up for your procedure scheduled for
      <strong style="color: #065f46;">{formatted_date}</strong>.
    </p>
    <div style="background-color: #f0fdf4; border-left: 4px solid #065f46; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">Procedure Details</p>
      <p style="margin: 0 0 4px; font-size: 15px; color: #1f2937;">
        <strong>Procedure:</strong> {procedure_name}
      </p>
      <p style="margin: 0; font-size: 15px; color: #1f2937;">
        <strong>Last Visit:</strong> {consultation_date.strftime("%d %B %Y")}
      </p>
    </div>
    <p style="font-size: 15px; color: #374151;">
      Please visit the clinic at your scheduled time. If you need to reschedule,
      kindly contact us in advance.
    </p>
    <p style="font-size: 15px; color: #374151; margin-top: 24px;">
      Warm regards,<br>
      <strong>{settings.CLINIC_DOCTOR_NAME}</strong><br>
      {settings.CLINIC_NAME}
    </p>
  </div>
  <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 16px;">
    This is an automated reminder from {settings.CLINIC_NAME}.
  </p>
</div>"""

    return send_email(to=patient_email, subject=subject, html=html)
