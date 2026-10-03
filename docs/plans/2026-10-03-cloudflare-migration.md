# Move Ruthva Clinic OS to Cloudflare

The target is Next.js on Workers, a Workers API backed by D1, R2 uploads, and Cron Triggers. Amazon SES remains the email provider at the user's request on 4 October 2026. The existing API URLs and tenant permissions remain the contract. PostgreSQL and Railway are removed from the deployed architecture.

## Workflow

- [x] Read the Principles section of the poteto-mode skill.
- [x] Phase A: Frame.
- [x] Phase B: Design the workflow.
- [x] Phase C: Run the loop.
- [x] Capture the schema and API contracts from Django.
- [x] Add the Workers runtime and D1 schema.
- [x] Migrate authentication, tenant access, clinic settings, and invitations.
- [x] Migrate patients, consultations, prescriptions, treatments, pharmacy, and exports.
- [x] Move uploads, email, reminders, and external integrations.
- [x] Build the frontend Worker and test the combined application.
- [x] Phase D: Keep the audit trail.
- [x] Phase E: Verify and hand back.

## Design decision

Candidate A preserves Django in Cloudflare Containers and retains external PostgreSQL. It preserves the ORM and native PDF renderer but fails the user's requirement to use only Cloudflare.

Candidate B keeps the frontend and replaces the Django API with a Workers API. D1 holds the relational model, R2 holds uploads, and Cloudflare services handle schedules and PDF rendering. Workers send email through Amazon SES. This is the selected design. Database writes that depend on each other use D1 batches and database constraints. Stock deductions and patient record numbers must remain safe under concurrent requests.

Candidate exploration and review run sequentially because the project's AGENTS instructions require that workflow.

## Definition of done

The frontend builds as a Worker. The API runs under workerd with D1 and R2. Existing application endpoints are implemented. Runtime checks exercise authentication, tenant isolation, CRUD, nested prescriptions, stock changes, treatment plans, imports, and exports. Production data conversion preserves IDs and password hashes. Cloud resource creation, data cutover, and deployment require account configuration and deployment approval.

## Scope and verification

The original backend contains 167 Python files and 13,321 lines, including tests and migrations. This migration changes authentication and persistent clinical data. The verification standard is therefore high. The Django source remains available as a reference until the replacement passes the contract checks.

The throughput checkpoint prioritizes a working D1 schema, authentication, and a clinical request before broad endpoint migration. Frontend build checks and backend runtime checks run after each relevant unit. No parallel agents write shared files.

## Handoff state

Local implementation and verification are complete. The report is in `docs/cloudflare-verification.md`, and the decision trail is in `docs/cloudflare-decisions.tsv`. The staging and cutover steps are in `CLOUDFLARE-DEPLOY.md`.

Cloudflare resource creation, remote email and PDF checks, and live data cutover remain pending deployment approval. The D1 ID and production origins are placeholders. No remote resources or live data were changed.

Opening a pull request is skipped because the project arrived without Git metadata and has no configured remote. Work remains on `refactor/cloudflare-hosting`. Cross-model review is skipped because the supplied AGENTS instructions require sequential main-thread work.
