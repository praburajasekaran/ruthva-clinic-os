# Ruthva Clinic OS

Ruthva manages AYUSH clinic patients, consultations, prescriptions, treatment plans, and pharmacy stock.

The application is configured for Cloudflare hosting. Next.js uses OpenNext on Workers. A TypeScript API uses Hono, D1, R2, Browser Rendering, and Cron Triggers. Amazon SES sends transactional email.

## Run locally

Use Node.js 22 from `.nvmrc` and Python 3.10 or later for migration tools. Install all packages with the same Node architecture.

```sh
rtk npm ci
rtk npm --prefix frontend ci
rtk npm --prefix worker ci
rtk proxy cp worker/.dev.vars.example worker/.dev.vars
```

Set independent random values for `JWT_SECRET` and `CRON_SECRET` in `worker/.dev.vars`. Keep `TEST_EMAIL=capture` for local development. Local email calls return a test receipt.

```sh
rtk npm run migrate:local
rtk npm run dev
```

The frontend opens at `http://localhost:3000`. The API listens at port 8797. The demo login uses `demo@ruthva.com` and code `123456`. Demo clinics are read-only.

To run the built frontend and API with their service binding, use this command.

```sh
rtk npm run preview
```

The combined preview opens at `http://localhost:8798`. Real SES delivery and the Browser Rendering binding require remote verification. The frontend print view works locally.

## Verify changes

```sh
rtk npm run check
rtk npm test
rtk npm run build
```

The API tests run against workerd with D1 and R2. Migration tests check preserved records, foreign keys, tenant ownership, and image checksums. CI builds both Workers.

To verify visit completion in Chromium, install the test browser and run the workflow check.

```sh
rtk npx playwright install chromium
rtk npm run test:visit-completion
```

The check starts an isolated workerd database and the frontend on ports 8796 and 3006. It covers new and returning visits, follow-up, treatment plans, dispensing, role permissions, and refresh. It checks record counts and stock through the API. Screenshots and failure traces are saved under `.audit/visit-completion/`.

## Deploy and migrate

Follow [Deploy Ruthva on Cloudflare](CLOUDFLARE-DEPLOY.md). The deployment commands reject the placeholder D1 ID and local production origins.

The [verification report](docs/cloudflare-verification.md) records coverage and limits. The [decision log](docs/cloudflare-decisions.tsv) records the choices behind the migration.

## Source layout

| Directory | Responsibility |
| --- | --- |
| `frontend/` | Next.js UI and frontend Worker with the API service binding. |
| `worker/` | API, D1 migrations, and runtime tests. |
| `scripts/` | Development runner, contract generator, data converter, media importer, and deployment checks. |
| `backend/` | Original Django source for contract generation, data export, and rollback reference. |

Django, PostgreSQL, and Railway are absent from the deployed runtime. SES uses your existing AWS account and sending quota. Optional Ruthva journeys and GitHub feedback remain external application integrations.

The [WhatsApp handoff reference](docs/whatsapp-handoff.md) describes reviewed prescription text and reminders that staff send from their signed-in WhatsApp account. The user presses Send in WhatsApp. Delivery remains unconfirmed in Ruthva.
