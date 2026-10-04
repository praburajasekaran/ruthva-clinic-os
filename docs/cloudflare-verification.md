# Cloudflare migration verification

The app is deployed at [ruthva-clinic.prabu-b92.workers.dev](https://ruthva-clinic.prabu-b92.workers.dev). Cloudflare runs the frontend, API, D1 database, R2 uploads, and PDF renderer. Amazon SES handles email through the verified `us-east-1` identity. Workers Paid is active at the approved $5 per month plus usage.

The deployed application passes nine core scenarios and five live SES scenarios. Five additional password logins pass on the final API version. Staging contains synthetic records. The live domain and production data have not been switched.

## Deployed resources

| Resource | Verified state |
| --- | --- |
| Cloudflare account | `b9280202abca9ff6d2865379031ddb31`. Workers Paid is active. |
| Public frontend | `ruthva-clinic`, version `0ad2eaee-177d-416b-81f3-c7659ddaa806`. Its `API` service binding targets `ruthva-api`. Preview URLs are disabled. |
| Private API | `ruthva-api`, version `41b9188f-97dc-4af6-b341-337bd8960936`. The version receives 100% of traffic and has a 30,000 ms CPU limit. Both `workers.dev` access and preview URLs are disabled. |
| D1 | `ruthva-clinic` in APAC, ID `26a79231-b999-4e24-b0c9-9af3f221b63c`. Four migrations are applied. The schema check found no foreign-key violations. |
| R2 | Private bucket `ruthva-clinic-uploads`, created with an APAC location hint. |
| API secrets | `JWT_SECRET`, `CRON_SECRET`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` are `secret_text` bindings. |
| Cron Triggers | Empty during staging. One authenticated manual reminder was verified. |
| SES | Verified `ruthva.com` identity with DKIM enabled in `us-east-1`. The sender is `noreply@ruthva.com`. The console confirms 50,000 emails per 24 hours and 14 emails per second. |

The dedicated IAM user `ruthva-cloudflare-ses` has one inline policy, `RuthvaCloudflareSendEmail`, and no console access. Its saved policy matches `worker/ses-policy.json`. A live SES request from `other@ruthva.com` returns HTTP 403, confirming the sender restriction.

Remote configuration evidence is saved in `.audit/cloudflare-api-final-metadata.json` and `.audit/cloudflare-frontend-final-metadata.json`. Billing and SES evidence is saved in `.audit/cloudflare-workers-paid.jpg`, `.audit/amazon-ses-account.txt`, and `.audit/amazon-ses-iam-policy.txt`.

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

## Deployed verification

The core run creates two clinics through signup and verifies password login. The following command completed with exit code 0 on 4 October 2026 in Asia/Kolkata.

```sh
rtk proxy node .audit/cloudflare-staging-smoke.mjs --skip-demo
```

Its nine scenarios verify public health and HTML, API authentication and CORS, signup and token refresh, patient persistence and tenant isolation, nested Tamil prescriptions, stock updates and rollback, R2 logo bytes, private screenshot permissions, and authenticated Browser Rendering PDF responses.

Demo OTP login, discipline switching, and read-only access passed before the CPU correction. The core run skips another demo request because earlier requests reached the hourly OTP limit. The earlier result is preserved in `.audit/cloudflare-staging-results-pre-cpu.json` and the browser screenshots.

The first deployment exposed password requests near the account's effective CPU limit. Tail events reported `exceededCpu` at approximately 2,010 ms. The approved Workers Paid plan allows the explicit 30,000 ms API limit. The fix preserves Django-compatible password hashes and their iteration counts. Five consecutive password logins on the final API version return HTTP 200. Their elapsed HTTP times are 2,329 to 2,827 ms.

Evidence is saved in `.audit/cloudflare-staging-paid-smoke.log`, `.audit/cloudflare-staging-results.json`, and `.audit/cloudflare-password-results.json`. The rejected Free-plan deployment is retained in `.audit/cloudflare-api-cpu-deploy.log`.

The live SES command also completed with exit code 0.

```sh
rtk proxy node .audit/cloudflare-ses-smoke.mjs
```

Its five scenarios verify the deployed SES configuration, rejection of an unauthorized sender, accepted staff invitation and registered-user OTP requests, and one authenticated reminder with a real SES message ID. A repeated reminder sends zero messages. All recipients are Amazon's mailbox simulator. No customer messages were sent. The invitation fixture was corrected to use the existing `first_name` and `therapist` contract before the successful run.

The browser's deployed login form displays "Check your email" and the verification-code input after the simulator request. Evidence is saved in `.audit/cloudflare-ses-smoke.log`, `.audit/cloudflare-ses-results.json`, and `.audit/cloudflare-staging-ses-login.jpg`. The private provisioning file was removed after these checks. Repeating the recorded SES run requires local credentials and new simulator fixtures.

The remote prescription PDF has one page and 83,287 bytes. Visual inspection confirms legible Tamil labels and instructions, saved medication fields, and correct margins. Its `GoogleSans17pt-Regular` font is embedded. Pypdf extraction contains 13 null characters in Tamil clusters, so exact extracted Tamil text is not asserted. Evidence is saved in `.audit/cloudflare-staging-prescription.pdf`, `.audit/cloudflare-staging-prescription.png`, and `.audit/cloudflare-staging-pdf-results.json`.

`rtk npm run deploy:check` now passes with the assigned D1 ID and HTTPS origin. The API's remote settings confirm that local `TEST_EMAIL=capture` is absent. Both Worker tail sessions have stopped.

## Unregistered staging email

A reported missing login code was reproduced on the deployed login page on 4 October 2026. Parameterized D1 queries found zero accounts, zero login OTPs, and zero pending signups for the reported email. Another query after the browser request returned the same counts. The login route returns its generic response without calling SES when the email has no active account.

The frontend incorrectly displayed "We sent a code" for that response. The corrected page displays "If [email] is registered, we sent a login code." Its live region uses the same condition and announces the demo code for demo mode. The existing registration link opens the signup form. The user's email was filled there without submitting registration.

Frontend type checking and lint passed with the existing custom-font warning. The OpenNext build and frontend deployment passed using the bundled ARM64 Node runtime. The shell's x64 Node runtime could not load the installed ARM64 ast-grep dependency. No dependency files were changed. The deployed frontend version is `f906a191-f374-4b40-ac66-43d8e3c4cd47`.

Browser verification confirmed the corrected visible text and live-region text on that deployment. Local evidence is saved in `.audit/otp-account-check.json`, `.audit/otp-login-before.png`, and `.audit/otp-login-after.png`. This check does not verify human inbox delivery. Staging registration requires the user's doctor name and discipline, or existing account access requires the later production data import.

## Email verification and clinic activation

The account feature is deployed to staging on 4 October 2026. API version `336b897f-f37a-487f-81ec-2144e88d8966` uses migration `0005_account_activation.sql`. Frontend version `6c06c096-2dbe-4ff5-951e-5a2954d90599` includes the Ruthva admin clinic page.

Signup consumes email proof before creating a usable account. Password login, SSO, refresh, and authenticated requests enforce that proof. Email changes clear proof and revoke sessions. The legacy signup endpoint requires a pending signup code. Existing accounts and imported records have no assumed proof and must verify through OTP login. Demo access stays read-only.

Ruthva admin can search clinic accounts, inspect owner verification, and activate or deactivate a clinic. Deactivation blocks the owner and staff and revokes their sessions. Reactivation requires a verified active owner and a new login. Status retries do not add duplicate audit entries. Platform admin access remains available to restore an inactive clinic, while clinical records stay blocked.

Worker type checking, frontend type checking and lint, and the OpenNext build pass. Fourteen workerd API tests and five data migration tests pass. The existing custom-font warning remains. The worktree's own locked dependencies resolve the native Sharp bundle error caused by dependency symlinks.

Twenty-four live staging checks pass for SES simulator requests, signup and invitation proof, admin permission, whole-clinic suspension, access and refresh revocation, audit idempotence, and a new staff login after reactivation. The deployed browser passes admin OTP login, routing, search, deactivation, and reactivation. Local browser checks also verify ordinary-owner denial and disabled activation without a verified owner.

The private Worker secret `RUTHVA_ADMIN_EMAIL` contains the user's confirmed identity, `ekalaivan@gmail.com`. That address has no staging account yet. The user must register that exact address and verify the emailed code. The three test accounts are inactive, the temporary test superuser flag is removed, and their synthetic clinic is inactive. Other clinics were not changed. `TEST_EMAIL` and scheduled reminders remain disabled remotely.

A private D1 backup was saved before migration. Local evidence is in `.audit/pre-account-activation.sql`, `.audit/account-activation-staging-results.json`, `.audit/clinic-admin-preview.jpg`, `.audit/clinic-admin-denied.jpg`, and `.audit/clinic-admin-staging-inactive.jpg` in the `account-activation` worktree. The temporary browser OTP file was removed after cleanup.

The [feature plan](plans/2026-10-04-email-verification-and-clinic-activation.md) records the design and checks. [Pull request 108](https://github.com/praburajasekaran/ruthva-clinic-os/pull/108) contains the changes. The original checkout and its uncommitted changes are preserved.

## Verification still pending

Delivery and inbox placement at a controlled human inbox have not been checked. Live SES acceptance, sender verification, quota, and Browser Rendering PDF responses have been verified. Local development still supports `TEST_EMAIL=capture`.

The real Ruthva service and GitHub feedback delivery were not exercised. Their API contracts were checked with a mock upstream or local configuration.

Production data conversion was checked with synthetic fixtures. Live PostgreSQL records and uploads have not been exported or imported. The deployment guide includes count, content-hash, foreign-key, and R2 checksum verification before cutover.

Reminder delivery is at least once. A provider success followed by a database failure can resend an email. Each scheduled run processes up to 100 pending messages, with up to five attempts. The quarter-hour schedule drains pending work and starts discovering tomorrow's follow-ups at 08:00 in Asia/Kolkata.

The staging D1 ID and public origin are configured. The live cutover requires a fresh D1 database for production records and the intended custom domain. The API and frontend deployment scripts run the configuration check before deployment.

The project is connected to [praburajasekaran/ruthva-clinic-os](https://github.com/praburajasekaran/ruthva-clinic-os). The existing GitHub history is restored locally. Cloudflare migration work is on `refactor/cloudflare-hosting`, based on the repository's `main` branch.

## Review method

Review ran sequentially in the main thread, as required by the supplied AGENTS instructions. It inspected authentication, tenant scopes, database constraints, nested clinical writes, uploads, reminder leases, data conversion, and the deployment guide. No independent model review was performed.

The decision log was checked against the available session summary, tool results, and referenced files. A separate transcript file was not supplied. The log records the resulting implementation and observed checks, rather than invented earlier timestamps.

The user approved the initial deployment, Workers Paid and its terms, and the SES-only IAM user and Worker secrets. Follow [Deploy Ruthva on Cloudflare](../CLOUDFLARE-DEPLOY.md) for the later production data and domain cutover.
