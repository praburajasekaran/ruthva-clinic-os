# Treatment Block Workflow -- User Flow Analysis Report

**Date:** 2026-03-01
**Scope:** Spec completeness, edge cases, state machine gaps, permission boundaries, data integrity, UX gaps
**Codebase examined:** backend/treatments/, backend/config/views.py, frontend follow-ups page, types, sidebar, permissions

---

## 1. User Flow Overview

### Flow A: Doctor Creates Treatment Plan (Happy Path)
1. Doctor opens patient consultation
2. Doctor navigates to prescription (existing flow)
3. Doctor initiates treatment plan creation (POST /treatments/plans/)
4. Doctor defines total_days, first block with hybrid entries
5. Plan saved, status = "active", first block = "planned"
6. Sessions appear in Therapist Worklist tab

### Flow B: Therapist Executes Sessions (Happy Path)
1. Therapist logs in, sees Follow-ups in sidebar with badge count
2. Therapist opens Follow-ups page, lands on "Therapist Worklist" tab
3. Sees today's pending sessions across all patients
4. For each session: selects done/not_done, response score 1-5, notes, optional review request
5. Submits feedback (POST /treatments/sessions/{id}/feedback/)
6. Session status updates, block transitions to "in_progress" on first feedback

### Flow C: Block Completion Triggers Doctor Action
1. Therapist submits feedback for last pending session in block
2. Atomic transaction: block -> "completed", replan_required = true, DoctorActionTask created
3. Doctor opens Follow-ups page, lands on "Doctor Actions" tab
4. Sees open "block_completed" task with patient context and timeline
5. Doctor fills next block form (start/end day, start date, procedure, medium, instructions)
6. Submits (POST /treatments/plans/{id}/blocks/)
7. New block created, open block_completed tasks resolved

