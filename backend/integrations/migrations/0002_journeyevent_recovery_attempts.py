"""Add JourneyEvent model and recovery_attempts field to RuthvaJourneyRef."""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("integrations", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="ruthvajourneyref",
            name="recovery_attempts",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.CreateModel(
            name="JourneyEvent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "event_type",
                    models.CharField(
                        choices=[
                            ("journey_started", "Journey Started"),
                            ("visit_expected", "Visit Expected"),
                            ("reminder_sent", "Reminder Sent"),
                            ("visit_confirmed", "Visit Confirmed"),
                            ("visit_missed", "Visit Missed"),
                            ("recovery_message_sent", "Recovery Message Sent"),
                            ("adherence_check_sent", "Adherence Check Sent"),
                            ("adherence_response", "Adherence Response"),
                            ("patient_returned", "Patient Returned"),
                        ],
                        max_length=30,
                    ),
                ),
                ("event_date", models.DateField()),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "journey",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="events",
                        to="integrations.ruthvajourneyref",
                    ),
                ),
            ],
            options={
                "ordering": ["event_date", "created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="journeyevent",
            constraint=models.UniqueConstraint(
                fields=("journey", "event_type", "event_date"),
                name="unique_journey_event_type_date",
            ),
        ),
    ]
