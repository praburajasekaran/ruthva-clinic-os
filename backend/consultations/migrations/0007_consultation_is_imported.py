from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("consultations", "0006_remove_envagai_columns"),
    ]

    operations = [
        migrations.AddField(
            model_name="consultation",
            name="is_imported",
            field=models.BooleanField(
                default=False,
                help_text="True if created via CSV import (baseline record)",
            ),
        ),
    ]
