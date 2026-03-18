from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("clinics", "0008_add_plan_to_clinic"),
    ]

    operations = [
        migrations.AddField(
            model_name="clinic",
            name="letterhead_mode",
            field=models.CharField(
                choices=[
                    ("digital", "Digital Letterhead"),
                    ("preprinted", "Pre-printed Letterhead"),
                ],
                default="digital",
                max_length=10,
            ),
        ),
        # Existing clinics keep pre-printed behavior (no surprise change)
        migrations.RunSQL(
            sql="UPDATE clinics_clinic SET letterhead_mode = 'preprinted';",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
