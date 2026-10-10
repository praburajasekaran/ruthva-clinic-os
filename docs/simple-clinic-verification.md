# Simple clinic workflow verification

This branch implements the accepted prototype in the production Next.js and Cloudflare Worker app. It starts from `origin/main` at `ff34141`. The prototype on port 4317 remains separate.

## Changes from main

- Home starts with a visit action and four areas. Patients, Visits, Medicines, and Therapies link to saved production records.
- Patient records have Overview, Visits, Health history, and Patient details tabs. Doctors can update history inline. Empty details are hidden, and recorded zero values remain visible.
- Allergy, medical history, and current medicine review statuses distinguish unknown information from explicit negative findings. Missing important details link to Health history.
- The patient overview reads clinic-scoped saved facts. It regenerates when the record opens or refreshes after a saved edit. Changes elsewhere appear after the record reloads. The app has no real-time subscription.
- Patient calls have an assigned doctor or admin staff member, a contact date, and a permanent contact history. Assistants can retry calls and ask questions. Only doctors can answer questions, assign tasks, or reopen completed contacts.
- Clinical return dates remain separate from contact reminders. Sessions & reviews retains the existing clinical worklist.
- Georgia headings and Trebuchet MS body text use local fonts with device fallbacks.

Registration, practice examination forms, prescription creation, printing, dispensing, treatment plans, Homeopathy remedy history, authentication, and clinic access rules retain their production routes. This change does not turn the prototype server into the production app.

## Verification

| Check | Command or method | Result |
| --- | --- | --- |
| Worker integration tests | `npm test` at the repository root | 27 tests passed |
| Data and media migration tests | Included in root `npm test` | 5 tests passed |
| Prescription output | Included in root `npm test` | Escaped bilingual HTML, embedded fonts, review QR, and preprinted mode passed |
| Type checks and lint | `npm run check` | Worker and frontend passed |
| Browser workflows | `npx playwright test --config scripts/visit-completion.config.mjs` | 10 tests passed |
| Final home and contact edits | Same command with `--grep 'assistant retries\|home links'` | 2 tests passed |
| Sidebar contact badge | Same command with `--grep 'assistant retries'` after badge refresh change | Passed without a page reload after planning |
| Live OpenRouter generation | `node scripts/verify-live-patient-summary.mjs` against the isolated fixture | Generated and refreshed an AI paragraph after a saved allergy change. The final paragraph had 91 words |
| Manual browser checks | CUA with synthetic records | Saved history, home, contact retry, reload persistence, and mobile layout inspected |
| Mobile contact layout | 390 by 844 viewport | Document width was 390 pixels. No horizontal overflow |
| Cloudflare frontend build | `npm --prefix frontend run build:cloudflare` | Passed with local worktree dependencies |

The contact integration test covers assignment, creation retries, retries without clinical date changes, doctor questions and replies, allowed transitions, concurrent writes, clinic isolation, and therapist restrictions. Concurrent attempts produce one saved event and one conflict response.

The summary integration test covers saved input changes, cached results, provider errors, invalid output, long histories, short fallback text, and a record change during generation. A changed record produces its latest saved-fact overview instead of an outdated AI response.

Screenshots are local artifacts under `.audit/simple-clinic/`. They contain synthetic data. Browser console errors from `chrome-extension://` scripts were distinct from application code.

To repeat the live check, build the Worker and start `scripts/visit-completion-fixture.mjs` with `SIMPLE_CLINIC_SUMMARY_KEY_FILE` set to an ignored file containing `OPENROUTER_API_KEY=...`. Run `node scripts/verify-live-patient-summary.mjs` in another terminal. The script accepts only the fixed local fixture address. Keep the key out of chat and Git.

## Provider and release requirements

The Worker uses OpenRouter with `anthropic/claude-sonnet-4.6`. It excludes structured names, record identifiers, phone numbers, email addresses, and street addresses. Clinical free text is not automatically redacted. Provider requests deny data collection and disable provider fallbacks.

History input includes at most 40 medical and 40 family entries, with total counts. Recent activity has fixed query limits. Text longer than 2,000 characters is marked as omitted. The fallback uses complete short facts or directs the doctor to the saved record. It does not cut medicine doses into partial instructions.

Live fixture checks prove the connection and refresh behavior for synthetic examples. They do not establish clinical accuracy. The UI labels generated text as an AI overview and asks the doctor to check the saved record.

Before a production release, apply Worker migrations `0007_patient_reviews.sql` and `0008_contact_followups.sql`. Configure `OPENROUTER_API_KEY` as a Worker secret. Release the API before the frontend. Without the secret, the patient overview uses saved details. No API key is shipped to the browser.

The Django patient migration keeps legacy model contracts aligned. New summary and contact routes are implemented in the active Worker runtime.

No production patient records were changed. The branch is for review. Merge and deployment remain separate actions.
