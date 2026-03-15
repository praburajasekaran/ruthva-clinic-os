# Phase 6: Pharmacy & Usage -- Specification Gap Analysis

**Date:** 2026-03-01
**Analyst:** Spec Flow Analyzer
**Codebase examined:** clinics, patients, prescriptions, consultations, treatments, users apps

---

## 1. Existing Codebase Context (Relevant to Phase 6)

| Artifact | Key observations |
|---|---|
| `Clinic` model | Already has `active_patient_limit = PositiveIntegerField(default=200)`. No current enforcement logic exists. |
| `Patient` model | **No `status` or `is_active` field exists.** All patients are implicitly active. No archive/soft-delete mechanism. |
| `Medication` model | Free-text `drug_name` (CharField 255). No FK to any catalog. No link to inventory/stock. |
| `Prescription` serializer | Creates `Medication` inline via nested writable serializer. `drug_name` is a plain string field today. |
| User roles | `doctor`, `therapist`, `admin`. Owner detected via `is_clinic_owner` boolean. **Spec says "clinic_owner, doctor, therapist" but codebase has "admin" role instead of clinic_owner.** |
| Permissions | `IsClinicMember`, `IsClinicOwner` (checks `is_clinic_owner`), `IsDoctorOrReadOnly`. No therapist-specific write permission exists. |
| Tenant isolation | `TenantQuerySetMixin` filters all querysets by `request.clinic`. `perform_create` stamps `clinic` FK. |
| CSV import | Already exists for Patients and Prescriptions (preview/confirm pattern). |

---

## 2. User Flow Overview

### Flow 1: Medicine Catalog Management
```
Owner/Doctor --> Add Medicine --> Name, Category, Dosage Forms, Unit Price --> Save
Owner/Doctor --> List/Search Medicines --> Filter by category --> View
Owner/Doctor --> Edit Medicine --> Update fields --> Save
Owner/Doctor --> Delete/Archive Medicine --> Soft-delete? Hard-delete? --> ???
```

### Flow 2: Stock Management & Low-Stock Alerts
```
Owner/Doctor --> Record Stock (initial/restock) --> quantity, batch, expiry --> Save
System --> On each stock change --> Check if qty < reorder_level --> Flag low-stock
Owner/Doctor --> View Stock Dashboard --> See all items, quantities, alerts
```

### Flow 3: Prescription Autocomplete from Catalog
```
Doctor --> Create Prescription --> Type drug name -->
  System queries MedicineCatalog WHERE name ILIKE '%input%' AND clinic=current -->
  Show suggestions --> Doctor selects --> Populate dosage/form defaults -->
  Doctor can override --> Save Medication
```

### Flow 4: Dispensing Medicines
```
Doctor/Staff --> Open Prescription --> Click "Dispense" -->
  System shows medications list --> Select which to dispense, enter qty -->
  System checks stock >= qty --> Auto-deduct stock --> Record DispensingRecord -->
  If stock insufficient --> Show error, partial dispense? -->
  Mark prescription as dispensed/partially dispensed
```

### Flow 5: Usage Dashboard
```
Owner --> Navigate to Usage Dashboard -->
  System counts active patients --> Shows: active_count / limit / percentage -->
  Visual gauge or progress bar
```

### Flow 6: Active Patient Limit Enforcement
```
Any user --> Create New Patient -->
  System counts current active patients -->
  If count >= clinic.active_patient_limit --> BLOCK, return 403/400 with message -->
  If count < limit --> Allow creation
```

---

## 3. CRITICAL Gaps & Missing Definitions

### 3.1 -- "Active Patient" Definition is Completely Undefined (CRITICAL)

**The Patient model has NO status field.** There is no concept of active vs. inactive vs. archived patients in the current codebase. This is the single most important gap because it affects both:
- Success Criterion 5 (usage dashboard showing active count)
- Success Criterion 6 (blocking new patients at limit)

