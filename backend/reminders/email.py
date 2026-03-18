import logging

from django.conf import settings

from utils.email_templates import (
    email_data_card,
    email_footer,
    email_header,
    email_heading,
    email_text,
    email_wrapper,
)
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
    logo_url: str = "",
) -> str | None:
    """Send a prescription follow-up reminder. Returns SES message ID or None."""
    formatted_date = follow_up_date.strftime("%d %B %Y")

    rows = [
        ("Diagnosis", diagnosis or "General follow-up"),
        ("Last Visit", consultation_date.strftime("%d %B %Y")),
        ("Follow-up", formatted_date),
    ]
    if follow_up_notes:
        rows.append(("Notes", follow_up_notes))

    content = (
        email_header("Follow-up Reminder", logo_url=logo_url)
        + email_heading(f"Hello {patient_name}")
        + email_text(
            f"This is a reminder that you have a follow-up consultation "
            f"scheduled for <strong>{formatted_date}</strong>."
        )
        + email_data_card(rows, title="Consultation Details")
        + email_text(
            "Please visit the clinic at your scheduled time. "
            "If you need to reschedule, kindly contact us in advance."
        )
        + email_footer(
            clinic_name=settings.CLINIC_NAME,
            doctor_name=settings.CLINIC_DOCTOR_NAME,
        )
    )

    subject = f"Follow-up Reminder - {formatted_date} | {settings.CLINIC_NAME}"

    return send_email(
        to=patient_email,
        subject=subject,
        html=email_wrapper(
            content,
            preview_text=f"Your follow-up is scheduled for {formatted_date}",
        ),
    )


def send_procedure_followup_email(
    *,
    patient_name: str,
    patient_email: str,
    follow_up_date,
    procedure_name: str,
    consultation_date,
    logo_url: str = "",
) -> str | None:
    """Send a procedure follow-up reminder. Returns SES message ID or None."""
    formatted_date = follow_up_date.strftime("%d %B %Y")

    rows = [
        ("Procedure", procedure_name),
        ("Last Visit", consultation_date.strftime("%d %B %Y")),
        ("Follow-up", formatted_date),
    ]

    content = (
        email_header("Procedure Follow-up", logo_url=logo_url)
        + email_heading(f"Hello {patient_name}")
        + email_text(
            f"This is a reminder that you have a follow-up for your procedure "
            f"scheduled for <strong>{formatted_date}</strong>."
        )
        + email_data_card(rows, title="Procedure Details")
        + email_text(
            "Please visit the clinic at your scheduled time. "
            "If you need to reschedule, kindly contact us in advance."
        )
        + email_footer(
            clinic_name=settings.CLINIC_NAME,
            doctor_name=settings.CLINIC_DOCTOR_NAME,
        )
    )

    subject = (
        f"Procedure Follow-up Reminder - {formatted_date} | {settings.CLINIC_NAME}"
    )

    return send_email(
        to=patient_email,
        subject=subject,
        html=email_wrapper(
            content,
            preview_text=f"Your procedure follow-up is scheduled for {formatted_date}",
        ),
    )
