from django.db import models


class SentReminder(models.Model):
    """Tracks sent email reminders to prevent duplicates."""

    REMINDER_TYPE_CHOICES = [
        ("prescription", "Prescription Follow-up"),
        ("procedure", "Procedure Follow-up"),
    ]

    reminder_type = models.CharField(max_length=20, choices=REMINDER_TYPE_CHOICES)
    object_id = models.PositiveIntegerField()
    follow_up_date = models.DateField()
    patient_email = models.EmailField()
    sent_at = models.DateTimeField(auto_now_add=True)
    resend_email_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["reminder_type", "object_id", "follow_up_date"],
                name="unique_reminder_per_followup",
            ),
        ]
        ordering = ["-sent_at"]

    def __str__(self):
        return (
            f"{self.get_reminder_type_display()} -> "
            f"{self.patient_email} on {self.follow_up_date}"
        )