**Questions that MUST be answered:**

1. **What makes a patient "active"?**
   - Option A: All patients are active unless explicitly archived (requires adding `is_active` or `status` field)
   - Option B: Patients with a consultation in the last N months are "active" (computed, no field needed but expensive query)
   - Option C: All non-deleted patients are active (simplest but means limit = total patients ever)

2. **Can patients be archived/deactivated?**
   - If yes, who can archive? Only owner? Doctor too?
   - What happens to an archived patient's open prescriptions and treatment plans?
   - Can an archived patient still have new consultations added?
   - What UI action triggers archive? A button? Automatic after N months of inactivity?

3. **Can archived patients be reactivated?**
   - If yes, does reactivation check against the limit? (i.e., if limit is 200 and 200 are active, can you reactivate a 201st?)
   - Who can reactivate?

4. **Does deleting a patient reduce the active count?**
   - The system uses hard deletes currently (CASCADE). Is that intentional for patients?

**Impact if left unresolved:** The active patient limit feature cannot be implemented without this definition. If "active" means "all patients ever created," the limit becomes a total-patients-ever cap, which is a very different product than a concurrent-active-patients cap.

**Recommended default assumption:** Add `is_active = BooleanField(default=True)` to Patient. Owner and doctor can archive. Archived patients cannot receive new consultations. Reactivation checks against limit.

---

### 3.2 -- Medicine Deletion / Archival Strategy (CRITICAL)

**Questions:**

1. **What happens when a medicine is deleted but has dispensing history?**
   - Hard delete would CASCADE and destroy dispensing records (audit trail lost)
   - Soft delete (add `is_archived` flag) preserves history but medicine appears in catalog searches

2. **What happens when a medicine is deleted but is referenced in existing Medication (prescription line items)?**
   - Currently `Medication.drug_name` is free-text, so there is no FK to break. But if we add a FK from Medication to MedicineCatalog, deletion becomes dangerous.
   - Should `Medication` keep a FK to catalog medicine (nullable, SET_NULL on delete) PLUS a snapshot of the drug_name string?

3. **Can a medicine with non-zero stock be deleted?**
   - Should the system prevent deletion if stock > 0?
   - Or auto-zero the stock on archive?

**Recommended default:** Soft-delete with `is_archived` flag. Archived medicines do not appear in autocomplete. Medication keeps both a nullable FK to catalog AND the `drug_name` text snapshot. Stock records remain for audit.

---

### 3.3 -- Concurrent Stock Deduction Race Condition (CRITICAL)

When two users dispense the same medicine simultaneously:

```
User A reads stock = 5, wants to dispense 3
User B reads stock = 5, wants to dispense 4
Both see "sufficient stock"
User A deducts: stock = 2
User B deducts: stock = -2  <-- INVALID
```

**Questions:**

1. **Must dispensing use `select_for_update()` or `F()` expressions to prevent negative stock?**
2. **What if stock reaches exactly 0 -- can it be dispensed?**
3. **Should there be a database constraint `CHECK (quantity >= 0)` on the stock model?**
4. **If a dispensing fails due to insufficient stock mid-transaction (partial batch), does the entire dispense roll back or only the insufficient item?**

**Recommended default:** Use `F('quantity') - dispense_amount` with a DB-level `CHECK (quantity >= 0)` constraint. Wrap in `transaction.atomic()` with `select_for_update()`. If any line item fails, reject the entire dispense.

---

### 3.4 -- Role / Permission Matrix is Incomplete (IMPORTANT)

The spec mentions "clinic_owner, doctor, therapist" but the codebase uses `is_clinic_owner` (boolean) + `role` (doctor / therapist / admin). The spec does not mention the "admin" role at all.

**Proposed permission matrix (needs confirmation):**

