"""Initial migration for integrations app — RuthvaJourneyRef model."""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("clinics", "0001_initial"),
        ("patients", "0001_initial"),
        ("consultations", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="RuthvaJourneyRef",
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
                    "ruthva_journey_id",
                    models.CharField(
                        db_index=True,
                        help_text="Journey ID returned by Ruthva API",
                        max_length=100,
                        unique=True,
                    ),
                ),
                (
                    "ruthva_patient_id",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text="Patient ID in Ruthva",
                        max_length=100,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("active", "Active"),
                            ("completed", "Completed"),
                            ("dropped", "Dropped"),
                        ],
                        default="active",
                        max_length=20,
                    ),
                ),
                (
                    "risk_level",
                    models.CharField(blank=True, default="stable", max_length=20),
                ),
                (
                    "risk_reason",
                    models.CharField(blank=True, default="", max_length=255),
                ),
                ("start_date", models.DateField(blank=True, null=True)),
                ("next_visit_date", models.DateField(blank=True, null=True)),
                ("last_visit_date", models.DateField(blank=True, null=True)),
                ("missed_visits", models.PositiveSmallIntegerField(default=0)),
                ("duration_days", models.PositiveSmallIntegerField(default=0)),
                ("followup_interval_days", models.PositiveSmallIntegerField(default=0)),
                (
                    "consent_given_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="When patient consent was captured",
                        null=True,
                    ),
                ),
                (
                    "last_synced_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="Last successful webhook or poll update from Ruthva",
                        null=True,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "clinic",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ruthva_journeys",
                        to="clinics.clinic",
                    ),
                ),
                (
                    "patient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ruthva_journeys",
                        to="patients.patient",
                    ),
                ),
                (
                    "consultation",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="ruthva_journeys",
                        to="consultations.consultation",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="ruthvajourneyref",
            index=models.Index(
                fields=["clinic", "patient", "status"],
                name="ruthva_ref_clinic_pat_status",
            ),
        ),
        migrations.AddIndex(
            model_name="ruthvajourneyref",
            index=models.Index(
                fields=["clinic", "status", "-created_at"],
                name="ruthva_ref_clinic_status_date",
            ),
        ),
        migrations.AddConstraint(
            model_name="ruthvajourneyref",
            constraint=models.UniqueConstraint(
                condition=models.Q(("status", "active")),
                fields=("clinic", "patient"),
                name="unique_active_journey_per_patient",
            ),
        ),
    ]
