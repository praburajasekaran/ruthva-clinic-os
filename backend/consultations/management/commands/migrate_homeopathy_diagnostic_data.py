"""
One-time migration: rename the legacy 'notes' key in diagnostic_data to the
structured 'homeopathy_case' key for all homeopathy clinic consultations.

Run once before deploying the DISCIPLINE_SCHEMA_KEYS change:

    python manage.py migrate_homeopathy_diagnostic_data [--dry-run]
"""

from django.core.management.base import BaseCommand

from consultations.models import Consultation


class Command(BaseCommand):
    help = "Migrate homeopathy diagnostic_data from {notes: ...} to {homeopathy_case: {notes: ...}}"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be migrated without writing to the database.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        qs = Consultation.objects.filter(
            clinic__discipline="homeopathy",
            diagnostic_data__has_key="notes",
        ).exclude(
            diagnostic_data__has_key="homeopathy_case",
        )

        count = qs.count()

        if count == 0:
            self.stdout.write("No consultations require migration.")
            return

        self.stdout.write(
            f"{'[DRY RUN] Would migrate' if dry_run else 'Migrating'} "
            f"{count} consultation(s)..."
        )

        if not dry_run:
            migrated = 0
            for consultation in qs.iterator(chunk_size=200):
                old_notes = consultation.diagnostic_data.pop("notes", "")
                consultation.diagnostic_data["homeopathy_case"] = {
                    "chief_complaints": [],
                    "mental_generals": {},
                    "physical_generals": {},
                    "miasmatic_classification": "",
                    "constitutional_notes": "",
                    "notes": old_notes,
                }
                consultation.save(update_fields=["diagnostic_data"])
                migrated += 1

            self.stdout.write(
                self.style.SUCCESS(f"Successfully migrated {migrated} consultation(s).")
            )
        else:
            for c in qs[:5]:
                self.stdout.write(
                    f"  Consultation #{c.id} — current notes: "
                    f"{str(c.diagnostic_data.get('notes', ''))[:60]!r}"
                )
            if count > 5:
                self.stdout.write(f"  ... and {count - 5} more.")
