from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("patients", "0003_patient_reviews")]
    operations = [
        migrations.AddField(
            model_name="patient",
            name="general_notes",
            field=models.TextField(blank=True, default=""),
        ),
    ]
