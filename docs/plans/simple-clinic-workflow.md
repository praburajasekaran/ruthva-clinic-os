# Simple clinic workflow

Build the accepted prototype experience in the deployed Next.js and Worker app. Keep the prototype checkout intact. Base this branch on origin/main at ff34141.

## Done predicate

A synthetic doctor can find a patient, save history, see an updated summary, complete the existing consultation and dispensing flow, and assign a persistent contact follow-up. Clinic admin staff can record contact attempts and ask the doctor a question. Reloads preserve saved work. Other clinics and therapists cannot access contact tasks. Existing practice examination and treatment workflows still pass their checks. Deliver the branch and a reviewable PR without merging or deploying.

## Designs considered

| Design | Effect | Decision |
| --- | --- | --- |
| Replace production with the prototype server | Quick visual parity, but replaces authentication, persistence, and clinical workflow contracts | Reject |
| Add patient and contact resources to the Worker, reuse production consultation and therapy routes | Preserves clinical fields, D1 records, and access rules while changing navigation | Choose |
| Store contact attempts inside prescription notes | Fewer tables, but mixes assistant activity with clinical advice and cannot enforce task ownership | Reject |

## Domain

Patient review statuses distinguish unknown, recorded findings, and explicit negatives. Current medicines are independently recorded; prescriptions do not establish current use. A summary reads only saved facts for one clinic-scoped patient. Cache entries carry a hash of those facts and the prompt version. The browser rejects responses for superseded inputs.

A contact task has a patient, clinical return date (context only), contact date, assigned staff member, state, revision, and append-only attempts. States are open, awaiting_doctor, and completed. Admin staff can record outcomes and questions. Doctors can answer questions. Revision checks reject stale writes. Use existing admin staff as assistants; do not add a role or expand existing clinic permissions.

## Steps

1. `how` over the affected subsystem.
2. `architect` for parallel design exploration.
   Sequential comparison above follows the project's explicit no-delegation instruction.
3. Write the throughput checkpoint as four todo items.
   - Blocking first steps. Confirm production contracts, bootstrap CodeGraph, establish an isolated fixture, and install dependencies.
   - Independent workstreams. API and UI reads can run together. Implementation and verification run sequentially under project instructions.
   - Shared mutable state. One owner edits this dedicated checkout. D1 tasks use revisions and atomic batches.
   - Smallest safe decomposition. Patient record, home, and contact workflow each end in their own verification and commit.
4. Delegate code-writing to a subagent using your configured feature model.
   Skip. Project instructions require implementation in the main thread. Separate implementation from the final diff review.
5. Verify on the matching surface.
6. Rebase into small, ordered commits. Stack follow-ups.
7. If the design is contested, `interrogate` before shipping.
   No contested design remains. No independent model verdict will be claimed.
8. Run Opening a PR.

## Ordered units

1. Patient storage, summary endpoint, tabs, inline history and missing-detail prompts. Verify migration, saved-fact payloads, errors, clinic isolation, and editing through the real UI.
2. Visit first home with four main cards, patient search, due work, and existing visit completion. Verify route access and complete a visit with dispensing.
3. Persistent contact workflow with assignment, attempt outcomes, retry date, and doctor question/response. Verify revisions, allowed transitions, roles, reloads, and clinic isolation.

## Evidence and limits

Use synthetic fixtures. Test summaries with a mocked provider and a small synthetic live check. Never print or commit provider credentials. Production needs the OPENROUTER_API_KEY Worker secret before live summaries work. A saved-fact fallback remains available without it. Browser proof uses CUA. Automated regression tests use Playwright and Miniflare.

The installed skill directories do not contain deslop or control-ui. Use direct diff review and CUA verification. Do not claim those skills ran. Deployment and merge require a later user instruction.
