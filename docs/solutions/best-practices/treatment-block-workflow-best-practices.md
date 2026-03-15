# Best Practices: Multi-Session Treatment Block Workflow

> Research date: 2026-03-01
> Context: AYUSH (Ayurveda/Siddha) SaaS platform — Django REST Framework + Next.js

---

## 1. Data Modeling Patterns (Django)

### 1.1 Existing Model Assessment

The current schema is **well-designed** and already follows best practices:

```
TreatmentPlan -> TreatmentBlock -> TreatmentSession -> SessionFeedback
                                -> DoctorActionTask
```

**What is already done right:**

- **Hybrid entry model**: `SessionPlanEntrySerializer` supports both `single_day` and `day_range` entry types, expanded into individual `TreatmentSession` rows at creation time. This is the correct approach — store normalized (one row per day) but accept denormalized (ranges) at the API boundary.
- **Variable-length blocks**: `TreatmentBlock.start_day_number` / `end_day_number` with no fixed block size allows 3-day, 5-day, or 7-day blocks within the same plan. This maps directly to Panchakarma's variable phase durations.
- **Status tracking**: Three-level status (planned/in_progress/completed on blocks; planned/done/not_done on sessions) is sufficient. Avoid adding more statuses unless a real workflow requires them.
- **Atomic block completion detection**: The feedback serializer checks `block.sessions.filter(execution_status=PLANNED).exists()` inside `transaction.atomic()` — this is the correct pattern to prevent race conditions.

**Recommendations for improvement:**

#### A. Add a `version` or `revision_number` to TreatmentBlock

When doctors revise upcoming blocks (e.g., change oil after seeing feedback), tracking which revision is active helps with audit trails. Keep it simple:

```python
class TreatmentBlock(models.Model):
    # ... existing fields ...
    revision_of = models.ForeignKey(
        "self", null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="revisions",
    )
```

**When to add this**: Only if the clinic needs to see "what was the original plan vs. what was revised." If not needed now, skip it — the current `replan_required` boolean is sufficient for the basic workflow.

#### B. Consider `django-fsm` only if status transitions grow complex

The current manual status management in the serializer is fine for 3 states per model. If you later add states like `paused`, `cancelled`, `awaiting_approval`, then `django-fsm` (or its maintained fork `django-fsm-2`) provides:

- Declarative transition definitions with `@transition` decorator
- `protected=True` to prevent direct field assignment
- Built-in permission checks per transition

**Recommendation**: Do NOT add django-fsm now. The current pattern of managing transitions inside `create_feedback()` with atomic transactions is simpler and easier to understand. Revisit only if you add 5+ states.

#### C. Index strategy is correct

The existing composite indexes are well-chosen:
- `tblock_plan_status` — for "get active blocks for this plan"
- `tsession_block_exec` — for "are there pending sessions in this block?"
- `dtask_clinic_status_type` — for follow-ups queue filtering
- `sfeedback_therapist_created` — for therapist activity tracking

No additional indexes needed unless query profiling shows otherwise.

### 1.2 Panchakarma Domain Alignment

Panchakarma treatment follows a three-phase protocol that maps cleanly to the block model:

| Panchakarma Phase | Typical Duration | Maps To |
|---|---|---|
| **Purvakarma** (Preparation) — Snehana, Swedana | 5-7 days | Block 1 |
| **Pradhana Karma** (Main treatment) — Vamana, Virechana, Basti, Nasya | 3-7 days per procedure | Block 2, 3, ... |
| **Paschatkarma** (Rejuvenation/Post-care) | 3-7 days | Final block |

The hybrid entry model works well here because:
- Preparation phase often uses the **same** oil massage for 5 days (day-range entry)
- Main treatment may have **different** procedures on specific days (single-day entries)
- A single block can mix both types

**No schema changes needed** to support standard Panchakarma workflows.

### 1.3 Pattern: Avoid Over-Normalizing Treatment Templates

A common mistake is creating a separate `TreatmentTemplate` entity too early. The current approach of creating blocks on-the-fly based on doctor decisions is correct for an MVP. Templates can be added later as:

```python
class TreatmentTemplate(models.Model):
    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)  # e.g., "Standard Panchakarma 21-day"
    template_data = models.JSONField()  # Store block definitions as JSON
```

This keeps the operational model clean and avoids coupling template management with treatment execution.

---

## 2. Role-Based Workflow Patterns

### 2.1 Doctor-Creates / Therapist-Executes (Already Implemented Well)