| Action | Owner | Doctor | Therapist | Admin |
|---|---|---|---|---|
| Add/Edit medicine catalog | Yes | Yes | No | ? |
| Delete/Archive medicine | Yes | No | No | ? |
| Record stock (restock) | Yes | Yes | No | ? |
| View stock levels | Yes | Yes | Yes | ? |
| View low-stock alerts | Yes | Yes | No | ? |
| Dispense medicines | Yes | Yes | No | ? |
| Prescription autocomplete | Yes | Yes | No | ? |
| View usage dashboard | Yes | No | No | ? |
| Change active_patient_limit | Yes | No | No | ? |
| Archive/Unarchive patients | Yes | Yes | No | ? |

**Questions:**

1. Can therapists dispense medicines? In many AYUSH clinics, therapists administer treatments that include oils and powders.
2. Can the "admin" role (which exists in codebase but not in spec) perform pharmacy operations?
3. Who can adjust stock for corrections (breakage, expiry, audit adjustments)?
4. Should there be a dedicated "pharmacist" role?

---

### 3.5 -- Medicine Catalog Model Design (IMPORTANT)

The spec says "name, category, dosage forms, and unit price" but several fields need definition:

**Questions:**

1. **Dosage forms** -- Is this a single choice or multi-select? A medicine like Triphala comes as Choornam, Kashayam, and Gulika.
   - If multi-select: Use a separate `DosageForm` model or ArrayField?
   - Suggested AYUSH dosage forms: Kashayam, Choornam, Arishtam, Tailam, Lehyam, Gulika, Parpam, Chenduram, Nei, Maathirai, Thylam

2. **Unit price** -- Price per what unit? Per tablet? Per gram? Per bottle?
   - Does the unit need to be stored alongside the price?
   - Is price inclusive or exclusive of tax?
   - Can price change over time? Should price history be maintained?

3. **Should medicine have an HSN code** for GST compliance (relevant for Indian clinics)?

4. **Should medicine have a manufacturer/supplier field?**

5. **Is there a concept of "generic name" vs. "brand name"?**

6. **Batch tracking** -- Should stock be tracked per batch (with different expiry dates per batch)?
   - If yes, dispensing logic becomes: FIFO from the earliest-expiry batch
   - If no, single quantity per medicine, simpler

---

### 3.6 -- Stock Model Design (IMPORTANT)

**Questions:**

1. **Single row per medicine vs. batch-level tracking?**
   - Simple: `MedicineStock(medicine FK, quantity, reorder_level)` -- one row per medicine
   - Batch: `StockBatch(medicine FK, batch_number, quantity, expiry_date, purchase_price)` -- multiple rows per medicine

2. **What is the reorder_level** -- per medicine? Configurable by the clinic?

3. **Stock adjustments** -- besides dispensing and restocking, can stock be adjusted for:
   - Expired stock removal?
   - Breakage/damage?
   - Audit corrections (physical count != system count)?
   - Should adjustments be logged with reason codes?

4. **Stock transactions log** -- should every stock change be recorded in an audit table?
   - `StockTransaction(medicine, change_type [restock/dispense/adjustment/expired], quantity_change, balance_after, actor, timestamp)`

---

### 3.7 -- Dispensing Model Design (IMPORTANT)

**Questions:**

1. **Granularity** -- Is a dispensing record per-prescription or per-medication-line-item?
   - Per prescription: "All medicines in Rx #123 were dispensed"
   - Per line item: "Kashayam was dispensed, but Choornam was out of stock"

2. **Partial dispensing** -- Can a prescription be partially dispensed?
   - If yes, what states exist? (not_dispensed, partially_dispensed, fully_dispensed)
   - Can a partial dispense be completed later when stock arrives?

3. **Dispensing without a prescription** -- Can medicines be dispensed OTC (over-the-counter) without a linked prescription? Many AYUSH clinics sell medicines directly.

4. **Dispensing quantity vs. prescribed quantity** -- The current Medication model has `dosage` (string like "10ml") and `duration` ("7 days"). How is the total dispense quantity calculated?
   - Is it manual entry by the person dispensing?
   - Or auto-calculated from dosage x frequency x duration?

