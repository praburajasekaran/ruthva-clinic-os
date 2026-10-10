---
name: verify-ruthva
description: Drive the Ruthva Clinic OS web UI with agent-browser and an isolated Next.js/Miniflare instance. Use to verify login, patients, consultations, prescriptions, treatment follow-ups, or pharmacy changes with browser and D1 evidence.
---

# Verify Ruthva Clinic OS

Read [features/README.md](features/README.md), then the matching feature recipe. The primary surface is the Next.js web UI. The Hono HTTP API is a second observation surface. Django in `backend/` is a migration reference, not the local runtime.

Run commands from the repository root. Never drive an existing user browser or the deployed clinic for this skill. Use synthetic patients and `clinic.test` email addresses.

## Launch

Prerequisites: Node.js 22 (`.nvmrc`), npm, Python 3.10+, `rtk`, agent-browser, and POSIX `ps`/`lsof`. Install the checkout's locked packages with the same Node architecture:

```sh
rtk npm ci
rtk npm --prefix frontend ci
rtk npm --prefix worker ci
rtk agent-browser --version
```

Version 0.9.1 was exercised for this skill. If agent-browser is absent, install it with `rtk npm install -g agent-browser@0.9.1`. Install its matching Chromium with:

```sh
rtk npx --yes playwright@1.58.1 install chromium
```

For agent-browser 0.9.1, `agent-browser install` can download a newer Playwright browser revision while the installed runtime still expects revision 1208. The pinned command above was exercised after that executable-missing failure. If using a different agent-browser version, match its installed Playwright runtime before downloading a browser.

```sh
RUTHVA_CONTROL=.cursor/skills/verify-ruthva/scripts/control.mjs
RUTHVA_RUN="verify-$(rtk proxy date -u +%Y%m%d-%H%M%S)"
ruthva_browser() { rtk node "$RUTHVA_CONTROL" browser "$RUTHVA_RUN" "$@"; }
ruthva_capture() { rtk node "$RUTHVA_CONTROL" capture "$RUTHVA_RUN" "$@"; }
ruthva_inbox() { rtk node "$RUTHVA_CONTROL" inbox "$RUTHVA_RUN" "$@"; }
ruthva_data() { rtk node "$RUTHVA_CONTROL" data "$RUTHVA_RUN" "$@"; }
rtk node "$RUTHVA_CONTROL" launch "$RUTHVA_RUN"
rtk node "$RUTHVA_CONTROL" doctor "$RUTHVA_RUN"
```

For clinic activation checks, replace the launch command above with:

```sh
rtk node "$RUTHVA_CONTROL" launch "$RUTHVA_RUN" --admin-email verification-admin@clinic.test
```

The optional address must be a lowercase synthetic `clinic.test` email. The helper sets `RUTHVA_ADMIN_EMAIL` only in this run's API. The account must still register and verify its OTP through the UI. Default launches have no admin entitlement. Use a separate normal clinic owner for activation checks, as described in [account access](features/account-access.md).

`launch` reports two automatically allocated localhost ports, the browser session, process ID, source hash, revision, and scratch directory. A successful launch writes `doctor.json` and requires the real API health response, login HTML, and an unauthenticated patient response of HTTP 401. `server.log` contains `Verification D1 migrations applied.` and Next.js `Ready`.

The feature map uses these shell functions as exact commands. In a fresh shell, set `RUTHVA_RUN` to the existing run ID and define the same functions; do not launch again just to restore shell variables.

The repo's usual development command is `rtk npm run dev` (UI 3000, API 8797, inspector 9297). This helper uses the same Next.js app and Wrangler-built API, but isolates them. It copies frontend sources and the API bundle into scratch space, runs the API in Miniflare/workerd, and applies the schema statements from all five migrations using the existing runtime test recipe. D1, R2, Next.js caches, ports, secrets, and the browser session belong to this run. No existing `.env`, `.dev.vars`, or local database is copied. Two launched runs can coexist; a port collision fails launch instead of selecting another application's server. Launch a fresh run after changing app sources.

The local SES boundary captures email bodies in the scratch inbox and returns a test receipt. It uses placeholder AWS credentials and blocks every other outbound API request. This follows `worker/tests/runtime.test.mjs`; it does not bypass the application's OTP checks. `TEST_EMAIL=capture` alone skips sending and does **not** expose the code, so this harness does not use it. Browser Rendering, real SES delivery, Ruthva SSO/journeys, and GitHub delivery require separate remote verification. The frontend print view works here.

