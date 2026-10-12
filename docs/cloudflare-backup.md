# Back up and recover the Cloudflare database

The private bucket `ruthva-clinic-backups` stores separate SQL exports and their referenced images. It has no public development URL or custom domain. The application has no binding to this bucket.

## Take a backup

Run from the repository root with Node.js 22, Python 3, installed Worker packages, and authenticated Wrangler access.

```sh
rtk npm run backup:cloudflare
```

The command exports the configured remote D1 database. D1 export can briefly interrupt queries. Run it outside patient consultations.

The command creates a unique `snapshots/<UTC timestamp>/` prefix. It uploads the SQL, downloads it again, compares SHA-256, and restores it into a private local SQLite file. It checks integrity, foreign keys, and every table's contents through a restore round trip. It also prepares and backs up `d1-import.sql`. That file creates all tables first, inserts parent records before child records, and restores ID sequence counters after ordinary data.

It then copies all database-referenced clinic logos and feedback images from `ruthva-clinic-uploads`. Each copy is downloaded and compared byte for byte. It uploads a manifest with hashes, sizes, table counts, and the latest D1 Time Travel bookmark. That bookmark is read after the export and is not an exact bookmark for the export.

Local files are saved under the ignored `.audit/backups/<timestamp>/` directory with private permissions. Unreferenced R2 objects are excluded. A partial run reports failure and retains its local files. Rerunning creates a new snapshot.

Take a backup before schema or data changes and after the first doctor completes onboarding. R2 snapshots are currently manual. D1 Time Travel provides continuous database history within Cloudflare's retention window. Both cloud copies share the same Cloudflare account.

## Retrieve a snapshot

Choose the exact prefix from its local manifest or the Cloudflare R2 dashboard. Use a new private directory. Replace the example prefix below with that snapshot's prefix.

```sh
rtk proxy sh -c 'umask 077; mkdir -p .audit/recovery'
rtk npm --prefix worker exec -- wrangler r2 object get ruthva-clinic-backups/snapshots/REPLACE_TIMESTAMP/manifest.json --remote --file .audit/recovery/manifest.json --config worker/wrangler.jsonc
rtk npm --prefix worker exec -- wrangler r2 object get ruthva-clinic-backups/snapshots/REPLACE_TIMESTAMP/d1.sql --remote --file .audit/recovery/d1.sql --config worker/wrangler.jsonc
rtk npm --prefix worker exec -- wrangler r2 object get ruthva-clinic-backups/snapshots/REPLACE_TIMESTAMP/d1-import.sql --remote --file .audit/recovery/d1-import.sql --config worker/wrangler.jsonc
```

Compare the downloaded SQL hash with `database.sha256` in the manifest. Restore into a fresh file with the verifier.

```sh
rtk proxy python3 scripts/verify-d1-backup.py .audit/recovery/d1.sql .audit/recovery/d1.sql .audit/recovery/restored.sqlite3
```

Using the same input twice checks restoration, not independent readback. The download hash must first match the stored manifest.

## Recover into D1

Freeze clinical writes before recovery. Preserve the current database and uploads with a new backup if they remain accessible. Choose a recovery point before the unwanted change.

Create a new recovery D1 database. Put its ID in a separate Wrangler configuration under `.audit/recovery/`. Do not point the production application at it yet.

Compare `d1-import.sql` with the manifest's `d1Import.sha256`. Import that prepared file into the empty recovery database using its separate configuration. Raw D1 exports can insert child rows before their parent tables exist, which fails under D1's enforced foreign keys.

```sh
rtk npm --prefix worker exec -- wrangler d1 execute DB --remote --config .audit/recovery/wrangler.jsonc --file .audit/recovery/d1-import.sql
```

Export the recovery database again. Run the verifier on that export into a fresh local file. Compare its `tables` counts and content hashes with `verification.tables` in the snapshot manifest, including `sqlite_sequence`. D1's internal `_cf_` tables can differ. Confirm zero foreign-key violations.

Restore each manifest image to its `originalKey` in a recovery uploads bucket. Download each restored image and compare its SHA-256. Keep existing objects until the recovery is accepted.

After the recovery checks pass, update the application bindings to the recovery database and uploads bucket. Deploy only with the operator's approval. Verify login, patient counts, prescriptions, dispensing, and printing before reopening clinical writes.

Application rollback uses previous Worker versions. Database recovery uses the chosen SQL snapshot or D1 Time Travel. Rolling back code does not undo later patient writes.
