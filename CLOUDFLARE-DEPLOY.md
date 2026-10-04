# Deploy Ruthva on Cloudflare

The initial staging deployment is live at [ruthva-clinic.prabu-b92.workers.dev](https://ruthva-clinic.prabu-b92.workers.dev). Its resources and results are recorded in [Cloudflare migration verification](docs/cloudflare-verification.md).

Run these steps from the repository root for later deployments and the live data cutover. Reuse the existing staging resources and secrets. Staging contains synthetic records. Move live records only after staging checks pass.

Existing production accounts have not been imported into staging. To test email delivery, register a staging account at [Register your clinic](https://ruthva-clinic.prabu-b92.workers.dev/signup) first. Login sends a code only for an active registered account.

## Use Ruthva admin controls

Register `ekalaivan@gmail.com` on staging and verify the emailed code. That verified account opens [Clinic accounts](https://ruthva-clinic.prabu-b92.workers.dev/admin/clinics). Admin access does not require clinic onboarding.

Search for the clinic and select **Deactivate** or **Activate**. Confirm the change in the dialog. Deactivation blocks the owner and all staff, revokes their sessions, and retains clinic records. Reactivation requires a verified active owner and a new staff login. The admin can restore their own clinic while it is inactive.

The private API Worker secret `RUTHVA_ADMIN_EMAIL` selects the admin identity. Clinic role `admin` does not grant Ruthva admin access. Verified trusted superusers also retain platform access. Keep this identity out of public frontend configuration.

Signup creates an account only after it consumes a valid email code. The legacy password signup endpoint also requires that code. Existing imported accounts must verify through email OTP login before password login, SSO, or refresh can succeed. Changing an account email clears proof and revokes its sessions. Demo access remains read-only.

## Prepare the account

1. Use Cloudflare account `b9280202abca9ff6d2865379031ddb31`. Both Wrangler files select that account.
2. Use Workers Paid. The approved plan costs $5 per month plus usage. The API requires its configured `limits.cpu_ms=30000` to complete password hashing. Amazon SES replaces Cloudflare Email Service.
3. Use the SES region with your approved sending quota. Confirm the sender identity in that region and production access for recipient addresses.
4. Enable Browser Rendering for the account.
5. Choose the public frontend HTTPS origin. Use its assigned `workers.dev` address for initial verification, or configure a Cloudflare custom domain.

Run the local checks before creating resources.

```sh
rtk npm ci
rtk npm --prefix worker ci
rtk npm --prefix frontend ci
rtk npm run check
rtk npm test
rtk npm run build
```

## Create D1 and R2

```sh
rtk npm --prefix worker exec -- wrangler d1 create ruthva-clinic --config worker/wrangler.jsonc
rtk npm --prefix worker exec -- wrangler r2 bucket create ruthva-clinic-uploads --config worker/wrangler.jsonc
```

For a new environment, copy the returned D1 ID into `worker/wrangler.jsonc`. The existing staging ID is `26a79231-b999-4e24-b0c9-9af3f221b63c`. Keep the `DB` binding and `migrations_dir` intact. The R2 bucket remains private. The API exposes clinic logos publicly and requires clinic authentication for feedback screenshots.

Set `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` in `worker/wrangler.jsonc` to the public HTTPS origin. Use a comma-separated list for additional allowed origins. Set `DEFAULT_FROM_EMAIL` to the verified address.

Set `AWS_SES_REGION` to the SES region with your quota and verified identity. The configured region is `us-east-1`, and the sender is `noreply@ruthva.com`. The SES console confirms that `ruthva.com` is verified, with DKIM enabled. It also confirms a quota of 50,000 emails per 24-hour period and a maximum send rate of 14 emails per second. SES quotas apply per region. The application does not hardcode a daily limit or assume that the quota is unused.

Set `triggers.crons` to `[]` during staging and data cutover. Restore `["*/15 * * * *"]` after the live switch. This prevents reminder emails before cutover.

Store independent random secrets of at least 32 characters with Wrangler.

```sh
rtk npm --prefix worker exec -- wrangler secret put JWT_SECRET --config worker/wrangler.jsonc
rtk npm --prefix worker exec -- wrangler secret put CRON_SECRET --config worker/wrangler.jsonc
rtk npm --prefix worker exec -- wrangler secret put AWS_ACCESS_KEY_ID --config worker/wrangler.jsonc
rtk npm --prefix worker exec -- wrangler secret put AWS_SECRET_ACCESS_KEY --config worker/wrangler.jsonc
rtk npm --prefix worker exec -- wrangler secret put RUTHVA_ADMIN_EMAIL --config worker/wrangler.jsonc
```

Use IAM credentials with permission for `ses:SendEmail` on the sender identity. SES SMTP credentials do not work with the HTTPS API. For temporary AWS credentials, also store `AWS_SESSION_TOKEN` with `wrangler secret put` and renew the credentials before expiry.

The dedicated IAM user `ruthva-cloudflare-ses` has console access disabled. Its inline policy `RuthvaCloudflareSendEmail` matches [worker/ses-policy.json](worker/ses-policy.json). The policy permits only `ses:SendEmail` through the verified `ruthva.com` identity in `us-east-1`, with `ses:FromAddress` restricted to `noreply@ruthva.com`. Its access key is configured in the API Worker secrets.

`worker/src/email.ts` signs SESv2 HTTPS requests with AWS SigV4. It sends UTF-8 HTML for OTPs, invitations, and reminders. It has a 10-second timeout and does not automatically retry SendEmail. SES throttling and rejected deliveries propagate to the caller. The D1 reminder outbox retries failed reminders on later scheduled runs.

For Ruthva journeys and SSO, set `RUTHVA_API_URL` to the Ruthva HTTPS base URL. Store `RUTHVA_INTEGRATION_SECRET` with `wrangler secret put`. Set `RUTHVA_CLINIC_SUBDOMAIN` only when the upstream service requires a fixed clinic identifier.

For GitHub feedback, set `GITHUB_FEEDBACK_REPO` and store `GITHUB_TOKEN` as a secret. Without those values, feedback stays in D1 with status `failed` for later review.

Keep `TEST_EMAIL` out of remote variables and secrets. `.dev.vars` is local only. Confirm that all required secrets appear in `wrangler secret list`. Do not place secret values in committed configuration.

## Deploy the API and frontend

```sh
rtk npm --prefix worker run db:migrate:remote
rtk npm run deploy:check
rtk npm run deploy:api
rtk npm run deploy:frontend
```

Deploy the API first. The frontend service binding requires Worker `ruthva-api` in the same account. Keep the API private with `workers_dev=false`. Public API requests pass through the frontend Worker.

Leave `NEXT_PUBLIC_API_URL` unset during the frontend build. Production uses `/api/v1` on the frontend origin.

## Verify staging

1. Request `/api/health/` through the frontend and confirm HTTP 200.
2. Log into demo mode with `demo@ruthva.com` and `123456`. Switch disciplines and confirm demo writes fail.
3. Register a synthetic clinic with an email address you control. Request an OTP and verify real email delivery.
4. Create a patient, consultation, prescription, treatment plan, and pharmacy medicine. Confirm that dispensing changes stock and rejects insufficient stock.
5. Upload a clinic logo. Confirm that the logo appears in the print view.
6. Request `/api/v1/prescriptions/<id>/pdf/` with the clinic bearer token. Confirm a PDF response and inspect Tamil text, fonts, logo, review QR, and margins.
7. Create a second clinic. Confirm that its token cannot read or modify the first clinic's records or screenshots.
8. Invite a staff member. Confirm email delivery and one-time acceptance.
9. Check the Ruthva webhook and SSO exchange against the real upstream service if those integrations are enabled.
10. Exercise one synthetic reminder through `/api/cron/` with `X-Cron-Secret`. Confirm that the second request does not send a second reminder.

The deployed API has passed SES invitation, OTP, and reminder checks against `success@simulator.amazonses.com`. A repeated reminder sends nothing. The deployed frontend also accepts the OTP request and displays the verification-code form. Browser Rendering has produced an authenticated PDF with legible Tamil text and an embedded font.

Before the live domain switch, verify delivery to a controlled human inbox and complete the production data checks below. Simulator acceptance does not verify inbox placement. Local tests verify request signatures and failure handling against a mock service.

## Move existing records

1. Schedule a write freeze on the old app. Keep the old database and uploads available for rollback.
2. Back up PostgreSQL with the supplied script. Store `DATABASE_URL` in the shell environment without committing it.

Set the shell file mask before exports so that fixture and D1 export files stay private.

```sh
umask 077
```

```sh
rtk proxy bash scripts/db-dump-local.sh .cloudflare-migration/legacy.dump
```

3. Export all application models using the original Django environment and the source database. Use Python packages from `backend/requirements.txt`.

```sh
rtk proxy .venv/bin/python backend/manage.py dumpdata $(rtk proxy python3 scripts/cloudflare-data.py labels) --all --indent 2 --output .cloudflare-migration/source.json
```

4. Copy the original media directory or object storage backup to a local directory. Preserve paths beneath the original media root. The importer reads local files and does not fetch `source_url` values.
5. Convert the fixture into a new empty output directory. Replace the example origin with the live frontend origin.

```sh
rtk proxy python3 scripts/cloudflare-data.py convert .cloudflare-migration/source.json --output .cloudflare-migration/cutover --origin https://clinic.example.com
rtk proxy python3 scripts/cloudflare-media.py prepare .cloudflare-migration/cutover/media.json --media-root /absolute/path/to/media-backup --output .cloudflare-migration/cutover/media-prepared.json
```

The converter preserves IDs, supported Django PBKDF2 password hashes, clinical JSON, decimals, UUIDs, and UTC timestamps. It validates relationships and tenant ownership before writing SQL. It maps image URLs to deterministic R2 keys. Output files use mode `0600` and are ignored by Git.

Existing over-quota patients are preserved. The importer temporarily removes the quota during inserts and restores each clinic's original limit afterward. New writes enforce that limit.

If conversion rejects duplicate emails, unsupported password hashes, missing foreign keys, oversized SQL statements, or tenant conflicts, resolve the source data and export again. The converter does not silently discard records.

6. Use a fresh, empty D1 database for the live import. Do not import into the synthetic staging database. Create a new D1 database, update `database_name` and `database_id`, and apply the migrations. Keep Cron Triggers disabled.
7. Import the generated SQL and images.

```sh
rtk npm --prefix worker exec -- wrangler d1 execute DB --remote --config worker/wrangler.jsonc --file .cloudflare-migration/cutover/data.sql
rtk proxy python3 scripts/cloudflare-media.py upload .cloudflare-migration/cutover/media-prepared.json --media-root /absolute/path/to/media-backup --bucket ruthva-clinic-uploads --remote
```

Image uploads use deterministic keys and verify each object by downloading it and comparing its size and SHA-256. Interrupted uploads can be rerun. If the database import fails, inspect the error and use a fresh database before retrying.

8. Export D1 and compare every application table against the conversion manifest.

```sh
rtk npm --prefix worker exec -- wrangler d1 export DB --remote --config worker/wrangler.jsonc --output .cloudflare-migration/d1-check.sql
rtk proxy python3 scripts/cloudflare-data.py verify .cloudflare-migration/d1-check.sql --manifest .cloudflare-migration/cutover/manifest.json
rtk proxy python3 scripts/cloudflare-media.py verify .cloudflare-migration/cutover/media-prepared.json --media-root /absolute/path/to/media-backup --bucket ruthva-clinic-uploads --remote
```

9. Deploy the API with the live D1 binding. Verify existing account login, patient totals, nested prescriptions, treatment sessions, stock totals, and uploaded images during the write freeze.
10. Switch the live domain to the frontend Worker. Existing sessions and outstanding OTPs require a new login or code request.
11. Restore the quarter-hour Cron Trigger. Deploy the API again and inspect the first reminder run.
12. End the write freeze after the checks pass. Retain the PostgreSQL backup and media backup until the rollback window closes.

The converter exports application models used by the native API. Django admin groups, Django sessions, and content types are not part of the new authorization system. Staff access uses clinic membership, role, and owner status.

## Check operations after cutover

Use `wrangler tail` or Cloudflare observability to inspect API errors. Check `email_outbox` for rows that reach five attempts. Each scheduled run drains up to 100 emails. Runs begin discovering tomorrow's follow-ups at 08:00 in Asia/Kolkata and retry pending emails every 15 minutes.

Reminder delivery is at least once. The lease and audit prevent concurrent duplicates and routine retries. A provider success followed by a database failure can still cause a duplicate email. Imported `SentReminder` records prevent previously recorded reminders from being sent again.

Take D1 exports and R2 backups before later schema or data changes. D1 Time Travel is available according to the account plan.

## Roll back

Before new writes occur on Cloudflare, point the live domain back to the frozen old app and disable the new Cron Trigger. Preserve D1 and R2 for diagnosis.

After Cloudflare accepts live writes, freeze both applications and export D1 and R2 first. Reconcile those new records before restoring old hosting. A reverse D1-to-PostgreSQL converter is not included. Do not discard the new records by switching to a stale backup.
