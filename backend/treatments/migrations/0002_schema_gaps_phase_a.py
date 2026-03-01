from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("treatments", "0001_initial"),
    ]

    operations = [
        # 1. Add 'cancelled' status to TreatmentPlan
        migrations.AlterField(
            model_name="treatmentplan",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "Draft"),
                    ("active", "Active"),
                    ("completed", "Completed"),
                    ("cancelled", "Cancelled"),
                ],
                default="active",
                max_length=20,
            ),
        ),
        # 2. Change prescription FK from CASCADE to PROTECT
        migrations.AlterField(
            model_name="treatmentplan",
            name="prescription",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="treatment_plans",
                to="prescriptions.prescription",
            ),
        ),
        # 3. Add unique constraint for one active plan per prescription
        migrations.AddConstraint(
            model_name="treatmentplan",
            constraint=models.UniqueConstraint(
                condition=models.Q(("status", "active")),
                fields=("prescription",),
                name="uniq_active_plan_per_prescription",
            ),
        ),
        # 4. Add sequence_number to TreatmentSession
        migrations.AddField(
            model_name="treatmentsession",
            name="sequence_number",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        # 5. Remove old unique constraint (block, day_number)
        migrations.RemoveConstraint(
            model_name="treatmentsession",
            name="uniq_tsession_block_day",
        ),
        # 6. Add new unique constraint (block, day_number, sequence_number)
        migrations.AddConstraint(
            model_name="treatmentsession",
            constraint=models.UniqueConstraint(
                fields=("treatment_block", "day_number", "sequence_number"),
                name="uniq_tsession_block_day_seq",
            ),
        ),
        # 7. Update ordering on TreatmentSession
        migrations.AlterModelOptions(
            name="treatmentsession",
            options={"ordering": ["day_number", "sequence_number"]},
        ),
        # 8. Add 'plan_completed' type and 'notes' field to DoctorActionTask
        migrations.AlterField(
            model_name="doctoractiontask",
            name="task_type",
            field=models.CharField(
                choices=[
                    ("block_completed", "Block Completed"),
                    ("review_requested", "Review Requested"),
                    ("plan_completed", "Plan Completed"),
                ],
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="doctoractiontask",
            name="notes",
            field=models.TextField(blank=True, default=""),
        ),
    ]