The current implementation follows the **Command Pattern** correctly:

| Actor | Can Do | Enforced By |
|---|---|---|
| Doctor | Create/edit plans, blocks | `IsDoctorOrReadOnly` permission |
| Therapist | Submit feedback only | `request.user.role != "therapist"` check in view |
| Admin | Read all queues | Role-based tab visibility |

**Best practice already followed**: Permission checks happen at both the **API layer** (DRF permissions) and **UI layer** (tab visibility based on `user.role`). This defense-in-depth approach is correct.

### 2.2 Doctor Action Queue Pattern (DoctorActionTask)

The `DoctorActionTask` model is an excellent implementation of the **Action Queue** pattern used in clinical workflows. Key strengths:

- **Typed tasks** (`block_completed`, `review_requested`) — extensible without schema changes
- **Idempotent creation** via `get_or_create` with unique constraint on `(block, task_type)` where status=open
- **Auto-resolution** when doctor creates the next block (serializer clears open tasks)

**Recommendations:**

#### A. Add task priority for future use

```python
PRIORITY_NORMAL = "normal"
PRIORITY_URGENT = "urgent"
PRIORITY_CHOICES = [
    (PRIORITY_NORMAL, "Normal"),
    (PRIORITY_URGENT, "Urgent"),
]
priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default=PRIORITY_NORMAL)
```

Use case: therapist marks `review_requested=True` with a low response score (1-2) — auto-set priority to urgent. **Add only when needed.**

#### B. Notification hook pattern

When you add notifications (SMS/WhatsApp), do it as a **post-save signal or service function**, not inline in the serializer:

```python
# treatments/services.py
def notify_doctor_action_created(task: DoctorActionTask):
    """Hook point for future notification channels."""
    pass  # Will dispatch to notification service later

# In serializer, after task creation:
notify_doctor_action_created(task)
```

This keeps the serializer focused on data integrity and separates notification concerns.

### 2.3 Follow-ups as Unified Queue

The decision to use the follow-ups page as the operational queue (rather than building a separate workflow area) is a strong architectural choice. This follows the **Single Queue** pattern from clinical workflow design:

- One page, role-filtered views
- Reduces navigation complexity
- Maps to how clinic staff actually think ("what do I need to do today?")

---

## 3. DRF API Patterns

### 3.1 Nested Resource Strategy (Current: Correct)

The current approach uses a **hybrid flat + nested** URL scheme:

```
POST /treatments/plans/              — Create plan + first block (nested in payload)
POST /treatments/plans/{id}/blocks/  — Add block (action on plan)
POST /treatments/sessions/{id}/feedback/ — Submit feedback (action on session)
GET  /dashboard/follow-ups/          — Unified queue (flat, role-filtered)
```

**This is the recommended pattern.** Avoid deeply nested URLs like `/plans/{id}/blocks/{bid}/sessions/{sid}/feedback/` — they create routing complexity without benefit. The current flat session endpoints with block context in the response are simpler.

### 3.2 Bulk Operations Pattern (Current: Correct)

The `TreatmentBlockCreateSerializer._expand_entries()` method correctly:
1. Accepts hybrid input (single_day + day_range)
2. Expands to individual sessions
3. Validates no overlaps with existing sessions
4. Uses `bulk_create` for efficiency
5. Wraps everything in `transaction.atomic()`

**This is the gold-standard pattern for bulk creation with validation.**

Recommendations:
- If blocks grow beyond ~30 sessions, consider `batch_size` parameter on `bulk_create` to limit memory usage
- The overlap validation does a single `exists()` query — efficient for typical block sizes

### 3.3 Status Transition Validation

The current approach validates transitions implicitly (e.g., feedback can only be submitted for `planned` sessions, blocks transition to `in_progress` on first feedback). For explicit transition validation, consider a simple guard method:

```python
# On TreatmentBlock model
ALLOWED_TRANSITIONS = {
    "planned": ["in_progress"],
    "in_progress": ["completed"],
    "completed": [],  # terminal state
}

def can_transition_to(self, new_status):
    return new_status in self.ALLOWED_TRANSITIONS.get(self.status, [])
```

**Add only if you encounter bugs from invalid transitions.** The current serializer logic is clear enough for 3 states.

### 3.4 API Response Shape for Queue Items

The typed discriminated union approach in the follow-ups response is excellent:

```json
{
  "items": [
    {"queue_type": "therapist", ...},
    {"queue_type": "doctor", ...},
    {"queue_type": "legacy", ...}
  ],
  "meta": {"tab": "all", "counts": {...}}
}
```

This pattern (discriminated union with `queue_type` field) is the recommended way to return polymorphic list items. The TypeScript types mirror this perfectly with type guards (`isTherapistItem`, `isDoctorItem`).

---

## 4. React/Next.js Frontend Patterns

### 4.1 Tab-Based Worklist (Current: Good, Can Improve)

The current follow-ups page implements tabs well. Improvement opportunities:

#### A. Extract tab content into separate components

The current 500-line page would benefit from component extraction:

```
follow-ups/
  page.tsx                    — Tab container + data fetching
  components/
    TherapistWorklist.tsx     — Therapist session cards
    DoctorActions.tsx         — Doctor action cards
    LegacyFollowUps.tsx      — Legacy items
    SessionFeedbackForm.tsx   — Feedback form (reusable)
    BlockCreationForm.tsx     — Block creation form (reusable)
```

This follows React's **composition pattern** and makes each tab independently testable.

#### B. Role-aware default tab selection

The current `useEffect` that sets default tab based on role is correct:

```tsx
useEffect(() => {
  if (user?.role === "doctor") setTab("doctor");
  else if (user?.role === "therapist") setTab("therapist");
  else setTab("all");
}, [user?.role]);
```

This is the simplest and most readable approach. Avoid over-engineering with URL-based tab state unless you need deep-linking.

#### C. Optimistic updates for feedback submission

Currently, feedback submission does `await api.post(...)` then `await refetch()`. For better UX, consider optimistic removal of the submitted item:

```tsx
const submitFeedback = async (item: TherapistWorklistItem) => {
  // Optimistically remove from list
  setOptimisticRemovals(prev => [...prev, item.treatment_session_id]);
  try {
    await api.post(`/treatments/sessions/${item.treatment_session_id}/feedback/`, draft);
    await refetch(); // Reconcile with server
  } catch {
    setOptimisticRemovals(prev => prev.filter(id => id !== item.treatment_session_id));
    setErrorMessage("Could not submit feedback.");
  }
};
```

### 4.2 Session Logging Forms with Scoring

The current implementation uses a simple `<select>` for response score (1-5). For better clinical UX, consider:

#### Star/Circle Rating Component

```tsx
function ResponseScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          className={`h-8 w-8 rounded-full border-2 text-sm font-medium transition-colors ${
            score <= value
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-gray-300 text-gray-400 hover:border-emerald-300"
          }`}
        >
          {score}
        </button>
      ))}
    </div>
  );
}
```

This gives therapists a quicker tap target (especially on tablet devices common in clinics).

### 4.3 Timeline/Calendar View (Future Enhancement)

For treatment plan visualization, a simple **horizontal block timeline** is more useful than a full calendar component:

```
Day 1────5  Day 6────10  Day 11────15
[Block 1 ]  [Block 2  ]  [  Pending  ]
 Done ✓      In Progress   Not planned
```

This can be built with plain CSS grid without pulling in heavy scheduler libraries (DHTMLX, Syncfusion). A lightweight approach:

```tsx
function TreatmentTimeline({ plan }: { plan: TreatmentPlan }) {
  return (
    <div className="flex gap-1">
      {plan.blocks.map((block) => (
        <div
          key={block.id}
          className={`rounded px-2 py-1 text-xs ${statusColors[block.status]}`}
          style={{ flex: block.end_day_number - block.start_day_number + 1 }}
        >
          Block {block.block_number}: Day {block.start_day_number}-{block.end_day_number}
        </div>
      ))}
    </div>
  );
}
```

**Avoid heavy calendar libraries** unless you need drag-and-drop rescheduling (unlikely for clinical treatment plans where dates are set by doctors).

### 4.4 Form State Management

The current approach using `useState` with `feedbackDrafts` and `blockDrafts` records is pragmatic. For the current scale (typically <20 items per queue), this is fine. If performance becomes an issue with many simultaneous open forms, consider:

- `useReducer` for complex state transitions
- Form library (react-hook-form) only if validation requirements grow significantly

**Current approach is correct for the scale.** Do not prematurely optimize.

---

## 5. Architectural Anti-Patterns to Avoid

### 5.1 Do NOT Add a Separate Workflow Engine

Libraries like `django-viewflow`, `django-river`, or custom BPMN engines are overkill for this workflow. The current pattern of:
1. Serializer handles business logic and state transitions
2. Atomic transactions ensure consistency
3. DoctorActionTask serves as the action queue

