#!/bin/bash
# Dump local PostgreSQL database for Railway migration.
# This preserves all data including the ayurveda doctor credentials and patients.
#
# Usage:
#   ./scripts/db-dump-local.sh
#
# Then restore on Railway:
#   pg_restore --no-owner --no-acl -d "$DATABASE_URL" ruthva_clinic_os.dump

set -euo pipefail

DB_NAME="ruthva_clinic_os"
DUMP_FILE="ruthva_clinic_os.dump"

echo "Dumping local database: $DB_NAME"
pg_dump -Fc --no-owner --no-acl "$DB_NAME" > "$DUMP_FILE"

echo "Done! Created: $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"
echo ""
echo "To restore on Railway Postgres:"
echo "  1. Get the DATABASE_URL from Railway dashboard"
echo "  2. Run: pg_restore --no-owner --no-acl -d \"\$DATABASE_URL\" $DUMP_FILE"
