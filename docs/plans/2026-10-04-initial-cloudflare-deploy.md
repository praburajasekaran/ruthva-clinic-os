# Initial Cloudflare deployment

The initial deployment is complete at [ruthva-clinic.prabu-b92.workers.dev](https://ruthva-clinic.prabu-b92.workers.dev). The user approved deployment, Workers Paid and its terms, and the SES-only IAM user and Worker secrets on 4 October 2026. Staging uses synthetic records. Production records and the live domain require the later cutover described in `CLOUDFLARE-DEPLOY.md`.

## Verification sequence

- [x] Confirm the migration branch, previous local checks, Cloudflare account, and resource inventory.
- [x] Create the D1 database and private R2 bucket. Record their identifiers.
- [x] Configure the assigned frontend origin, disable Cron Triggers during staging, and provision authentication secrets.
- [x] Apply migrations to the new D1 database and verify its schema.
- [x] Deploy the API and verify its bindings. Deploy the frontend afterward.
- [x] Verify public health, demo authentication, tenant permissions, uploads, and PDF rendering against the deployed Workers.
- [x] Record the public URL, versions, observed results, and any external setup still required.
- [x] Activate the approved Workers Paid plan and verify password requests after the CPU-limit correction.
- [x] Configure the verified SES region, scoped IAM user, and API Worker secrets.
- [x] Verify live SES invitation, OTP, and reminder requests through Amazon's mailbox simulator. Keep Cron Triggers disabled.

## Throughput checkpoint

- Blocking first steps. Confirm account access and existing resource names before creation.
- Independent workstreams. Read-only account and CLI checks can run together. Resource changes and deployment remain sequential.
- Shared mutable state. One main-thread owner updates Wrangler configuration and remote resources. Store secret values only in ignored private files or Worker secrets.
- Smallest safe decomposition. Create resources, verify schema, deploy the API, deploy the frontend, then check the public application.

## Email

Amazon SES is configured in `us-east-1` with sender `noreply@ruthva.com`. The console confirms that `ruthva.com` is verified, with DKIM enabled, a quota of 50,000 emails per 24 hours, and a send rate of 14 emails per second.

The approved IAM user `ruthva-cloudflare-ses` has no console access. Its single inline policy matches `worker/ses-policy.json` and permits only `ses:SendEmail` from the configured sender. Its access key is stored in the API Worker secrets. A live request with another sender returns HTTP 403.

Invitation, OTP, and reminder requests pass against `success@simulator.amazonses.com`. A repeated reminder sends nothing. Scheduled reminders remain disabled. Human inbox placement remains unverified.

## Local baseline

`npm run check` and `npm test` pass. The test suite includes ten workerd scenarios and five migration tests. API and frontend dry deployments pass. Evidence remains in `.audit/ses-check.log`, `.audit/ses-test.log`, `.audit/ses-api-build.log`, and `.audit/ses-frontend-build.log`.

## Resources

Cloudflare account `b9280202abca9ff6d2865379031ddb31` uses the Workers subdomain `prabu-b92`. D1 database `ruthva-clinic` was created in APAC with ID `26a79231-b999-4e24-b0c9-9af3f221b63c`. The private bucket is `ruthva-clinic-uploads`.

The final API version is `41b9188f-97dc-4af6-b341-337bd8960936`. The frontend version is `0ad2eaee-177d-416b-81f3-c7659ddaa806`, with an `API` service binding to the private API. Remote settings confirm D1, R2, Browser Rendering, and four `secret_text` bindings. D1 has four applied migrations and no foreign-key violations.

The final frontend configuration check found a signup availability request that used `NEXT_PUBLIC_API_URL` without a default. It now uses `/api/v1` when the variable is unset, consistent with the deployed frontend API client.

## Runtime correction

Remote signup reached the account's effective API CPU limit at approximately 2,010 ms. API tail events reported `exceededCpu`. The service-binding error appeared as HTTP 500 through the frontend. Successful password hashing took 1,994 ms, so repeated calls crossed the limit.

Workers Paid is active at the approved $5 per month plus usage. The API's deployed limit is 30,000 ms. Fresh signup and password login pass. Five consecutive password logins on the final API version also pass, with elapsed HTTP times of 2,329 to 2,827 ms. Existing Django-compatible PBKDF2 hashes and iteration counts are preserved.

## Remote results

The core run passes nine scenarios. The live SES run passes five scenarios. The deployed browser displays the OTP verification form after a simulator request. The authenticated remote PDF displays Tamil text and embeds its font. The final configuration check passes, API preview access remains disabled, and Cron Triggers remain empty.

Results are recorded in `docs/cloudflare-verification.md`. Scripts, command logs, metadata, screenshots, and the PDF are stored in `.audit/`. Private tokens and keys are excluded from the public reports. No live domain or production data cutover occurred.