The starting database is empty. Demo login creates three empty, read-only demo clinics through the real request-OTP route. For writes, create and onboard a normal clinic through the [account recipe](features/account-access.md). No clinical fixtures are inserted by the helper.

Teardown, including after a failed drive:

```sh
rtk node "$RUTHVA_CONTROL" cleanup "$RUTHVA_RUN"
```

## Doctor

Run this read-only check first if navigation, authentication, or data looks wrong:

```sh
rtk node "$RUTHVA_CONTROL" doctor "$RUTHVA_RUN"
```

It checks the recorded server command and PID, both port listeners' membership in that server's process group, app source hash, API identity, login HTML, and the HTTP 401 authentication boundary. It prints the recorded origins, listener PIDs, and revision. It does not sign in, seed rows, or repair state. For an authenticated drive, also run `ruthva_browser snapshot` and confirm the expected clinic and sidebar. A login redirect means the browser session is no longer authenticated; complete the login recipe. A missing daemon, changed hash, or failed readiness check requires cleanup and a new run ID.

## Drive

Use the helper's isolated agent-browser session. Every browser action runs doctor first and is logged with its result. Root-relative `open` routes resolve to this run's web origin. External origins are rejected by `open`.

```sh
rtk node "$RUTHVA_CONTROL" browser "$RUTHVA_RUN" open /login
rtk node "$RUTHVA_CONTROL" browser "$RUTHVA_RUN" snapshot -i
rtk node "$RUTHVA_CONTROL" browser "$RUTHVA_RUN" find label Email fill demo@ruthva.com
rtk node "$RUTHVA_CONTROL" browser "$RUTHVA_RUN" find role button click --name "Send login code"
rtk node "$RUTHVA_CONTROL" browser "$RUTHVA_RUN" wait '#code'
rtk node "$RUTHVA_CONTROL" browser "$RUTHVA_RUN" find label "Verification code" fill 123456
rtk node "$RUTHVA_CONTROL" browser "$RUTHVA_RUN" find role button click --name Verify
rtk node "$RUTHVA_CONTROL" browser "$RUTHVA_RUN" wait --url '**/dashboard'
rtk node "$RUTHVA_CONTROL" capture "$RUTHVA_RUN" account-demo-login
```

Prefer accessible names, the real input IDs, and placeholders listed in the map. Re-snapshot after DOM changes and after `capture`, which replaces refs with a full snapshot. If a legacy form has an unattached label, use a fresh snapshot ref for that field; refs are local to the current snapshot. Do not reuse example refs, coordinates, or tab positions. Name matching is partial in agent-browser 0.9.1: `--name Save` also matches `Save & Print`. Use the current Save button ref. Use a full `snapshot` for clickable catalog and prescription table cells that `snapshot -i` omits. Wait for actual routes, selectors, or text; never treat a successful click as proof of a saved record. Wait for the save transition before reloading, or reopen the record through its list. Each browser action has a 30-second limit. Hidden mobile/sidebar copies can make a text wait ambiguous; inspect a snapshot and target the visible page control instead.

Date fields open a `Choose a date` dialog. Take a fresh snapshot and use the `Choose the Year` and `Choose the Month` combobox refs with `ruthva_browser select`. Year values are full years; month values run from `0` for January to `11` for December. Re-snapshot after changing the displayed month or year, then click the day button by its full accessible name or current ref. Selecting a day updates the field and closes the dialog immediately. There is no separate Apply or Today control; today's day button starts with `Today,`. Escape closes the dialog without selecting a date. Confirm the resulting field value, then save the enclosing form and compare its date with D1. The patient's Date of Birth calendar disables future dates.

After a failed action, run doctor again. Inspect the visible state and remove any failed draft through the UI, or reset to a known route. Keep a healthy shared instance for dependent recipes. If the browser remains wedged or the instance is no longer useful, clean up before relaunching.

For a normal account, request its email through the UI, then inspect only that recipient's local inbox:

```sh
rtk node "$RUTHVA_CONTROL" inbox "$RUTHVA_RUN" doctor@clinic.test
```

Type the returned six-digit code into the real verification form. The inbox command cannot create a message or an OTP. Do not inject tokens, change localStorage, set component state, or use direct SQL writes to produce a result.

## Evidence