5. **Return/reversal** -- Can a dispensed record be reversed (e.g., patient returns medicines)?

---

### 3.8 -- Autocomplete Integration with Existing Prescription Workflow (IMPORTANT)

**Current state:** `Medication.drug_name` is a free-text CharField. Prescriptions are created via `PrescriptionDetailSerializer` which accepts nested `medications` with plain string `drug_name`.

**Questions:**

1. **Should the Medication model gain a FK to MedicineCatalog?**
   - If yes: `medicine = ForeignKey(MedicineCatalog, null=True, blank=True, on_delete=SET_NULL)` + keep `drug_name` as text snapshot
   - If no: autocomplete is purely frontend UX; backend still stores free text
   - **Trade-off:** FK enables dispensing linkage and stock deduction per catalog item; free text is simpler but dispensing must match by name (fragile)

2. **What happens when a doctor types a drug not in the catalog?**
   - Allow free-text entry anyway? (catalog is optional enrichment)
   - Block and require catalog entry first? (strict catalog enforcement)
   - Show "Add to catalog" inline option?

3. **Autocomplete search behavior:**
   - Search by name prefix only? Or contains?
   - Should it search generic name and brand name?
   - Minimum characters before triggering search? (2? 3?)
   - Maximum results returned? (10? 20?)

4. **Should autocomplete pre-fill dosage and instructions from the catalog?**
   - If the catalog has "default dosage" and "default instructions," these could auto-populate the Medication fields, saving doctor time.

---

### 3.9 -- Usage Dashboard Scope (IMPORTANT)

**Questions:**

1. **Is the usage dashboard ONLY about patient count/limit?** Or should it also show:
   - Total consultations this month?
   - Total prescriptions this month?
   - Storage usage?
   - Team member count?

2. **Is the dashboard accessible only to owners?** The spec says "Clinic owner can view" -- should doctors see it too (read-only)?

3. **Should the dashboard show historical trends?** (e.g., active patient count over last 6 months)

4. **Should there be email/notification alerts when approaching the limit?** (e.g., at 80%, 90%, 100%)

---

### 3.10 -- Active Patient Limit Enforcement Edge Cases (IMPORTANT)

**Questions:**

1. **CSV import of patients** -- The system already has a patient import feature. If a CSV contains 50 patients and the clinic has only 10 slots left:
   - Reject the entire import?
   - Import only the first 10 and reject the rest?
   - Show a warning in preview and let the user decide?

2. **What API response when blocked?** HTTP 403? 400? 429? What error message?

3. **Can the owner increase their own limit?** Or is this a super-admin/platform operation?
   - The field is on the Clinic model with `default=200`. Who can change it?

4. **Race condition on limit check:**
   ```
   User A checks: 199 active, limit 200 --> allowed
   User B checks: 199 active, limit 200 --> allowed
   Both create --> 201 active, limit breached
   ```
   - Should patient creation use `select_for_update()` on the clinic row to serialize limit checks?

5. **Does reactivating an archived patient count against the limit?**

---

### 3.11 -- CSV Import/Export for Medicines (NICE-TO-HAVE)

The codebase has a well-established CSV import pattern (preview/confirm) for patients and prescriptions.

**Questions:**

1. Should medicines be importable via CSV? (Many clinics have 200+ medicines to enter initially)
2. Should stock levels be importable via CSV? (Initial stock entry)
3. Should medicines be exportable? (For backup or transfer)
4. What CSV columns for medicine import? (name, category, dosage_form, unit_price, reorder_level, initial_stock?)

**Recommendation:** Yes, implement CSV import using the existing preview/confirm pattern. Initial catalog population is a significant onboarding friction point.

---

### 3.12 -- Low-Stock Alert Mechanism (NICE-TO-HAVE)

