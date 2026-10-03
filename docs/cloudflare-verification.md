# Cloudflare migration verification

The Cloudflare hosting implementation with Amazon SES passes local checks. No Cloudflare resources were created, no Worker was deployed, and no live data was changed in this run.

## Implementation

| Component | Runtime |
| --- | --- |
| Frontend | Next.js 15.5.27 with OpenNext 1.20.8 on Workers. |
| API | Hono and TypeScript on Workers. |
| Relational data | D1 with foreign keys, tenant triggers, and transactional batches. |
| Uploads | Private R2 bucket. Logos are public through the API. Feedback screenshots require clinic authentication. |
| Transactional email | Amazon SESv2 HTTPS requests signed with AWS SigV4. |
| Follow-up reminders | Cron Triggers and a leased D1 email outbox. |
| PDF files | Cloudflare Playwright and Browser Rendering with embedded fonts. |

Django and PostgreSQL remain local migration references. The deployed application does not use those runtimes. Amazon SES uses the existing AWS account at the user's request. Optional Ruthva journeys and GitHub feedback remain external application integrations.

The contract generator captured 26 application models, 51 serializers, and 111 original URL patterns. The runtime route check covers every primary original endpoint and HTTP method. It excludes duplicate format-suffix routes and DRF API-root discovery. The native API supports `.json` URLs and provides `/api/schema/` and `/api/docs/`.

## Automated checks

The following commands completed with exit code 0 on 4 October 2026 in Asia/Kolkata.

| Command | Result | Local evidence |
| --- | --- | --- |
| `rtk npm run check` | API and frontend type checks pass. ESLint has no errors and one existing Next font warning. | `.audit/ses-check.log` |
| `rtk npm test` | Ten workerd scenarios and five Python migration tests pass. PDF HTML assertions pass. | `.audit/ses-test.log` |
| `rtk npm run build` | API dry deployment and frontend OpenNext build pass before the SES replacement. | `.audit/cloudflare-build.log` |
| `rtk npm --prefix worker run build` | API dry deployment passes with SES. | `.audit/ses-api-build.log` |
| `rtk npm --prefix frontend exec -- wrangler deploy --dry-run --config frontend/wrangler.jsonc --outdir .audit/frontend-worker` | Frontend dry deployment passes. | `.audit/ses-frontend-build.log` |

After the SES change, the API bundle measures 7431.30 KiB before compression and 2112.83 KiB with gzip. The frontend bundle measures 6864.90 KiB before compression and 1392.36 KiB with gzip. The frontend build has a duplicate-case warning in generated dependency code and a Node `punycode` deprecation warning. Neither warning prevents the build.

The runtime scenarios exercise these behaviors.

- Login, JWT refresh, legacy Django PBKDF2 hashes, OTP expiry, attempt limits, one-time consumption, and onboarding.
- SES request signing, UTF-8 payloads, session credentials, throttling, rejected deliveries, invalid receipts, and redirect rejection. A separate implementation verifies the AWS signature over the request received by the mock SES service.
- Read-only demo login and discipline switching.
- Tenant isolation on reads and writes, including nested records and direct foreign-key writes.
- Patient registration, clinical JSON, consultation and prescription writes, nested medications, and procedures.
- Atomic stock rollback and concurrent dispensing.
- Concurrent active-patient quotas and unique patient record numbers.
- Staff capacity, invitation consumption, owner protection, and role restrictions.
- Treatment blocks, session feedback, doctor tasks, and plan completion.
- CSV preview and import, repeat-import handling, CSV and ZIP exports, and export audits.
- Logo MIME checks, R2 storage, private feedback screenshots, and authenticated reminder deduplication.
- Ruthva upstream failures, request fields, webhook authentication, response validation, and one-time SSO exchange against a mock upstream.

The migration tests check IDs, valid password hashes, JSON, timestamps with microseconds, decimals, UUIDs, over-quota patients, and media URL mapping. They reject duplicate emails, missing foreign keys, tenant conflicts, malformed password hashes, unsafe image paths, changed files, and corrupt uploaded objects.

