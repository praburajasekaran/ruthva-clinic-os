"""
Data migration: Copy 8 Envagai Thervu columns into diagnostic_data JSONField.

This is Step 2 of the 3-step migration strategy (Phase 5):
  0004 — Add diagnostic_data field
  0005 — Copy Envagai data into diagnostic_data (this file)
  0006 — Remove legacy Envagai columns

The migration preserves raw string values (including pipe-separated format)
verbatim. No parsing or restructuring of existing data.
"""

from django.db import migrations


ENVAGAI_FIELDS = ["naa", "niram", "mozhi", "vizhi", "nadi", "mei", "muthiram", "varmam"]


def migrate_envagai_to_json(apps, schema_editor):
    """Copy Envagai Thervu column values into diagnostic_data.envagai_thervu."""
    Consultation = apps.get_model("consultations", "Consultation")
    db_alias = schema_editor.connection.alias

    # Use raw SQL for maximum performance and atomicity
    schema_editor.execute(
        """
        UPDATE consultations_consultation
        SET diagnostic_data = jsonb_build_object(
            'envagai_thervu', jsonb_strip_nulls(jsonb_build_object(
                'naa', NULLIF(naa, ''),
                'niram', NULLIF(niram, ''),
                'mozhi', NULLIF(mozhi, ''),
                'vizhi', NULLIF(vizhi, ''),
                'nadi', NULLIF(nadi, ''),
                'mei', NULLIF(mei, ''),
                'muthiram', NULLIF(muthiram, ''),
                'varmam', NULLIF(varmam, '')
            ))
        )
        WHERE naa != '' OR niram != '' OR mozhi != '' OR vizhi != ''
           OR nadi != '' OR mei != '' OR muthiram != '' OR varmam != '';
        """
    )

    # Integrity assertion: count records with Envagai data vs migrated records
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*) FROM consultations_consultation
            WHERE naa != '' OR niram != '' OR mozhi != '' OR vizhi != ''
               OR nadi != '' OR mei != '' OR muthiram != '' OR varmam != '';
            """
        )
        original_count = cursor.fetchone()[0]

        cursor.execute(
            """
            SELECT COUNT(*) FROM consultations_consultation
            WHERE diagnostic_data != '{}';
            """
        )
        migrated_count = cursor.fetchone()[0]

    assert original_count == migrated_count, (
        f"Migration integrity check failed: {original_count} had Envagai data, "
        f"but {migrated_count} have diagnostic_data"
    )


def reverse_migration(apps, schema_editor):
    """Copy diagnostic_data.envagai_thervu back into individual columns."""
    Consultation = apps.get_model("consultations", "Consultation")
    db_alias = schema_editor.connection.alias

    schema_editor.execute(
        """
        UPDATE consultations_consultation
        SET
            naa = COALESCE(diagnostic_data->'envagai_thervu'->>'naa', ''),
            niram = COALESCE(diagnostic_data->'envagai_thervu'->>'niram', ''),
            mozhi = COALESCE(diagnostic_data->'envagai_thervu'->>'mozhi', ''),
            vizhi = COALESCE(diagnostic_data->'envagai_thervu'->>'vizhi', ''),
            nadi = COALESCE(diagnostic_data->'envagai_thervu'->>'nadi', ''),
            mei = COALESCE(diagnostic_data->'envagai_thervu'->>'mei', ''),
            muthiram = COALESCE(diagnostic_data->'envagai_thervu'->>'muthiram', ''),
            varmam = COALESCE(diagnostic_data->'envagai_thervu'->>'varmam', '')
        WHERE diagnostic_data != '{}';
        """
    )

    # Reset diagnostic_data to empty after reverse
    schema_editor.execute(
        """
        UPDATE consultations_consultation
        SET diagnostic_data = '{}';
        """
    )


class Migration(migrations.Migration):

    dependencies = [
        ("consultations", "0004_add_diagnostic_data"),
    ]

    operations = [
        migrations.RunPython(migrate_envagai_to_json, reverse_migration),
    ]