### Flow D: Therapist Requests Doctor Review (Mid-Block)
1. During session feedback, therapist checks "Request doctor review"
2. DoctorActionTask created with task_type = "review_requested"
3. Doctor sees it in Doctor Actions tab
4. **GAP: No explicit resolution mechanism for review_requested tasks (see Gap #1)**

### Flow E: Doctor Revises Plan
1. Doctor can modify entries for upcoming days (spec says this)
2. **GAP: No update/edit endpoint exists for sessions or blocks (see Gap #2)**

---

## 2. Flow Permutations Matrix

| Dimension | Variation | Coverage Status |
|---|---|---|
| **User role** | Doctor | Covered: create plan, add block, view doctor actions |
| | Therapist | Covered: view worklist, submit feedback |
| | Admin/Clinic Owner | Partial: can see "All Queues" tab, but no admin-specific actions defined |
| | Unauthorized role | Covered: 403 on write, empty results on read |
| **User state** | First-time (no plans exist) | Covered: empty states per tab |
| | Has active plans | Covered: worklist and action items render |
| | Multiple concurrent patients | Covered: all patients shown in worklist |
| **Entry point** | Dashboard card | Covered: "Follow-ups Due" card links to /follow-ups |
| | Sidebar nav | Covered: badge count shown |
| | From consultation/prescription | **GAP: No "Create Treatment Plan" button in consultation or prescription UI (see Gap #3)** |
| **Device** | Desktop | Covered: grid layouts with md:grid-cols |
| | Mobile | Partial: responsive Sidebar, but form layouts may be cramped (see UX Gap #1) |
| **Network** | Normal | Covered |
| | Slow/failed | Partial: generic error messages, no retry button, no optimistic updates |
| **Block lifecycle** | First block | Covered |
| | Subsequent blocks | Covered |
| | Final block (plan total_days reached) | **GAP: No treatment plan completion flow (see Gap #4)** |

---

## 3. State Machine Analysis

### 3.1 TreatmentPlan States: draft -> active -> completed

**Issues identified:**

- **SM-1: "draft" status is defined but never used.** `TreatmentPlanCreateSerializer.create()` always sets status to "active". There is no workflow to create a draft plan. The draft state is dead code unless future use is planned.

- **SM-2: No transition to "completed".** There is no code path that sets `TreatmentPlan.status = "completed"`. When the final block of a plan is completed and all total_days are covered, the plan should transition to "completed". Currently it stays "active" forever.

- **SM-3: No cancelled/paused state.** If a patient discontinues treatment mid-plan (common in 15-21 day plans), there is no way to cancel or pause a treatment plan. The plan stays "active" and sessions remain "planned" indefinitely, polluting the therapist worklist.

### 3.2 TreatmentBlock States: planned -> in_progress -> completed

**Issues identified:**

- **SM-4: Block transitions from "planned" to "in_progress" only on first feedback submission.** But if a block has sessions spanning future dates and a therapist submits feedback for a session, the block moves to "in_progress" correctly. This is sound.

- **SM-5: A block can technically go from "planned" directly to "completed"** if a single-session block receives feedback. The intermediate "in_progress" state is set before the completion check, so this works correctly due to the ordering in `create_feedback()`. Verified as correct.

- **SM-6: No "skipped" or "cancelled" block status.** If a doctor decides to skip remaining sessions in a block and move to the next block, there is no mechanism for this.

### 3.3 TreatmentSession States: planned -> done | not_done

**Issues identified:**

- **SM-7: "not_done" is a terminal state with no recovery path.** If a therapist marks a session as "not_done", it is excluded from "pending" checks (`execution_status != EXECUTION_PLANNED`). This means marking a session "not_done" counts toward block completion. This is by design per the spec, but there is no way to reschedule or retry a "not_done" session.

- **SM-8: Feedback can be overwritten.** `SessionFeedbackSerializer.create_feedback()` uses `update_or_create`, meaning a therapist can submit feedback for the same session multiple times. The second submission overwrites the first. This has implications:
  - A session already marked "done" could be changed to "not_done" (or vice versa)
  - Block completion status is NOT re-evaluated on update -- once a block is marked "completed", overwriting a session feedback does not revert the block
  - This creates a data integrity risk where block.status = "completed" but one of its sessions is now "not_done" with no replan trigger

### 3.4 DoctorActionTask States: open -> resolved

**Issues identified:**

- **SM-9: Only "block_completed" tasks get auto-resolved.** When a doctor adds a next block, the serializer resolves all open `block_completed` tasks for that plan. But `review_requested` tasks have NO resolution mechanism -- there is no API endpoint or UI action to resolve them. They remain open indefinitely.

- **SM-10: Doctor action task resolution is plan-wide, not block-specific.** `TreatmentBlockCreateSerializer.create_block()` resolves ALL open `block_completed` tasks for the entire plan, not just the specific block. If two blocks both have open tasks (theoretically impossible due to unique constraint, but worth noting), both would be resolved.

---

## 4. Missing User Flows

### Gap #1: No Resolution Path for "review_requested" Doctor Action Tasks

**Severity: CRITICAL**

When a therapist requests a doctor review, a `DoctorActionTask(task_type="review_requested")` is created. The doctor sees this in the Doctor Actions tab. However:
- There is no "Resolve" or "Acknowledge" button in the UI for review_requested tasks
- There is no API endpoint to resolve a doctor action task independently
- The only resolution happens implicitly when a new block is created, and even then only for `block_completed` tasks
- The unique constraint prevents a second `review_requested` task per block, so if one is already open, additional review requests from the therapist are silently ignored

**Impact:** Review-requested tasks will accumulate forever in the doctor's queue, creating noise and eventually making the Doctor Actions tab unusable.

**Recommendation:** Add a `POST /treatments/doctor-tasks/{id}/resolve/` endpoint that allows doctors to mark any task as resolved, and add a "Mark Reviewed" button in the UI for review_requested tasks.

### Gap #2: No Edit/Update Endpoint for Treatment Sessions or Blocks

**Severity: IMPORTANT**

The spec states: "Doctor can modify entries for upcoming (not yet executed) days." However:
- There is no PATCH/PUT endpoint for TreatmentSession
- There is no PATCH/PUT endpoint for TreatmentBlock
- The frontend has no edit UI for existing block/session content
- The only way to "revise" is to create a new block

**Impact:** If a doctor prescribes the wrong oil or procedure for an upcoming session, there is no way to correct it without deleting the block (which also has no endpoint) and recreating it.

**Recommendation:** Add `PATCH /treatments/sessions/{id}/` (doctor-only, planned sessions only) and potentially `PATCH /treatments/plans/{id}/blocks/{block_id}/` for block-level edits.

### Gap #3: No Entry Point to Create Treatment Plan from Consultation/Prescription UI

**Severity: IMPORTANT**

The spec says "From a patient consultation, doctor initiates a treatment plan." However:
- The consultation detail page (`/consultations/[id]/page.tsx`) has no "Create Treatment Plan" button
- The prescription detail/edit pages have no treatment plan initiation
- The only way to create a plan is via direct API call
- The follow-ups page has no "New Treatment Plan" button either

**Impact:** Doctors have no UI path to create a treatment plan. The feature is backend-complete but frontend-incomplete for the initiation flow.

**Recommendation:** Add a "Start Treatment Plan" CTA on the prescription detail page that opens a plan creation form.

### Gap #4: No Treatment Plan Completion Flow

**Severity: IMPORTANT**

When the final block of a treatment plan completes (covering all `total_days`):
- The plan status remains "active" -- it never transitions to "completed"
- A `block_completed` doctor action task is created, prompting the doctor to "Create Next Block"
- But the doctor CANNOT create a next block because the serializer validates `end_day_number <= total_days`
- The doctor action task becomes permanently unresolvable through the normal flow

**Impact:** The doctor sees a perpetual open task they cannot act on. The plan never formally closes.

**Recommendation:**
1. When the final block completes and `block.end_day_number >= plan.total_days`, auto-transition plan to "completed" instead of creating a block_completed task (or create a different task type like "plan_completed")
2. Add a "Mark Plan Complete" action for the doctor
3. Add a "Extend Plan" option that increases `total_days`

### Gap #5: No "Extend Plan Duration" API

**Severity: IMPORTANT**

The spec says "Can extend or shorten overall plan duration." However:
- There is no PATCH endpoint for TreatmentPlan to update `total_days`
- The block creation serializer enforces `end_day_number <= total_days`, so extending requires changing total_days first

**Impact:** Doctor cannot extend a 15-day plan to 21 days mid-treatment.

**Recommendation:** Add `PATCH /treatments/plans/{id}/` with updatable fields: `total_days`, `status`.

### Gap #6: No Treatment Plan List/Search for Doctors

**Severity: IMPORTANT**

- There is a `retrieve` action on TreatmentPlanViewSet but no `list` action
- A doctor cannot see all active treatment plans across patients
- There is no way to find a specific patient's treatment plan except through the follow-ups queue

**Impact:** Doctor cannot review historical plans or check on plans that have no pending actions.

**Recommendation:** Add `GET /treatments/plans/` with filtering by status, patient, date range.

### Gap #7: No Therapist Assignment Model

**Severity: MODERATE**

The worklist shows ALL pending sessions to ALL therapists in the clinic. There is no assignment of:
- Specific therapists to specific patients
- Specific therapists to specific treatment plans
- Specific therapists to specific sessions

**Impact:** In clinics with multiple therapists, every therapist sees every patient's sessions. This creates confusion about responsibility and enables accidental double-execution.

**Recommendation:** Consider adding an optional `assigned_therapist` FK on TreatmentSession or TreatmentPlan, and filter the worklist accordingly. For MVP, this may be acceptable if clinics are small.

---

## 5. Edge Cases

### EC-1: Concurrent Feedback on Last Two Sessions
Two therapists simultaneously submit feedback for the last two pending sessions in a block. Both check `pending_exists` -- the race condition could result in:
- Two attempts to create a `block_completed` DoctorActionTask
- **Mitigated** by the unique constraint `uniq_open_doctor_task_per_block_type` and `get_or_create` pattern
- **Mitigated** by `transaction.atomic()` wrapper
- **Verdict:** Safe due to DB-level constraints.

### EC-2: Feedback Submitted for a Session in a "completed" Block
After all sessions are marked, the block is "completed". If a therapist re-submits feedback for a session in that block (possible because `update_or_create` allows it):
- The session's `execution_status` could flip from "done" to "not_done"
- The block remains "completed" (no re-evaluation)
- The `block_completed` task may already be resolved
- **Data inconsistency:** block is "completed" but has a "not_done" session
- **Recommendation:** Reject feedback submissions for sessions in completed blocks, or add a guard: `if block.status == "completed": raise ValidationError("Block already completed")`

### EC-3: Doctor Creates Block with Gap in Day Numbers
Doctor creates Block 1 (Days 1-5) then Block 2 (Days 8-10), skipping Days 6-7.
- The serializer validates non-overlap but does NOT enforce contiguity
- Those skipped days will never appear in any worklist
- They count toward `total_days` but are never executed
- **Impact:** Silent data gap. The plan may never reach "all days covered" if gaps exist.
- **Recommendation:** Either enforce contiguity or explicitly allow gaps with documentation.

### EC-4: Block Created with start_date in the Past
The serializer accepts any `start_date` without checking if it's in the past.
- Sessions would be created with past `session_date` values
- They would immediately appear in the therapist worklist (since `session_date <= today`)
- **Recommendation:** Warn (not block) if start_date is before today.

### EC-5: Multiple Treatment Plans for the Same Prescription
Nothing prevents creating multiple TreatmentPlans for the same Prescription.
- `TreatmentPlan` has `prescription` as a regular FK, not a OneToOne
- Two active plans for the same patient/prescription would double the sessions in the therapist worklist
- **Recommendation:** Add a unique constraint: `unique_together = (prescription, status)` where status = "active", or validate in the serializer.

### EC-6: Prescription Deleted While Treatment Plan is Active
`TreatmentPlan.prescription` uses `on_delete=models.CASCADE`.
- If a prescription is deleted, the entire treatment plan, all blocks, sessions, feedback, and doctor tasks are cascade-deleted
- This is a catastrophic data loss scenario
- **Recommendation:** Change to `on_delete=models.PROTECT` to prevent deletion while treatment plans exist, or at minimum `on_delete=models.SET_NULL` with `null=True`.

### EC-7: Doctor Who Created the Plan Leaves the Clinic
`DoctorActionTask.assigned_doctor` uses `on_delete=models.SET_NULL`.
- If the assigned doctor is removed from the clinic, the task becomes unassigned
- `_select_assigned_doctor` falls back to the first doctor by ID in the clinic
- But existing tasks with NULL assigned_doctor have no re-assignment logic
- **Impact:** Orphaned tasks visible to no specific doctor, only in admin's "all" view
- **Recommendation:** Add a background check or query filter that shows unassigned tasks to all doctors.

### EC-8: Single-Day Block (start_day_number == end_day_number)
Technically valid and works correctly. The block has exactly 1 session. When that session gets feedback, the block immediately transitions planned -> in_progress -> completed. A doctor action is created. This is a valid edge case that works correctly.

### EC-9: Very Large Block Spans (e.g., 100 days)
No limit on block size. A doctor could create a block spanning Days 1-100.
- `_expand_entries` would create 100 TreatmentSession records via `bulk_create`
- No pagination on the worklist means all 100 sessions load at once
- **Recommendation:** Add a reasonable max block size (e.g., 30 days) in serializer validation.

### EC-10: Therapist Submits Feedback with response_score Outside 1-5
Backend validates via `min_value=1, max_value=5` in serializer AND `MinValueValidator(1), MaxValueValidator(5)` on the model. Double-protected. Safe.

---

## 6. Permission Boundary Analysis

### PB-1: Feedback Endpoint Role Check is Hardcoded, Not Using Permission Class
In `TreatmentSessionViewSet.feedback()`, the check is:
```python
if request.user.role != "therapist":
    raise PermissionDenied("Only therapists can submit session feedback.")
```
This means:
- Doctors CANNOT submit feedback (correct per spec)
- Admins/Clinic Owners CANNOT submit feedback (is this intentional?)
- **Question:** Should clinic owners (who may also perform therapy) be able to submit feedback? The spec lists "Clinic Owner: all doctor permissions + team management" but says nothing about therapist permissions.

### PB-2: Doctor Tab Visibility vs. API Enforcement Mismatch
Frontend:
```typescript
const canSeeDoctor = user?.role === "doctor" || user?.role === "admin";
```
Backend (`follow_ups_list`):
```python
if role == "therapist":
    include_doctor = False
```
- Admin can see doctor items in both frontend and backend -- consistent.
- But "admin" role is checked in the view: `elif role != "admin": return 403`. The spec defines "Clinic Owner" (with `is_clinic_owner` flag) but the code checks for `role == "admin"`. These are different concepts. A doctor who is also the clinic owner has `role="doctor"` and `is_clinic_owner=True`. They would NOT match `role == "admin"`.
- **Question:** Is there an "admin" role in the UserRole enum? Yes, the frontend type has `"doctor" | "therapist" | "admin"`. But what is the relationship between "admin" role and "is_clinic_owner"? This is a potential confusion point.

### PB-3: Treatment Plan Read Access for Therapists
`TreatmentPlanViewSet` uses `IsDoctorOrReadOnly`. This means therapists can `GET /treatments/plans/{id}/` to view the full plan detail. This is appropriate for the feature but:
- There is no `list` action, so therapists cannot browse plans
- Therapists would need to know the plan ID to retrieve it
- The worklist items include `treatment_plan_id`, so a therapist could construct the URL
- **Not a security issue, but a UX gap:** therapists have no UI to view the full plan context.

### PB-4: Cross-Tenant Isolation Verified
- `TreatmentPlanViewSet.get_queryset()` filters by `request.clinic` -- safe
- `TreatmentSessionViewSet.get_queryset()` filters by `treatment_block__treatment_plan__clinic` -- safe
- `follow_ups_list` filters by `request.clinic` -- safe
- Test `test_cross_tenant_session_feedback_denied` verifies this -- covered
- **Verdict:** Tenant isolation is solid.

---

## 7. Data Integrity Concerns

### DI-1: Unique Constraint on (treatment_block, day_number) Prevents Multiple Procedures Per Day
The constraint `uniq_tsession_block_day` means only ONE session can exist per day per block. But in AYUSH treatments, a patient may have multiple procedures on the same day (e.g., Abhyanga in the morning, Vasti in the evening).

**Impact:** The current schema cannot model multi-procedure days. This is a significant functional limitation for real-world treatment plans.

**Recommendation:** Remove the unique constraint on `(treatment_block, day_number)` or add a `sequence_number` field to allow multiple sessions per day.

### DI-2: No Audit Trail for Feedback Overwrites
`update_or_create` silently overwrites previous feedback. There is no history table or version tracking. If a therapist changes "done" to "not_done" after the fact, the original entry is lost.

**Recommendation:** Either make SessionFeedback append-only (remove update_or_create, use create with a guard) or add a FeedbackHistory model.

### DI-3: Block date_end Calculation Assumes Contiguous Calendar Days
```python
end_date=start_date + timedelta(days=(end_day - start_day))
```
This assumes every day between start_date and end_date is a treatment day. If the clinic is closed on Sundays (common in India), the actual end_date should skip those days. Currently, session dates are calculated as:
```python
session_date=start_date + timedelta(days=offset)
```
Sessions would be assigned to Sundays/holidays when the clinic is closed.

**Recommendation:** For MVP, document this as a known limitation. For V2, accept a "working_days" calendar or let the doctor manually set each session's date.

### DI-4: No Foreign Key from TreatmentPlan to Patient (Direct)
The patient relationship is: `TreatmentPlan -> Prescription -> Consultation -> Patient`. This 3-hop join is used everywhere to display patient name/record_id. It works but:
- If the intermediate consultation or prescription chain is broken (soft delete, data migration), the patient context is lost
- Query performance on the follow-ups list requires 4-table joins
- **Minor concern for now, but consider a denormalized `patient` FK on TreatmentPlan for performance.**

### DI-5: response_score Semantics Undefined
The score is 1-5 but the meaning is not defined anywhere:
- Is 1 = no response, 5 = excellent response?
- Or is 1 = excellent, 5 = worst?
- The UI says "Response score 1" through "Response score 5" with no labels

**Impact:** Different therapists may interpret the scale differently, making the data meaningless for analysis.

**Recommendation:** Add descriptive labels (e.g., "1 - No response", "2 - Mild", "3 - Moderate", "4 - Good", "5 - Excellent").

---

## 8. UX Gaps

### UX-1: No Confirmation Before Feedback Submission
The therapist taps "Submit Feedback" and it fires immediately. There is no confirmation dialog. Given that feedback overwrites are possible and block completion is irreversible, this is risky.

### UX-2: Block Creation Form Only Supports a Single Uniform Entry
The frontend `submitNextBlock()` sends exactly ONE `day_range` entry for the entire block:
```typescript
entries: [{
  entry_type: "day_range",
  start_day_number: Number(draft.start_day_number),
  end_day_number: Number(draft.end_day_number),
  // ... single procedure
}]
```
The backend supports hybrid entries (multiple entries per block), but the UI only allows one procedure per block. The doctor cannot:
- Mix different procedures within a block
- Assign different oils for specific days
- Create single-day exceptions within a range

This contradicts the spec: "Doctor creates first block with hybrid entries."

**Impact:** The most distinctive feature of the spec (hybrid entries) is not available in the UI.

**Recommendation:** Redesign the block creation form to support multiple entries with an "Add Entry" button, choosing between single_day and day_range per entry.

### UX-3: No Previous Block Feedback Summary in Doctor Actions View
When a doctor sees a "block_completed" action, they need to review therapist feedback before planning the next block. The current UI shows:
- Patient name, record ID, block number
- Timeline context (day range, completed/pending counts)
- "Current block completed" label

But it does NOT show:
- Individual session feedback (scores, notes)
- Which sessions were done vs not_done
- Therapist review request notes
- Response score trends

**Impact:** Doctor must navigate away to find feedback data, defeating the purpose of the action-oriented queue.

**Recommendation:** Include a collapsible "Block Feedback Summary" section in each doctor action card showing per-session results.

### UX-4: No Patient Link from Follow-ups Items
The therapist and doctor cards show patient name and record_id but neither is a clickable link to the patient profile or consultation. The user cannot navigate to the patient's full context.

### UX-5: No Sorting/Filtering on Therapist Worklist
The worklist shows all pending sessions sorted by date. There is no ability to:
- Filter by patient
- Filter by today's sessions only
- Search within the worklist
- Sort by block number or procedure name

For clinics with multiple patients on concurrent treatment plans, this list will become unwieldy.

### UX-6: No Loading State per Card During Submission
During feedback submission, the `Button` shows `isLoading` state, but the entire form remains editable. A therapist could change values while the request is in flight.

### UX-7: Sidebar Badge Count Uses `tab=all` Which Triggers Role Filtering
The sidebar fetches `/dashboard/follow-ups/?tab=all` to get badge counts. For therapists, this returns therapist + legacy items but not doctor items (correct). For doctors, it returns only doctor items (because `role == "doctor"` excludes therapist and legacy). So the badge accurately reflects role-appropriate items. This is actually correct behavior, but the `tab=all` naming is misleading since it does not actually return "all" for non-admin roles.

### UX-8: Error Messages are Generic
Both submission functions show generic error strings:
- "Could not submit session feedback. Please try again."
- "Could not create the next treatment block. Check values and retry."

Validation errors from the backend (like "Duplicate session day(s) in block payload" or "Block cannot exceed total plan days") are not surfaced to the user.

**Recommendation:** Parse the API error response and show specific validation messages.

---

## 9. Critical Questions Requiring Clarification

### CRITICAL Priority

**Q1: How should "review_requested" doctor action tasks be resolved?**
Currently there is no resolution mechanism. Should the doctor:
(a) Have a "Mark Reviewed" button that resolves the task?
(b) Have the task auto-resolve when the next block is created?
(c) Be forced to add a note/response before resolving?
**Default assumption if unanswered:** Add a simple "Mark Reviewed" resolve action.

**Q2: Should a therapist be able to overwrite feedback for an already-completed block's session?**
Currently `update_or_create` allows this, creating data inconsistency. Should the system:
(a) Reject feedback updates once the block is completed?
(b) Allow updates but re-evaluate block status?
(c) Allow updates silently (current behavior)?
**Default assumption if unanswered:** Option (a) -- reject after block completion.

**Q3: What happens when the treatment plan's total_days are fully covered by blocks?**
Currently a block_completed task is created that the doctor cannot act on. Should:
(a) The plan auto-complete and no task be created?
(b) A different "plan_completed" task be created for the doctor to formally close?
(c) The doctor be offered an "Extend Plan" option?
**Default assumption if unanswered:** Option (a) -- auto-complete with an optional doctor confirmation.

**Q4: Can a patient have multiple procedures per day?**
The unique constraint `(treatment_block, day_number)` prevents this. In real AYUSH practice, a patient may have Abhyanga + Swedana + Vasti on the same day. Is the one-session-per-day model intentional or an oversight?
**Default assumption if unanswered:** Oversight -- remove the constraint and support multiple sessions per day.

### IMPORTANT Priority

**Q5: Where does the doctor initiate treatment plan creation in the UI?**
There is no button anywhere in the frontend. Should it be:
(a) On the prescription detail page?
(b) On the consultation detail page?
(c) On the follow-ups page itself?
(d) A dedicated treatment planning page?
**Default assumption if unanswered:** Option (a) -- prescription detail page.

**Q6: Should therapists be able to see the full treatment plan context (all blocks, all sessions)?**
Currently they can only see their pending sessions in the worklist. There is no way for a therapist to see what was prescribed for the full plan.
**Default assumption if unanswered:** Yes, add a read-only "View Full Plan" link from worklist items.

**Q7: Should the system account for clinic non-working days when calculating session dates?**
Currently all dates between start_date and end_date are treated as treatment days, including Sundays.
**Default assumption if unanswered:** Not for MVP; document as V2.

**Q8: How should multiple treatment plans for the same prescription be handled?**
Currently the schema allows it. Should we:
(a) Prevent it with a unique constraint?
(b) Allow it but show a warning?
**Default assumption if unanswered:** Option (a) -- prevent with constraint on (prescription, status="active").

### NICE-TO-HAVE Priority

**Q9: Should response scores have descriptive labels?**
Currently displayed as "Response score 1" through "Response score 5" with no semantic meaning.
**Default assumption if unanswered:** Add labels: 1=No response, 2=Mild, 3=Moderate, 4=Good, 5=Excellent.

**Q10: Should there be a maximum block size to prevent accidentally creating 100-session blocks?**
**Default assumption if unanswered:** Cap at 30 days per block.

**Q11: Should the doctor be able to delete a treatment plan that has never been started (no feedback submitted)?**
**Default assumption if unanswered:** Yes, add soft-delete for plans with no feedback.

---

## 10. Recommended Next Steps

### Immediate (Blocks Implementation Quality)
1. **Add review_requested task resolution** -- API endpoint + UI button (Gap #1)
2. **Guard against feedback on completed blocks** -- Add validation in `create_feedback()` (EC-2)
3. **Add plan completion logic** -- Auto-complete when final block is done (Gap #4)
4. **Remove or relax `uniq_tsession_block_day` constraint** -- Allow multiple sessions per day (DI-1)

### Short-Term (Feature Completeness)
5. **Add treatment plan creation entry point in prescription UI** (Gap #3)
6. **Add hybrid entry support in block creation UI** (UX-2)
7. **Add block feedback summary in doctor action cards** (UX-3)
8. **Add PATCH endpoint for sessions and plan** (Gap #2, Gap #5)
9. **Surface backend validation errors in UI** (UX-8)

### Medium-Term (Robustness)
10. **Add plan list endpoint** for doctor overview (Gap #6)
11. **Change prescription FK to PROTECT** to prevent cascade deletion (EC-6)
12. **Add therapist assignment model** for multi-therapist clinics (Gap #7)
13. **Add response score labels** (DI-5)
14. **Add feedback audit trail** (DI-2)

---

## Appendix: Files Examined

| File | Purpose |
|---|---|
| `backend/treatments/models.py` | 5 models: TreatmentPlan, TreatmentBlock, TreatmentSession, SessionFeedback, DoctorActionTask |
| `backend/treatments/serializers.py` | Plan creation, block creation with hybrid expansion, feedback submission |
| `backend/treatments/views.py` | TreatmentPlanViewSet (create, retrieve, add_block), TreatmentSessionViewSet (feedback) |
| `backend/treatments/urls.py` | Router registration for plans and sessions |
| `backend/treatments/tests.py` | 7 test cases covering CRUD, permissions, cross-tenant |
| `backend/treatments/admin.py` | Admin registrations with inlines |
| `backend/config/views.py` | dashboard_stats + follow_ups_list with role filtering |
| `backend/clinics/permissions.py` | IsClinicMember, IsClinicOwner, IsDoctorOrReadOnly |
| `backend/clinics/mixins.py` | TenantQuerySetMixin (fail-closed) |
| `frontend/src/app/(dashboard)/follow-ups/page.tsx` | Two-tab follow-ups page with feedback and block creation forms |
| `frontend/src/lib/types.ts` | TypeScript types for all queue items and response shapes |
| `frontend/src/components/layout/Sidebar.tsx` | Navigation with follow-ups badge count |
| `docs/plans/2026-02-28-feat-block-based-treatment-planning-followups-plan.md` | Implementation plan (marked completed) |
| `docs/brainstorms/2026-02-28-ayurveda-siddha-treatment-plan-workflow-brainstorm.md` | Original brainstorm decisions |