The media importer also completed a real local R2 round trip. It uploaded one synthetic PNG, downloaded it, and matched its size and SHA-256.

## Browser checks

The combined preview runs the built frontend and API through the `API` service binding at `http://localhost:8798`.

The browser completed demo login and discipline switching. A synthetic normal clinic created a patient, consultation, and Siddha prescription through the UI. The patient record was `PAT-2026-0001`. The print view displayed the saved medication, dosage, frequency, and Tamil labels. The Team page displayed the clinic owner and role capacities after the trailing-slash fix.

Local artifacts record the observed result.

- `.audit/cloudflare-demo.png` shows the demo dashboard.
- `.audit/cloudflare-prescription.png` shows the saved prescription.
- `.audit/cloudflare-print.png` shows the frontend print view.
- `.audit/cloudflare-team.png` shows the clinic owner and staff capacities.
- `.audit/prescription.html`, `.audit/prescription.png`, and `.audit/prescription.pdf` show the API renderer's escaped bilingual HTML, embedded fonts, and review QR in local Chromium.

The fixture script also checks preprinted mode. Browser inspection confirmed that a script-like patient name appears as literal text.

## Dependency audit

`npm audit` reports zero vulnerabilities for `worker/`. Compatible frontend updates and overrides fix Axios, ZIP extraction, PostCSS, and other patched dependencies.

Eight high advisories remain in the frontend dependency tree through the build-time `braces` package. The affected packages are `braces`, `chokidar`, `micromatch`, `fast-glob`, `@next/eslint-plugin-next`, `eslint-config-next`, `tailwindcss`, and `tailwindcss-animate`. The audit offers no compatible fix for that chain. Those tools process repository CSS and file paths during builds. The application does not accept user-supplied glob patterns for them.

`frontend/package.json` overrides `adm-zip` to 0.6.1 or later and Next's PostCSS dependency to 8.5.28 or later. A fresh dependency installation resolved the overrides, and the Cloudflare build passed afterward.

## Remote verification still pending

Live SES delivery, sender verification, actual AWS quota, and Browser Rendering PDF responses have not been verified. AWS credentials are absent from both the project configuration and the default local AWS credential chain. The user states a quota of 50,000 messages daily. Runtime tests use signed requests against a mock SES endpoint. Local development still supports `TEST_EMAIL=capture`. Local Chromium verifies rendered HTML and PDF content.

The real Ruthva service and GitHub feedback delivery were not exercised. Their API contracts were checked with a mock upstream or local configuration.

Production data conversion was checked with synthetic fixtures. Live PostgreSQL records and uploads have not been exported or imported. The deployment guide includes count, content-hash, foreign-key, and R2 checksum verification before cutover.

Reminder delivery is at least once. A provider success followed by a database failure can resend an email. Each scheduled run processes up to 100 pending messages, with up to five attempts. The quarter-hour schedule drains pending work and starts discovering tomorrow's follow-ups at 08:00 in Asia/Kolkata.

The D1 ID and public origin still need production configuration. `npm run deploy:check` currently fails with the expected placeholder-ID and localhost-origin messages. The API and frontend deployment scripts run that check before deployment.

The project is connected to [praburajasekaran/ruthva-clinic-os](https://github.com/praburajasekaran/ruthva-clinic-os). The existing GitHub history is restored locally. Cloudflare migration work is on `refactor/cloudflare-hosting`, based on the repository's `main` branch.

## Review method

Review ran sequentially in the main thread, as required by the supplied AGENTS instructions. It inspected authentication, tenant scopes, database constraints, nested clinical writes, uploads, reminder leases, data conversion, and the deployment guide. No independent model review was performed.

The decision log was checked against the available session summary, tool results, and referenced files. A separate transcript file was not supplied. The log records the resulting implementation and observed checks, rather than invented earlier timestamps.

Deployment approval is the next step. Follow [Deploy Ruthva on Cloudflare](../CLOUDFLARE-DEPLOY.md) for staging and the later data cutover.
