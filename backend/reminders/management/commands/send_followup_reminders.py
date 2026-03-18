from datetime import datetime

from django.core.management.base import BaseCommand
from django.db import IntegrityError
from django.utils import timezone

from prescriptions.models import Prescription, ProcedureEntry
from reminders.email import (
    send_prescription_followup_email,
    send_procedure_followup_email,
)
from reminders.models import SentReminder


class Command(BaseCommand):
    help = "Send follow-up reminder emails for today's scheduled follow-ups"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be sent without actually sending emails",
        )
        parser.add_argument(
            "--date",
            type=str,
            default=None,
            help="Override today's date (YYYY-MM-DD format)",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        if options["date"]:
            target_date = datetime.strptime(options["date"], "%Y-%m-%d").date()
        else:
            target_date = timezone.now().date()

        self.stdout.write(f"Processing follow-up reminders for {target_date}")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - no emails will be sent"))

        sent = 0
        skipped = 0
        errors = 0

        # Prescription follow-ups
        rx_qs = (
            Prescription.objects.filter(
                follow_up_date=target_date,
                consultation__patient__email__gt="",
            )
            .select_related("consultation", "consultation__patient", "consultation__clinic")
        )

        for rx in rx_qs:
            patient = rx.consultation.patient

            if SentReminder.objects.filter(
                reminder_type="prescription",
                object_id=rx.pk,
                follow_up_date=target_date,
            ).exists():
                self.stdout.write(f"  SKIP (already sent): Prescription #{rx.pk} -> {patient.email}")
                skipped += 1
                continue

            if dry_run:
                self.stdout.write(
                    f"  WOULD SEND: Prescription follow-up to {patient.name} "
                    f"<{patient.email}> (diagnosis: {rx.consultation.diagnosis or 'N/A'})"
                )
                sent += 1
                continue

            resend_id = send_prescription_followup_email(
                patient_name=patient.name,
                patient_email=patient.email,
                follow_up_date=rx.follow_up_date,
                diagnosis=rx.consultation.diagnosis,
                follow_up_notes=rx.follow_up_notes,
                consultation_date=rx.consultation.consultation_date,
                logo_url=rx.consultation.clinic.logo_url,
            )

            if resend_id is not None:
                try:
                    SentReminder.objects.create(
                        reminder_type="prescription",
                        object_id=rx.pk,
                        follow_up_date=target_date,
                        patient_email=patient.email,
                        resend_email_id=resend_id,
                    )
                    self.stdout.write(self.style.SUCCESS(
                        f"  SENT: Prescription #{rx.pk} -> {patient.email} (resend_id={resend_id})"
                    ))
                    sent += 1
                except IntegrityError:
                    self.stdout.write(f"  SKIP (race condition): Prescription #{rx.pk}")
                    skipped += 1
            else:
                self.stdout.write(self.style.ERROR(
                    f"  FAILED: Prescription #{rx.pk} -> {patient.email}"
                ))
                errors += 1

        # Procedure follow-ups
        proc_qs = (
            ProcedureEntry.objects.filter(
                follow_up_date=target_date,
                prescription__consultation__patient__email__gt="",
            )
            .select_related(
                "prescription__consultation",
                "prescription__consultation__patient",
                "prescription__consultation__clinic",
            )
        )

        for proc in proc_qs:
            patient = proc.prescription.consultation.patient

            if SentReminder.objects.filter(
                reminder_type="procedure",
                object_id=proc.pk,
                follow_up_date=target_date,
            ).exists():
                self.stdout.write(f"  SKIP (already sent): Procedure #{proc.pk} -> {patient.email}")
                skipped += 1
                continue

            if dry_run:
                self.stdout.write(
                    f"  WOULD SEND: Procedure follow-up to {patient.name} "
                    f"<{patient.email}> (procedure: {proc.name})"
                )
                sent += 1
                continue

            resend_id = send_procedure_followup_email(
                patient_name=patient.name,
                patient_email=patient.email,
                follow_up_date=proc.follow_up_date,
                procedure_name=proc.name,
                consultation_date=proc.prescription.consultation.consultation_date,
                logo_url=proc.prescription.consultation.clinic.logo_url,
            )

            if resend_id is not None:
                try:
                    SentReminder.objects.create(
                        reminder_type="procedure",
                        object_id=proc.pk,
                        follow_up_date=target_date,
                        patient_email=patient.email,
                        resend_email_id=resend_id,
                    )
                    self.stdout.write(self.style.SUCCESS(
                        f"  SENT: Procedure #{proc.pk} ({proc.name}) -> {patient.email} "
                        f"(resend_id={resend_id})"
                    ))
                    sent += 1
                except IntegrityError:
                    self.stdout.write(f"  SKIP (race condition): Procedure #{proc.pk}")
                    skipped += 1
            else:
                self.stdout.write(self.style.ERROR(
                    f"  FAILED: Procedure #{proc.pk} -> {patient.email}"
                ))
                errors += 1

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(f"Done. Sent: {sent}, Skipped: {skipped}, Errors: {errors}")
        )
