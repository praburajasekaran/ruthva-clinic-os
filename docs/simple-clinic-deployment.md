# Simple clinic workflow deployment

The `prabu/implement-simple-clinic-workflow` branch was deployed to Cloudflare on 10 October 2026. The app is available at [ruthva.com](https://ruthva.com) and [the Workers origin](https://ruthva-clinic.prabu-b92.workers.dev). PR [#124](https://github.com/praburajasekaran/ruthva-clinic-os/pull/124) remains unmerged. Production now serves this branch; `main` still contains the earlier implementation.

## Initial workflow deployment versions

| Worker | Workflow release version | Previous version |
| --- | --- | --- |
| `ruthva-api` | `bde799ae-602f-4bab-9724-f2f3c571a819` | `a6bed671-8d70-4449-9197-2ae3c4add897` |
| `ruthva-clinic` | `f9fecce6-aaf9-42f7-ae69-58a62288454e` | `f1985e23-ff73-46c1-9ae5-55c00058f0a9` |

The frontend was subsequently updated to `d877db38-a183-4012-9f7e-059f06b7755b` on 10 October 2026 for the [shared heading typography](heading-typography.md). The API version remains `bde799ae-602f-4bab-9724-f2f3c571a819`.

Migrations `0006`, `0007`, and `0008` are applied to remote D1 database `ruthva-clinic`. Wrangler reported no pending migrations. `OPENROUTER_API_KEY` is configured as a secret on `ruthva-api`. The API has no public Workers URL and is reached through the frontend's `API` service binding.

The API was released before the frontend. The verified frontend build contained no local API URLs. The existing `ruthva.com` custom domain was restored after the first frontend deployment removed it. The frontend configuration now declares that domain and the production API service binding. Both configurations preserve the existing `OPENROUTER_MODEL` variable. Summary generation currently selects the model in application code.

## Live verification

Checks ran against the deployed Workers origin and `ruthva.com`. Authenticated tests used two isolated synthetic clinics and four synthetic users. Only synthetic clinical text was submitted to OpenRouter.

| Check | Observed result |
| --- | --- |
| Both public origins | Health endpoint and login page returned HTTP 200 |
| Authentication | Doctor, admin, therapist, and second-clinic credentials worked through the token API; authenticated requests also worked on `ruthva.com` |
| Browser sign-in | The built-in demo code flow opened the deployed home on `ruthva.com` |
| Saved clinical records | Patient history, visit, prescription procedure, and assigned contact were saved and read back |
| Live OpenRouter generation | Initial and refreshed summaries returned `source: ai` and `status: ready`; the changed allergy replaced the earlier allergy. The refreshed paragraph had 98 words |
| Automatic refresh after a browser edit | Saving health history regenerated the AI paragraph without a manual request. Reload retained the saved allergy. The paragraph had 91 words |
| Assistant workflow | Retry, question, doctor reply, completion, and four saved events persisted. Contact retries left the clinical return date unchanged |
| Permissions | Admin doctor replies and therapist contact access returned 403. A doctor from the other clinic received 404 for the patient, summary, and contact |
| Deployed screens | Four home areas, patient history editor, hidden empty details, consultation form, therapy list, and completed assistant contact rendered |
| Typography | Georgia headings and Trebuchet MS body text were confirmed from computed styles |
| Mobile contact screen | No horizontal overflow at a 390 by 844 viewport |
| Browser errors | The automated workflow reported no application page errors |
| Configuration | `npm run deploy:check` and `git diff --check` passed |

These checks supplement the integration, migration, prescription, type, lint, browser, and build checks recorded in [simple-clinic-verification.md](simple-clinic-verification.md). They do not test signup or real email delivery. Test users had email verification seeded before login. Live generation confirms connection and refresh behavior for the synthetic cases; the doctor must still check generated text against the saved record.

The four synthetic users and two synthetic clinics were deactivated after verification. Their records remain for audit, and test sessions were revoked. Existing patient records were not used for AI tests. The database foreign-key check returned no violations.

Ignored local artifacts are under `.audit/simple-clinic/`: `deployed-smoke-report.json`, `deployed-browser-report.json`, `deployed-home.png`, `deployed-patient-history.png`, and `deployed-contact-mobile.png`. Private fixture credentials remain excluded from Git.

## Follow-up date shortcuts

Frontend version `1f14dadd-733b-4f8b-8cdc-fa8c06459f7a` was deployed on 10 October 2026. The previous frontend version is `d877db38-a183-4012-9f7e-059f06b7755b`. The API version, database, secrets, custom domain, and private API service binding are unchanged.

The prescription create and edit forms offer **7 days**, **14 days**, **30 days**, and **45 days**, plus **Pick a date**. Shortcuts use the recorded visit date. The form shows the calculated return date and the visit date used for the shortcut. No return date is selected by default. Saved custom dates remain unchanged when editing. **Clear date** removes the date without removing follow-up notes. Use **Save**, **Save & Print**, or **Update Prescription** to persist the choice.

Frontend type and lint checks passed. Three synthetic browser tests passed: home navigation, complete new-patient visit, and follow-up dates. The date test covers all four intervals, month changes, leap year, daylight-saving time, save/readback, edit preservation, manual selection, and clearing. Desktop and 390-pixel mobile checks confirmed the selected date, calendar, and wrapping. Mobile shortcut buttons are 48 pixels tall; no horizontal overflow was observed. No real patient prescription was changed during verification.

The live prescription form showed all four shortcuts and the manual picker. Health and login endpoints returned HTTP 200 on both public origins. The production build contained no local test API URLs. Screenshots and smoke results are saved under the ignored `.audit/follow-up-date/` directory.

## Recovery

The previous Worker version IDs are recorded above and in the ignored pre-release audit file. Restore those Worker versions if application rollback becomes necessary. Do not reverse D1 migrations as part of a Worker rollback. Keep the `ruthva.com` domain and private API service binding in place.

Poteto principles used: **Model the Domain** kept contact reminders separate from clinical return dates; **Prove It Works** required live API and browser checks; **Sequence Work into Verifiable Units** released the API before the frontend.
