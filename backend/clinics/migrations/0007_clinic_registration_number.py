from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("clinics", "0006_remove_clinic_ruthva_clinic_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="clinic",
            name="registration_number",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
    ]
