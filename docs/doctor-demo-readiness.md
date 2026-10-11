# Doctor demo readiness

Assessment started on 11 October 2026. This document records checks for the first doctor onboarding. An unchecked item is not a production pass.

## Workflow

- [x] Read the Poteto Mode principles and identify the current deployment.
- [x] Phase A: Frame.
- [x] Phase B: Design the workflow.
- [x] Phase C: Run the loop.
- [x] Phase D: Keep the audit trail.
- [ ] Phase E: Verify and hand back.

All automated checks and the remote recovery drill passed. Release approval and the doctor's physical sample print remain pending.

The release gate requires passing API, migration, frontend, browser workflow, and prescription print checks. It also requires a verified current database snapshot, a restore check, a separate backup copy, and a live email check. The doctor must check the physical print on her stationery before clinical use.

The units are database inventory and recovery, automated regression baseline, signup and onboarding, letterhead settings and printed output, and demo instructions. Tests use isolated synthetic clinics. The remote database inventory uses counts and integrity checks. Production data deletion requires a reviewed list and explicit approval.

The throughput checkpoint is one sequential run with independent package installs and checks in parallel. Existing test fixtures provide the baseline. This avoids duplicate environments and keeps remote changes reviewable.

## Verification

| Gate | State | Evidence |
| --- | --- | --- |
| Live health | Passed | `https://ruthva.com/api/health/` returned HTTP 200. |
| Automated regressions | Passed | 28 Worker tests, 8 Python tests, 17 browser tests, and 14 medicine autocomplete tests. Types, lint, production build, deployment preflight, and diff checks passed. |
| Doctor signup and onboarding | Passed locally | Blank optional surname, wrong code rejection, verified signup, Ayurveda onboarding, refresh, empty patient list, and repeat login. |
| Letterhead save and print | Passed locally | A4 and A5 PDFs hide the header and retain medication and Tamil advice. A 55 mm margin places the first text at 56.5 mm. Digital mode restores the header. Invalid settings and non-owner writes fail. |
| Database integrity and test records | Passed with cleanup pending | 13 clinics, 16 users, and four patient records. Integrity, foreign keys, and 26 direct clinic ownership relationships passed. Five active clinics have explicitly synthetic names. No clinical records were deleted. |
| Current D1 export and restore | Passed | The latest R2 download restored into a separate Cloudflare D1 database. All 45 tables, 190 rows, schema definitions, and ID counters match. Integrity passed with zero foreign-key violations. |
| Separate backup copy | Passed | Private R2 bucket `ruthva-clinic-backups`, local private snapshots, and D1 Time Travel. Four referenced images passed byte-for-byte readback. |
| Live human inbox delivery | Passed | Code delivered to the operator's inbox and accepted by `ruthva.com`. Existing account login returned the expected clinic. Live server PDF returned a valid 43,649-byte PDF. |
| Physical prescription print | Pending | Requires the doctor's printer and stationery. |

## Changes awaiting release

The API now permits an explicitly blank optional surname during signup. The settings page explains how to turn off the app header and the browser's Headers and footers. It reports prescription setting validation errors next to their fields.

Wrangler is updated to 4.149.0. The direct Miniflare dependency is updated to 5.20261006.1-alpha. The Worker package audit reports zero advisories. The frontend audit reports seven high and three moderate advisories in Tailwind and lint dependency chains. These packages process trusted build inputs. This assessment does not establish that every possible dependency attack is excluded. No forced framework downgrade was applied.

The production Cron Trigger is disabled. Follow-up records and assistant calls work, but automatic email reminders are not active. R2 snapshots are manual through `rtk npm run backup:cloudflare`. D1 Time Travel is continuous within the provider's retention window. Both cloud recovery copies share one Cloudflare account.

The existing deployed versions at the start of this run were API `01ba3b5a-5961-49ba-bff3-419bd3d74276` and frontend `ba10e4db-07be-4b06-a10d-aaae48a6243b`. This branch has not yet been deployed.

## Cleanup candidates

Deactivation can block these synthetic accounts and revoke their sessions while retaining their records. A physical database wipe is unnecessary for onboarding. New clinics have their own empty patient list.

| Clinic ID | Name | Users | Patients |
| --- | --- | --- | --- |
| 1740560136073 | Synthetic Staging A | 1 | 1 |
| 160264219571098 | Synthetic Staging B | 1 | 0 |
| 178708204205120 | Synthetic Staging A | 1 | 0 |
| 206941110491829 | Synthetic SES Clinic | 1 | 0 |
| 261346185098644 | Synthetic Debug | 1 | 1 |

The operator's existing Test Siddha clinic, Siddha Aura, and the three read-only demo clinics are excluded from this list.

## Recovery evidence

The first raw export import failed because referenced tables did not yet exist. Creating all tables first still failed under D1's enforced foreign keys. Parent-before-child inserts succeeded. The first comparison preserved all application tables but found duplicate SQLite sequence entries. The restore preparer now restores sequence counters after all ordinary data. A regression test checks this exact failure.

The final verified snapshot is `ruthva-clinic-backups/snapshots/2026-10-11T07-12-41-317Z/`. Its downloaded prepared SQL was imported into `ruthva-restore-20261011-final`. A second export matched all 45 tables and 190 rows, including sequence counters. Schema definitions also matched. Integrity passed and no foreign-key violations were found. Earlier recovery databases and snapshots are superseded by this result.

Private evidence lives under `.audit/doctor-demo/` and `.audit/backups/`. The recovery databases have no application binding and no public endpoint. They are retained for inspection. The recovery guide is [cloudflare-backup.md](cloudflare-backup.md). The demo instructions are [demo-and-onboarding.md](demo-and-onboarding.md).

## Decisions

Poteto principle **Model the Domain** keeps the existing `digital` and `preprinted` letterhead modes as the source of truth. It also orders backup records by their foreign-key dependencies. **Prove It Works** requires saved settings, rendered print output, and an actual Cloudflare restore check before a readiness claim. **Fix Root Causes** changed the signup contract and the restore order after their failures were reproduced.
