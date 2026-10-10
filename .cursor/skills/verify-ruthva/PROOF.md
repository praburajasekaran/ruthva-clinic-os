# Initial verification skill proof

This record covers the skill's initial creation. Later maintenance results belong in ignored `.audit/verify-ruthva/` run notes.

The generated skill completed launch, doctor, a real mapped browser feature, evidence capture, and cleanup. No application source changed. Work is on `prabu/verification-skill`.

## Completed run

Run ID: `delivery-20261005`. Source revision: `40cc29247cb88a77f3396183192a86d54f3dd306`. App source SHA-256: `721e5edff67eb879f31dd3d04504bd69a76a2c5b99d4b71f8ad812cf779aaebc`.

The final helper built the API into an isolated scratch bundle, applied five D1 schema migrations, and started Next.js and Miniflare/workerd. Doctor verified the server command, source hash, both listener process groups, API health identity, login HTML, and HTTP 401 for an unauthenticated patient request.

| Map entry | Observed result | Artifact in `.audit/verify-ruthva/delivery-20261005/` |
| --- | --- | --- |
| `account-demo`, Try Demo button | The UI displayed the demo code and accepted it through Verify. The dashboard opened in Dhanvantari Demo Clinic. | `account-demo-before.*`, `account-demo-code.*`, `account-demo-button-ayurveda.*` |
| `account-demo`, Siddha switch | The visible desktop selector changed to Siddha and the clinic became Sivanethram Demo Clinic. | `account-demo-discipline-siddha.*` |
| `account-demo`, Homeopathy switch | The selector changed to Homeopathy and the clinic became Hahnemann Demo Clinic. | `account-demo-discipline-homeopathy.*` |
| Auth storage side effects | Before: no clinics/users. After: three demo clinics and one demo user assigned to the selected Homeopathy clinic. No clinical records were created. | `demo-before.json`, `demo-after.json` |
| `account-logout`, protected route | Sign out followed by opening `/patients` returned to `/login`. | `account-logout-protected-route.*` |
| Browser errors | The `errors` command returned no page errors. | `actions.jsonl` |
| Cleanup | The recorded browser session and server process group stopped. Both ports stopped answering. Scratch state was removed; proof artifacts remained. Cleanup was repeated successfully. | `instance.json`, retained ARIA/PNG/URL files |

Each screenshot has a corresponding accessibility snapshot and URL file. `actions.jsonl` records the action and its result, including failures. `doctor.json`, `build.log`, and `server.log` record startup. Local evidence is ignored by Git; it remains on this checkout after cleanup.

## Supporting observations

- `.audit/verify-ruthva/handoff-20261004/` captures real signup and onboarding through a locally captured SES OTP. `account-onboarding-data.json` shows the verified owner and saved normal clinic. The signup request exercised the SES boundary without external delivery.
- `.audit/verify-ruthva/proof-final-20261004/` captures patient creation through the empty-state Register Patient button. `patients-before.json` has no patients; `patients-after.json` has one `Verification Patient`, record `PAT-2026-0001`, age 35, female, phone `9000000001`, in the saved clinic. `patients-create-after.*` shows the saved record in the browser.
- `proof-final-20261004` and `isolation-final-20261004` ran simultaneously with different ports, scratch directories, and browser sessions. The latter's `isolation-before.json` remained empty while the former had a normal clinic and patient. Both were cleaned up.

Those supporting runs were not complete feature-map passes. An initial storage observation failed because Miniflare 5 ignores the old `d1Persist`/`r2Persist` options. The helper now uses `resourcePersistencePath` and `isolatedResourcePersistencePath`; subsequent read-only SQLite observations pass. Unscoped sidebar waits also matched the hidden mobile copy. The final recipe scopes demo selectors to the desktop sidebar, bounds browser actions to 30 seconds, and uses route waits plus fresh snapshots. Each failed iteration was cleaned up; earlier evidence was retained.

## Coverage limits

Normal OTP login, the demo email entry, patient search/edit/archive/cancel, consultations, prescriptions, pharmacy, populated follow-up queues, and treatment block/session editing were not executed in the final run. Their recipes remain unverified until driven for a relevant change.

Treatment plan creation has no connected browser entry in this checkout. CodeGraph reports no importer/caller for `TreatmentPlanCreateForm`, and prescription detail has no create/view plan link. The map records that path as unreachable instead of claiming browser proof.

No real SES inbox delivery, Browser Rendering PDF, Cloudflare frontend/API service binding, scheduled reminders, Ruthva integrations, or GitHub delivery was verified. The local API captures SES at its existing HTTP boundary and blocks other outbound calls.

The helper passed `rtk node --check`, all five feature files have the required four H2 sections, local documentation links resolve, and the helper is executable. Existing application tests were not repeated because this change adds only verification instructions and their local harness.