**Questions:**

1. **Where do low-stock alerts appear?**
   - Dashboard banner?
   - Dedicated alerts page?
   - In-app notification bell?
   - Email notification?

2. **When are alerts calculated?**
   - Real-time on each dispense?
   - Periodic background job?
   - On-demand when viewing the stock page?

3. **Can alerts be dismissed/snoozed?**

4. **Is there a "critical stock" threshold in addition to "low stock"?** (e.g., reorder at 20, critical at 5)

---

## 4. Flow Permutations Matrix

| Flow | Owner | Doctor | Therapist | First-time | Returning | Error Path |
|---|---|---|---|---|---|---|
| Add medicine | Create | Create | Blocked | Empty catalog prompt | Add to existing | Duplicate name? |
| Edit medicine | Update | Update | Blocked | N/A | Standard edit | Validation errors |
| Record stock | Create | Create | Blocked | Set initial qty | Add to existing | Negative qty input |
| View stock | Read | Read | Read? | Empty state | Filtered list | N/A |
| Low-stock alert | See alert | See alert | See alert? | N/A | Triggered on deduction | N/A |
| Autocomplete | N/A | Uses it | N/A | No catalog items | Suggestions appear | No matches |
| Dispense | Dispense | Dispense | Blocked? | First dispense for Rx | Re-dispense? | Insufficient stock |
| Usage dashboard | View | Blocked? | Blocked | Shows 0/limit | Shows current stats | N/A |
| Create patient (at limit) | Blocked | Blocked | Blocked | Error message | Error message | 400/403 response |
| Archive patient | Archive | Archive? | Blocked | N/A | Free up limit slot | Has open treatment plans |

---

## 5. Data Integrity Concerns

1. **Dispensing from archived medicine:** If a medicine is archived after a prescription is written but before dispensing, can the dispense still proceed? The stock may still exist.

2. **Orphaned stock records:** If a medicine catalog entry is hard-deleted, stock records lose their parent. Use `PROTECT` or soft-delete.

3. **Medication -> MedicineCatalog linkage:** If adding a FK, existing Medication rows have no catalog link. Migration strategy needed (nullable FK, backfill optional).

4. **Stock quantity integrity:** Without DB-level constraints, application bugs can create negative stock. Add `CHECK (quantity >= 0)`.

5. **Dispensing audit trail:** If a dispensing record is deleted, stock is not restored. DispensingRecord should probably be non-deletable (or deletion triggers stock reversal).

6. **Prescription PDF:** The existing PDF generator may need updating to show dispensing status.

---

## 6. Recommended New Models (Proposed Schema)

```
MedicineCatalog
  - clinic (FK to Clinic)
  - name (CharField)
  - category (CharField, choices from AYUSH preset)
  - dosage_form (CharField, choices)
  - unit_price (DecimalField)
  - default_dosage (CharField, optional)
  - default_instructions (TextField, optional)
  - reorder_level (PositiveIntegerField, default=10)
  - is_archived (BooleanField, default=False)
  - created_at, updated_at

MedicineStock
  - medicine (OneToOne or FK to MedicineCatalog)
  - quantity (PositiveIntegerField)  -- DB CHECK >= 0
  - last_restocked_at (DateTimeField)
  - clinic (FK to Clinic)

StockTransaction
  - medicine (FK to MedicineCatalog)
  - clinic (FK to Clinic)
  - transaction_type (restock / dispense / adjustment / expired)
  - quantity_change (IntegerField, positive for restock, negative for dispense)
  - balance_after (PositiveIntegerField)
  - reason (CharField, optional)
  - actor (FK to User)
  - created_at

DispensingRecord
  - prescription (FK to Prescription)
  - clinic (FK to Clinic)
  - dispensed_by (FK to User)
  - dispensed_at (DateTimeField)
  - notes (TextField, optional)

DispensingItem
  - dispensing_record (FK to DispensingRecord)
  - medicine (FK to MedicineCatalog, null=True, on_delete=SET_NULL)
  - medication (FK to Medication, the prescription line item)
  - drug_name_snapshot (CharField)
  - quantity_dispensed (DecimalField)
  - unit_price_snapshot (DecimalField)

Patient (MODIFIED)
  - is_active (BooleanField, default=True)  <-- NEW FIELD

Medication (MODIFIED)
  - medicine_catalog (FK to MedicineCatalog, null=True, blank=True, on_delete=SET_NULL)  <-- NEW FIELD
```

