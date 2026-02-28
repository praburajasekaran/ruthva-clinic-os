import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("clinics", "0002_add_clinic_invitation"),
    ]

    operations = [
        migrations.AlterField(
            model_name="clinicinvitation",
            name="token",
            field=models.UUIDField(
                db_index=True,
                default=uuid.uuid4,
                editable=False,
                unique=True,
            ),
        ),
        migrations.AddIndex(
            model_name="clinicinvitation",
            index=models.Index(
                fields=["clinic", "accepted_at"],
                name="clinic_invitation_list_idx",
            ),
        ),
    ]
