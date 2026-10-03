# Initial Cloudflare deployment

The user approved the initial deployment on 4 October 2026. Deploy the reviewed application to a new Workers origin with an empty D1 database. Production records and the live domain require the later cutover described in `CLOUDFLARE-DEPLOY.md`.

## Verification sequence

- [x] Confirm the migration branch, previous local checks, Cloudflare account, and resource inventory.
- [x] Create the D1 database and private R2 bucket. Record their identifiers.
- [x] Configure the assigned frontend origin, disable Cron Triggers during staging, and provision authentication secrets.
- [x] Apply migrations to the new D1 database and verify its schema.
- [ ] Deploy the API and verify its bindings. Deploy the frontend afterward.
- [ ] Verify public health, demo authentication, tenant permissions, uploads, and PDF rendering against the deployed Workers.
- [ ] Record the public URL, versions, observed results, and any external setup still required.

## Throughput checkpoint

- Blocking first steps. Confirm account access and existing resource names before creation.
- Independent workstreams. Read-only account and CLI checks can run together. Resource changes and deployment remain sequential.
- Shared mutable state. One main-thread owner updates Wrangler configuration and remote resources. Store secret values only in ignored private files or Worker secrets.
- Smallest safe decomposition. Create resources, verify schema, deploy the API, deploy the frontend, then check the public application.

## Email

Amazon SES is the selected provider. The previous credential check found no AWS credentials. Deploy the application with the SES sender configuration and record email as unverified until credentials and sender identity are available. Keep scheduled reminders disabled during staging.

## Local baseline

`npm run check` and `npm test` pass. The test suite includes ten workerd scenarios and five migration tests. API and frontend dry deployments pass. Evidence remains in `.audit/ses-check.log`, `.audit/ses-test.log`, `.audit/ses-api-build.log`, and `.audit/ses-frontend-build.log`.

## Resources

Cloudflare account `b9280202abca9ff6d2865379031ddb31` uses the Workers subdomain `prabu-b92`. D1 database `ruthva-clinic` was created in APAC with ID `26a79231-b999-4e24-b0c9-9af3f221b63c`. The private bucket is `ruthva-clinic-uploads`.

The deployed API version is `cb4a523e-b7da-4956-9f62-7e801dfc1fe4`. Wrangler confirmed its D1, R2, and Browser Rendering bindings. `wrangler secret list` confirms `JWT_SECRET` and `CRON_SECRET` are `secret_text` bindings. D1 has four applied migrations and no foreign-key violations.

The final frontend configuration check found a signup availability request that used `NEXT_PUBLIC_API_URL` without a default. It now uses `/api/v1` when the variable is unset, consistent with the deployed frontend API client.