Artifacts live in `.audit/verify-ruthva/$RUTHVA_RUN/` and are ignored by Git. Name each capture with its feature ID and entry point. Capture the initial state, drive the action, then capture the resulting state:

```sh
rtk node "$RUTHVA_CONTROL" capture "$RUTHVA_RUN" patients-create-before
# Execute the patient's real UI recipe.
rtk node "$RUTHVA_CONTROL" capture "$RUTHVA_RUN" patients-create-after
rtk node "$RUTHVA_CONTROL" data "$RUTHVA_RUN"
rtk node "$RUTHVA_CONTROL" browser "$RUTHVA_RUN" errors
```

`capture` saves the full accessibility snapshot, full-page PNG, and URL. `actions.jsonl` records commands, timestamps, output, and failures. `data` opens the isolated SQLite D1 file in read-only mode and saves `data.json`: clinic, user (without passwords), patient, consultation, prescription, medication, dispensing, stock, and treatment rows. An optional final label selects a separate filename: `ruthva_data patients-before` saves `patients-before.json`. Reopen or reload the saved record in the UI and compare it with this independent storage observation. Capture `data` before a no-op, cancellation, or rejected write as well as afterward.

Proof must exercise the real user path. Pair the action with both visible state and persisted side effects; a screenshot alone is insufficient. The only mock is the existing SES HTTP boundary. `outbound.jsonl` records captured and blocked external requests. Check it when proving email actions: a captured SES request proves the local boundary was exercised; it does not prove delivery to an inbox. Raw email bodies are scratch state and disappear at cleanup. No Browser Rendering binding or scheduled trigger is supplied. Do not claim a print-page screenshot verifies server PDF generation.

Report each map entry as passed, failed, or skipped with the unmet precondition. A convenient direct URL does not verify a sidebar, empty-state button, or keyboard entry. [PROOF.md](PROOF.md) records the initial creation coverage and limits. Save later maintenance results and unmet prerequisites in ignored `.audit/verify-ruthva/` run notes; do not commit those notes. A successful route or persisted row does not make a missing rendered field pass.

## Cleanup

```sh
rtk node "$RUTHVA_CONTROL" cleanup "$RUTHVA_RUN"
rtk ls ".audit/verify-ruthva/$RUTHVA_RUN"
```

Cleanup closes only the browser session recorded in the run manifest, signals the recorded server process group after checking its command, checks that both ports stopped answering, and removes only its generated `ruthva-verify-*` scratch directory. Browser session names include a repository-path hash and run ID, so worktrees cannot share them accidentally. Cleanup retains screenshots, snapshots, actions, storage observations, logs, and the manifest with `cleanedAt`. It is idempotent. Never kill by process name or clear another run's browser/database. If cleanup fails, inspect the recorded PID and log; keep scratch state until the owned instance is stopped.

After **every** failed iteration, run cleanup before launching another. Reusing a run ID is rejected so earlier evidence cannot be overwritten by a new instance.

## Helpers

The executable [scripts/control.mjs](scripts/control.mjs) supports these exact invocations:

| Command | Purpose |
| --- | --- |
| `rtk node "$RUTHVA_CONTROL" launch "$RUTHVA_RUN"` | Build an isolated API bundle and start the app. |
| `rtk node "$RUTHVA_CONTROL" launch "$RUTHVA_RUN" --admin-email verification-admin@clinic.test` | Start with a synthetic platform-admin email configuration. |
| `rtk node "$RUTHVA_CONTROL" doctor "$RUTHVA_RUN"` | Read-only ownership, source, readiness, and auth check. |
| `rtk node "$RUTHVA_CONTROL" browser "$RUTHVA_RUN" snapshot -i` | Run agent-browser and record the action. |
| `rtk node "$RUTHVA_CONTROL" capture "$RUTHVA_RUN" patients-search-list` | Save ARIA, PNG, and URL proof. |
| `rtk node "$RUTHVA_CONTROL" inbox "$RUTHVA_RUN" doctor@clinic.test` | Read a captured local OTP email. |
| `rtk node "$RUTHVA_CONTROL" data "$RUTHVA_RUN"` | Save read-only D1 observations. |
| `rtk node "$RUTHVA_CONTROL" cleanup "$RUTHVA_RUN"` | Stop owned instances and scratch state; retain evidence. |

Use `/maintain-verification-skill` when app routes, controls, launch steps, or proof requirements change.
