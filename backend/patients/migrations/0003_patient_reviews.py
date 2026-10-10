from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("patients", "0002_patient_is_active")]
    operations = [
        migrations.AddField(model_name="patient", name="allergies_review", field=models.CharField(max_length=20, default="unknown", choices=[("unknown", "Not confirmed"), ("recorded", "Recorded"), ("none", "None known")])),
        migrations.AddField(model_name="patient", name="medical_history_review", field=models.CharField(max_length=20, default="unknown", choices=[("unknown", "Not reviewed"), ("reviewed", "Reviewed"), ("none", "No known history")])),
        migrations.AddField(model_name="patient", name="current_medicines_status", field=models.CharField(max_length=20, default="unknown", choices=[("unknown", "Not confirmed"), ("taking", "Taking medicines"), ("none", "None")])),
        migrations.AddField(model_name="patient", name="current_medicines", field=models.TextField(blank=True, default="")),
    ]