...is simpler, more debuggable, and sufficient for the treatment block workflow.

### 5.2 Do NOT Split the Follow-ups Queue

Resist the temptation to create separate pages for therapist worklist vs. doctor actions. The unified queue with tabs is the correct UX pattern for a small clinic team (2-5 people) that often switches between roles.

### 5.3 Do NOT Over-Model the Treatment Domain

The current flat session model (one row per day per block) is correct. Avoid:
- Creating a separate `TreatmentPhase` entity between Plan and Block (blocks ARE phases)
- Adding a `TreatmentProtocol` model before you have template requirements
- Modeling individual procedure steps within a session (keep it at session level)

### 5.4 Do NOT Use WebSockets for Real-Time Updates

For a clinic management system with 2-5 concurrent users, polling or refetch-on-action is sufficient. The current `refetch()` after mutations is the right approach. WebSockets add deployment complexity (channels, Redis) without meaningful UX benefit at this scale.

---

## 6. What to Build Next (Prioritized)

Based on the current implementation state and the plan document:

### Must-Have (before pilot)
1. **Frontend component extraction** — Break the 500-line follow-ups page into smaller components
2. **Frontend tests** — Tab rendering, role filtering, action transitions (marked incomplete in plan)
3. **Performance validation** — Ensure <500ms response for follow-ups endpoint (marked incomplete)

### Should-Have (first iteration after pilot)
4. **Response score visualization** — Circle/button rating instead of dropdown
5. **Treatment timeline component** — Simple horizontal block visualization on the doctor action card
6. **Block creation with multiple entries** — Current UI only supports single day-range entry; the API already supports hybrid entries

### Nice-to-Have (future iterations)
7. **Treatment templates** — Pre-defined block patterns for common Panchakarma protocols
8. **Score trend chart** — Show response score progression across sessions in a block
9. **Notification hooks** — SMS/WhatsApp when doctor action is created
10. **PDF treatment summary** — Export completed treatment plan with all feedback

---

## 7. Sources

### Codebase (Internal)
- `backend/treatments/models.py` — 5 models: TreatmentPlan, TreatmentBlock, TreatmentSession, SessionFeedback, DoctorActionTask
- `backend/treatments/serializers.py` — Hybrid entry expansion, atomic block creation, feedback with auto-task creation
- `backend/treatments/views.py` — ViewSets with role-based permissions
- `backend/clinics/permissions.py` — IsDoctorOrReadOnly, IsClinicMember
- `frontend/src/app/(dashboard)/follow-ups/page.tsx` — Two-tab worklist with inline forms
- `frontend/src/lib/types.ts` — Discriminated union types for queue items
- `docs/brainstorms/2026-02-28-ayurveda-siddha-treatment-plan-workflow-brainstorm.md`
- `docs/plans/2026-02-28-feat-block-based-treatment-planning-followups-plan.md`

### External
- [DRF Writable Nested Serializers](https://www.django-rest-framework.org/topics/writable-nested-serializers/) — Official DRF guidance on nested create/update
- [drf-nested-routers](https://github.com/alanjds/drf-nested-routers) — Nested URL routing (NOT recommended for this project; flat + action approach is simpler)
- [django-fsm-2](https://github.com/django-commons/django-fsm-2) — State machine for Django models (keep in mind for future complexity)
- [DRF Writable Nested Package](https://github.com/beda-software/drf-writable-nested) — Automatic nested serializer writes with atomic transactions
- [Panchakarma Treatment Protocol — Ayurvedic Institute](https://ayurveda.com/introduction-to-panchakarma/) — Three-phase structure (Purvakarma, Pradhana Karma, Paschatkarma)
- [Panchakarma Guide — Patanjali Wellness](https://www.patanjaliwellness.us/the-ultimate-guide-to-panchakarma-treatment/) — Duration ranges (7-21 days) and phase breakdown
- [Clinical Workflow Phases — PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6278604/) — Four workflow phases: Identifying, Engaging, Treating, Monitoring/Adjusting
- [TestDriven.io DRF Nested Serializer Tips](https://testdriven.io/tips/ebda0a87-57d2-4cb4-b2cc-9f0bb728e1ad/) — Writable nested serializer patterns
- [React Architecture Patterns 2025 — GeeksforGeeks](https://www.geeksforgeeks.org/reactjs/react-architecture-pattern-and-best-practices/) — Component composition and state management