---

## 7. Prioritized Questions Requiring Answers Before Implementation

### CRITICAL (Blocks Implementation)

| # | Question | Impact | Default Assumption |
|---|---|---|---|
| C1 | What defines an "active" patient? Field-based (`is_active`) or computed (recent consultation)? | Blocks usage dashboard and limit enforcement | Add `is_active = BooleanField(default=True)` |
| C2 | Should `Medication` gain a FK to `MedicineCatalog` or remain free-text with frontend-only autocomplete? | Determines if dispensing can auto-link to stock | Add nullable FK + keep `drug_name` text |
| C3 | Should stock be tracked per-medicine (simple) or per-batch with expiry (complex)? | Fundamentally different models and dispensing logic | Per-medicine (simple), add batch tracking in a later phase |
| C4 | Is partial dispensing supported? | Affects dispensing model and UI complexity | Yes, per-line-item dispensing with status tracking |

### IMPORTANT (Significantly Affects UX)

| # | Question | Impact | Default Assumption |
|---|---|---|---|
| I1 | Can doctors enter medicines NOT in the catalog during prescriptions? | UX friction vs. data quality trade-off | Allow free-text fallback; catalog is optional enrichment |
| I2 | Can the "admin" role (exists in codebase) perform pharmacy operations? | Permission matrix completeness | Admin has same permissions as doctor for pharmacy |
| I3 | What happens to CSV patient import when near the limit? | Existing feature may break | Preview shows warning; confirm imports up to remaining slots |
| I4 | Should therapists view stock levels? | Role scoping | Yes, read-only access |
| I5 | Can medicines be dispensed OTC (without a prescription)? | Feature scope | No, dispensing requires a prescription in Phase 6 |

### NICE-TO-HAVE (Reasonable Defaults Exist)

| # | Question | Impact | Default Assumption |
|---|---|---|---|
| N1 | Should medicine catalog support CSV import? | Onboarding friction | Yes, follow existing preview/confirm pattern |
| N2 | Should low-stock alerts send email notifications? | Alert visibility | No email in Phase 6; dashboard-only alerts |
| N3 | Should the usage dashboard show historical trends? | Dashboard richness | No, current snapshot only in Phase 6 |
| N4 | Should stock transactions be logged for audit? | Audit trail depth | Yes, StockTransaction model for all changes |
| N5 | Price history tracking? | Financial accuracy | No, current price only in Phase 6 |

---

## 8. Recommended Next Steps

1. **Answer C1-C4** before any development starts. These are architectural decisions that cascade into model design, API contracts, and frontend components.

2. **Add `is_active` field to Patient** and update PatientViewSet to:
   - Filter active patients by default
   - Add archive/unarchive actions
   - Check limit on create and unarchive

3. **Create a new Django app `pharmacy`** with models: MedicineCatalog, MedicineStock, StockTransaction, DispensingRecord, DispensingItem.

4. **Update the Medication model** with a nullable FK to MedicineCatalog.

5. **Add a medicine autocomplete API endpoint** (GET with search query param, returns catalog matches).

6. **Implement stock deduction** with `select_for_update()` + `F()` expressions + `CHECK` constraint.

7. **Update the patient creation flow** (both API and CSV import) to enforce `active_patient_limit`.

8. **Build the usage dashboard API** as a simple aggregation endpoint on the clinics app.
