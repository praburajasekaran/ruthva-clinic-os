#!/bin/bash
set -euo pipefail
umask 077

dump_file="${1:-.cloudflare-migration/legacy.dump}"
if [ -e "$dump_file" ]; then
  echo "Use a new backup path. The existing file was preserved." >&2
  exit 1
fi
rtk proxy mkdir -p "$(rtk proxy dirname "$dump_file")"
rtk proxy pg_dump --format=custom --no-owner --no-acl "${DATABASE_URL:-ruthva_clinic_os}" --file "$dump_file"
echo "Saved PostgreSQL backup to $dump_file. Use CLOUDFLARE-DEPLOY.md for D1 conversion."
