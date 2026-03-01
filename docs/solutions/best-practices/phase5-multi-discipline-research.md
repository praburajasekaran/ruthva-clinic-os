---
title: "Phase 5 Multi-Discipline: Institutional Learnings & Implementation Patterns"
date: 2026-02-28
category: best-practices
severity: high
tags:
  - phase5
  - multi-discipline
  - data-migration
  - jsonfield
  - ayurveda
  - siddha
  - multi-tenant-security
  - form-patterns
modules:
  - backend/consultations
  - backend/clinics
  - frontend/components/consultations
  - backend/patients
root_cause: "Phase 5 requires migrating Consultation model schema from hardcoded discipline-specific columns to JSONField while maintaining multi-tenant isolation and data integrity"
search_keywords:
  - jsonfield migration
  - multi-discipline diagnostic forms
  - prakriti analysis
  - envagai thervu
  - atomic transactions
  - clinic discipline
  - dynamic form rendering
---

# Phase 5 Multi-Discipline: Institutional Learnings & Implementation Patterns

## Research Summary

This document synthesizes institutional learnings from Phases 1–2 that directly apply to Phase 5 "Multi-Discipline" (migrating Consultation model from hardcoded Envagai Thervu columns to JSONField). **No existing Phase 5 solutions exist**, but **5 critical institutional patterns** apply directly.

---

## Critical Learnings Applied to Phase 5

### 1. MULTI-TENANT SECURITY RULES (High Relevance)
**Source**: `docs/solutions/security-issues/phase2-team-management-security-review.md`

**Key Learnings:**
- **Tenant Binding Rule**: Every permission class must verify `request.user.clinic_id == request.clinic.id`
- **Implicit Trust Nothing Rule**: Never assume `request.user.clinic` is correct; always validate against `request.clinic` (set by TenantMiddleware)
- **Composite Unique Constraints**: Tenant-scoped uniqueness requires DB-level composite constraints, not just app-level checks
- **State Mutation Lock Rule**: Critical data mutations must use `transaction.atomic()` with `select_for_update()`
- **Serializer Trust Boundary Rule**: All user-controlled values rendered in HTML must be escaped

**Application to Phase 5:**
When migrating consultation diagnostic data to JSONField:
1. All serializer validations happen at trust boundary (DRF serializers, not frontend alone)
2. Data migration from old columns to JSON must be wrapped in `transaction.atomic()`
3. If JSONField includes discipline-specific nested objects, validate foreign keys are clinic-scoped
4. All forms rendering diagnostic data must escape user-provided content in JSON
5. Serializer must validate discipline-specific required fields (e.g., Ayurveda requires Prakriti)

**Code Pattern:**
```python
# consultations/serializers.py
def validate_diagnostic_data(self, value):
    """Validate discipline-specific diagnostic fields"""
    clinic = self.context['request'].clinic

    if clinic.discipline == "ayurveda":
        if not value.get("prakriti_dosha"):
            raise ValidationError("Prakriti analysis required for Ayurveda")

    # Escape any text fields that will be rendered in HTML
    for key, val in value.items():
        if isinstance(val, str):
            value[key] = html.escape(val)  # Safety boundary

    return value
```

---

### 2. DATA MIGRATION SAFETY PATTERN (High Relevance)
**Source**: `docs/solutions/security-issues/phase2-team-management-security-review.md` (Prevention section)

**Key Learnings:**
- Use `transaction.atomic()` for all data mutations
- Use `select_for_update()` for critical state changes
- Test cases must cover cross-tenant isolation, duplicate prevention, and rollback safety

**Application to Phase 5:**

The 3-step migration (add field → migrate data → drop columns) should be:

1. **Step 1 (Add JSONField)**: No data risk
   ```python
   # migrations/XXXX_add_diagnostic_data_field.py
   field = models.JSONField(null=True, blank=True, default=dict)
   ```

2. **Step 2 (Migrate Data)**: Wrap in atomic transaction
   ```python
   # migrations/XXXX_migrate_envagai_to_json.py
   def migrate_envagai_to_json(apps, schema_editor):
       Consultation = apps.get_model('consultations', 'Consultation')

       with transaction.atomic():
           for consultation in Consultation.objects.select_for_update():
               diagnostic_data = {
                   "envagai_thervu": {
                       "naa": consultation.naa,
                       "niram": consultation.niram,
                       "mozhi": consultation.mozhi,
                       "vizhi": consultation.vizhi,
                       "nadi": consultation.nadi,
                       "mei": consultation.mei,
                       "muthiram": consultation.muthiram,
                       "varmam": consultation.varmam,
                   }
               }
               consultation.diagnostic_data = diagnostic_data
               consultation.save(update_fields=['diagnostic_data'])
   ```

3. **Step 3 (Drop Columns)**: Only after verification succeeds
   ```python
   # migrations/XXXX_drop_envagai_columns.py
   # Remove: naa, niram, mozhi, vizhi, nadi, mei, muthiram, varmam fields
   ```

**Test Coverage:**
```python
# tests/test_consultation_json_migration.py
def test_migration_preserves_data_per_clinic():
    """All Envagai Thervu data migrates to JSON per clinic"""
    clinic = Clinic.objects.create(name="Test Clinic", slug="test")
    consultation = Consultation.objects.create(
        clinic=clinic,
        patient=patient,
        consultation_date=date.today(),
        naa="Normal",
        niram="Fair",
        # ... other fields
    )

    # Run migration
    migrate_envagai_to_json(apps, schema_editor)

    consultation.refresh_from_db()
    assert consultation.diagnostic_data["envagai_thervu"]["naa"] == "Normal"
    assert consultation.diagnostic_data["envagai_thervu"]["niram"] == "Fair"

def test_migration_rollback_safe():
    """If migration fails, no partial state remains"""
    # Verify transaction.atomic() wrapping prevents partial writes
```

---

### 3. CLINIC DISCIPLINE FIELD (High Relevance)
**Source**: `.planning/codebase/ARCHITECTURE.md` (Multi-tenant isolation pattern)

**Key Pattern:**
Current multi-tenant implementation:
```
request → TenantMiddleware → sets request.clinic
TenantQuerySetMixin filters all queries by clinic
All models have clinic FK
```

**Phase 5 Opportunity:**
Add discipline to Clinic model:

```python
# clinics/models.py
class Clinic(models.Model):
    DISCIPLINES = [
        ("siddha", "Siddha"),
        ("ayurveda", "Ayurveda"),
        ("unani", "Unani"),
        ("homeopathy", "Homeopathy"),
        ("naturopathy", "Naturopathy"),
    ]

    # ... existing fields ...
    discipline = models.CharField(
        max_length=20,
        choices=DISCIPLINES,
        default="siddha",  # Backward compatible
        help_text="Primary discipline for diagnostic forms"
    )
```

Use discipline in:
1. **Frontend** (forms): Show correct diagnostic form based on `clinic.discipline`
2. **Backend** (serializers): Validate JSONField structure matches discipline
3. **Exports** (Phase 4): Include discipline in CSV header

**In Serializer:**
```python
def get_diagnostic_form_fields(self, obj):
    """Return form schema based on clinic discipline"""
    clinic = self.context['request'].clinic

    if clinic.discipline == "ayurveda":
        return {
            "prakruti_dosha": {"vata": 0, "pitta": 0, "kapha": 0},
            "vikruti_dosha": {"vata": 0, "pitta": 0, "kapha": 0},
            "recommendations": ""
        }
    elif clinic.discipline == "siddha":
        return {
            "envagai_thervu": {
                "naa": "", "niram": "", "mozhi": "", "vizhi": "",
                "nadi": "", "mei": "", "muthiram": "", "varmam": ""
            }
        }
    else:
        return {"diagnostic_notes": ""}
```

---

### 4. NESTED WRITABLE SERIALIZERS (Moderate Relevance)
**Source**: `.claude/implementation-patterns-phase1-backend-apis.md` (Section 2)

**Current Sivanethram Pattern:**
```python
# For nested resources (medications in Prescription, history in Patient)
def update(self, instance, validated_data):
    nested_data = validated_data.pop("nested_items", None)
    instance = super().update(instance, validated_data)
    if nested_data is not None:
        instance.nested_items.all().delete()  # Delete-and-recreate
        for item in nested_data:
            NestedItem.objects.create(parent=instance, **item)
    return instance
```

**Application to Phase 5:**
For Ayurveda Prakriti form with multiple fields (dosha scores, imbalances, recommendations):
- **Option A** (Phase 5): Flatten into single JSONField (simpler)
  ```python
  diagnostic_data = {
      "prakruti_dosha": {"vata": 30, "pitta": 40, "kapha": 30},
      "vikruti_dosha": {"vata": 35, "pitta": 35, "kapha": 30},
      "imbalances": ["vata_aggravation"],
      "recommendations": "..."
  }
  ```

- **Option B** (Phase 6): Create separate `AyurvedaPrakrti` model with FK to Consultation
  - Would need nested writable serializer pattern
  - Defer to pharmacy integration if needed

**Recommendation**: Use Option A for Phase 5 (JSONField only), defer nested model structure to Phase 6 if pharmacy requires it.

---

### 5. PHASE 4 AFFECTS PHASE 5 DATA PORTABILITY (High Relevance)
**Source**: `docs/plans/2026-02-28-feat-phase-4-data-portability-plan.md`

**Critical Context:**
- Phase 4 implements Consultation CSV import/export
- Phase 5 changes Consultation model schema (adds JSONField)
- **Risk**: CSV export/import logic must handle schema change

**Migration Strategy:**
When Phase 4 exports consultations to CSV, they currently include flat Envagai Thervu columns:
```csv
clinic_id,patient_id,consultation_date,naa,niram,mozhi,vizhi,...
1,101,2026-02-28,Normal,Fair,Clear,...
```

When Phase 5 migrates to JSONField, CSV export/import must:
1. **Still export Envagai Thervu columns** (for backward compatibility with Phase 4)
2. **Import CSV rows back into JSON structure** correctly
3. **Handle discipline-specific fields** (Ayurveda Prakriti won't exist in old Siddha CSV exports)

**In Phase 4 Import Service** (updated for Phase 5):
```python
# consultations/import_service.py
def import_consultations(self, rows, skip_duplicates=False):
    """Import consultation CSV rows, handling both old and new schema"""
    for row in rows:
        # Detect if row has old flat columns or new discipline_used field
        discipline = row.get('discipline', self.clinic.discipline)

        # Convert flat columns to JSON
        diagnostic_data = self._build_diagnostic_data(row, discipline)

        consultation = Consultation(
            clinic=self.clinic,
            patient=patient,
            consultation_date=row['consultation_date'],
            diagnostic_data=diagnostic_data,
            discipline_used=discipline,
        )
```

---

### 6. FORM VALIDATION & ESCAPING (High Relevance)
**Source**: `docs/solutions/security-issues/phase2-team-management-security-review.md` (P1 Finding #003)

**Learning**: HTML injection via unescaped user input
```python
# BEFORE (BROKEN)
html_content = f"<h1>{clinic_name}</h1>"

# AFTER (FIXED)
import html
html_content = f"<h1>{html.escape(clinic_name)}</h1>"
```

**Application to Phase 5:**
When rendering diagnostic data from JSONField in frontend forms:
1. **Django Serializers**: Return raw JSON (Django auto-escapes on template render)
2. **Frontend React**: Use `dangerouslySetInnerHTML` only if sanitized; prefer plain text rendering
3. **PDF generation**: If diagnostic JSON includes user notes, escape before WeasyPrint

**Pattern:**
```typescript
// frontend/src/components/consultations/DiagnosticForm.tsx
export function DiagnosticForm({ clinic, diagnosticData }) {
  // Always render text as plain text, never as HTML
  return (
    <div>
      {clinic.discipline === "siddha" && (
        <div className="space-y-4">
          <div>
            <label>Naa (Tongue):</label>
            {/* Safe: text content, not HTML */}
            <p>{diagnosticData.envagai_thervu?.naa}</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 7. UNIQUE CONSTRAINTS FOR DATA INTEGRITY (Moderate Relevance)
**Source**: `.planning/codebase/CONVENTIONS.md`

**Current Pattern:**
```python
class Consultation(models.Model):
    constraints = [
        models.UniqueConstraint(
            fields=["clinic", "patient", "consultation_date"],
            name="unique_consultation_per_patient_day",
        ),
    ]
```

**Phase 5 Consideration:**
When adding JSONField with discipline-specific data, **maintain this constraint**. The JSONField doesn't affect uniqueness; the constraint remains unchanged.

---

### 8. OPTIONAL FIELD CONVENTIONS (Moderate Relevance)
**Source**: `.claude/implementation-patterns-phase1-backend-apis.md` (Section 4)

**Current Rule in Backend:**
```python
# Text fields: blank=True, default="" (NO NULLS)
naa = models.TextField(blank=True, default="")

# Numeric fields: null=True, blank=True
weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
```

**Application to Phase 5 JSONField:**
```python
# consultations/models.py
diagnostic_data = models.JSONField(
    null=True,  # Consultation can be created without diagnostics
    blank=True,
    default=dict,
    help_text="Discipline-specific diagnostic fields"
)
```

---

## Recommended Implementation Approach

### Backend Schema Design
```python
# consultations/models.py

class Consultation(models.Model):
    clinic = models.ForeignKey("clinics.Clinic", ...)
    patient = models.ForeignKey("patients.Patient", ...)

    # ... existing fields (vitals, general assessment) ...

    # Phase 5: JSONField for multi-discipline support
    diagnostic_data = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text="Discipline-specific diagnostic assessment"
    )

    # Optional: Track which discipline was used
    discipline_used = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        choices=DISCIPLINES,
        help_text="Discipline used for this consultation"
    )

    # Phase 5 Note: Keep Envagai Thervu columns until Phase 4 exports are updated
    # Drop in Phase 5b after data migration verification
    naa = models.TextField(blank=True, default="")
    niram = models.TextField(blank=True, default="")
    # ... other Envagai columns ...

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["clinic", "patient", "consultation_date"],
                name="unique_consultation_per_patient_day",
            ),
        ]
```

### Serializer Pattern for Dynamic Forms
```python
# consultations/serializers.py

class ConsultationDetailSerializer(serializers.ModelSerializer):
    diagnostic_form_fields = serializers.SerializerMethodField()

    def get_diagnostic_form_fields(self, obj):
        """Return form schema based on clinic discipline"""
        clinic = self.context['request'].clinic

        if clinic.discipline == "ayurveda":
            return {
                "prakruti_dosha": {"vata": 0, "pitta": 0, "kapha": 0},
                "vikruti_dosha": {"vata": 0, "pitta": 0, "kapha": 0},
                "imbalances": [],
                "recommendations": ""
            }
        elif clinic.discipline == "siddha":
            return {
                "envagai_thervu": {
                    "naa": "", "niram": "", "mozhi": "", "vizhi": "",
                    "nadi": "", "mei": "", "muthiram": "", "varmam": ""
                }
            }
        else:
            return {"diagnostic_notes": ""}

    def validate_diagnostic_data(self, value):
        """Validate discipline-specific fields"""
        clinic = self.context['request'].clinic

        if clinic.discipline == "ayurveda":
            if not value.get("prakruti_dosha"):
                raise ValidationError("Prakriti analysis required for Ayurveda")

        # Escape user-provided text for safety
        import html
        for key, val in value.items():
            if isinstance(val, str):
                value[key] = html.escape(val)

        return value
```

### Frontend Dynamic Form Component
```typescript
// frontend/src/components/consultations/DiagnosticForm.tsx

export function DiagnosticForm({ clinic, initialData, onDataChange }) {
  const [data, setData] = useState(initialData?.diagnostic_data || {});

  return (
    <div className="space-y-6">
      {clinic.discipline === "ayurveda" && (
        <AyurvedaPrakrti
          initialData={data.prakruti_dosha || {}}
          onChange={(prakruti) => {
            setData(prev => ({ ...prev, prakruti_dosha: prakruti }));
            onDataChange({ ...data, prakruti_dosha: prakruti });
          }}
        />
      )}

      {clinic.discipline === "siddha" && (
        <EnvagaiThervu
          initialData={data.envagai_thervu || {}}
          onChange={(thervu) => {
            setData(prev => ({ ...prev, envagai_thervu: thervu }));
            onDataChange({ ...data, envagai_thervu: thervu });
          }}
        />
      )}

      {/* Default for other disciplines */}
      {!["siddha", "ayurveda"].includes(clinic.discipline) && (
        <FormField
          label="Diagnostic Notes"
          value={data.diagnostic_notes || ""}
          onChange={(notes) => {
            setData(prev => ({ ...prev, diagnostic_notes: notes }));
            onDataChange({ ...data, diagnostic_notes: notes });
          }}
        />
      )}
    </div>
  );
}
```

### Test Coverage for Migration
```python
# tests/test_consultation_json_migration.py

class ConsultationJSONMigrationTest(TestCase):
    def test_migration_step_1_adds_json_field(self):
        """Field can be added without breaking existing data"""
        # Verify Consultation model accepts diagnostic_data
        c = Consultation(clinic=self.clinic, patient=self.patient, ...)
        c.diagnostic_data = {}
        c.save()
        assert c.diagnostic_data == {}

    def test_migration_step_2_copies_envagai_to_json(self):
        """All 8 Envagai Thervu fields copy correctly per clinic"""
        c = Consultation.objects.create(
            clinic=self.clinic, patient=self.patient,
            naa="Normal", niram="Fair", mozhi="Clear", vizhi="Bright",
            nadi="Normal", mei="Warm", muthiram="Clear", varmam="Balanced"
        )

        # Run migration function
        migrate_envagai_to_json(apps, schema_editor)

        c.refresh_from_db()
        assert c.diagnostic_data["envagai_thervu"]["naa"] == "Normal"
        assert c.diagnostic_data["envagai_thervu"]["niram"] == "Fair"

    def test_migration_step_3_drops_old_columns(self):
        """Old columns are removed after verification"""
        # Verify old columns no longer exist in schema
        pass

    def test_discipline_specific_validation(self):
        """Ayurveda clinics require prakriti, Siddha clinics don't"""
        ayurveda_clinic = Clinic.objects.create(discipline="ayurveda")
        response = self.client.post(
            "/api/v1/consultations/",
            {"diagnostic_data": {}},  # Missing prakriti
            HTTP_X_CLINIC_SLUG=ayurveda_clinic.slug
        )
        assert response.status_code == 400

    def test_csv_export_both_old_and_new(self):
        """Phase 4 export still works during Phase 5 migration"""
        # Verify both old column values and JSON are in export
        pass

    def test_no_cross_clinic_data_visible(self):
        """Clinic A cannot see Clinic B's diagnostic data"""
        clinic_a = Clinic.objects.create(name="A")
        clinic_b = Clinic.objects.create(name="B")

        consultation_b = Consultation.objects.create(
            clinic=clinic_b, patient=patient_b,
            diagnostic_data={"secret": "data"}
        )

        # Clinic A's request should be filtered
        self.client.credentials(HTTP_X_CLINIC_SLUG=clinic_a.slug)
        response = self.client.get("/api/v1/consultations/")
        assert not any(
            c.get("diagnostic_data", {}).get("secret")
            for c in response.data
        )
```

### Code Review Checklist
- [ ] JSONField schema documented (what fields per discipline)
- [ ] Clinic.discipline field added with default="siddha"
- [ ] Migration has three atomic steps with inline tests
- [ ] Serializer validates discipline-specific required fields
- [ ] Frontend forms render correct fields per discipline
- [ ] CSV export/import (Phase 4) handles both old columns and new JSON
- [ ] No cross-tenant data visible in diagnostic_data
- [ ] All diagnostic user input is escaped before rendering
- [ ] Rollback procedure documented
- [ ] Migration test covers data loss prevention
- [ ] Multi-tenant isolation maintained in all queries

---

## Key Files & References

**Institutional Learnings:**
- `/Users/praburajasekaran/Documents/local-htdocs/sivanethram/docs/solutions/security-issues/phase2-team-management-security-review.md` — Multi-tenant security rules, permission patterns, transaction safety
- `/Users/praburajasekaran/Documents/local-htdocs/sivanethram/docs/solutions/security-issues/weasyprint-logo-url-ssrf-allowlist-mitigation.md` — Serializer validation patterns, escaped rendering
- `/Users/praburajasekaran/Documents/local-htdocs/sivanethram/.claude/implementation-patterns-phase1-backend-apis.md` — Nested serializers, field conventions, optional text patterns

**Planning & Architecture:**
- `/Users/praburajasekaran/Documents/local-htdocs/sivanethram/.planning/ROADMAP.md` — Phase 5 requirements and dependencies
- `/Users/praburajasekaran/Documents/local-htdocs/sivanethram/.planning/codebase/ARCHITECTURE.md` — Multi-tenant isolation patterns, key abstractions
- `/Users/praburajasekaran/Documents/local-htdocs/sivanethram/.planning/codebase/CONVENTIONS.md` — Naming, field patterns, error handling

**Current Implementation:**
- `/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/consultations/models.py` — Current Consultation model with hardcoded Envagai Thervu columns
- `/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/clinics/models.py` — Clinic model (where discipline field should be added)
- `/Users/praburajasekaran/Documents/local-htdocs/sivanethram/docs/plans/2026-02-28-feat-phase-4-data-portability-plan.md` — Phase 4 CSV import/export impacts Phase 5

---

## Summary

**No Phase 5-specific solutions existed before this research.** However, **5 critical institutional patterns** from Phases 1–2 directly inform Phase 5 implementation:

1. **Multi-tenant security enforcement** (permission classes verify clinic FK, Serializer trust boundary)
2. **Safe data migration** (atomic transactions, testing, rollback procedures)
3. **Clinic discipline field** (add to Clinic model, use to select forms and validation rules)
4. **JSONField patterns** (null=True, blank=True, default=dict)
5. **Phase 4 coordination** (CSV export/import must handle schema change)

Phase 5 should proceed with confidence in existing patterns, but must:
- Add comprehensive migration tests before dropping old columns
- Coordinate CSV export/import logic with Phase 4
- Maintain multi-tenant isolation through all diagnostic data paths

---

*Research completed: 2026-02-28*
*Relevant institutional learnings synthesized from Phases 1–2 solutions and architecture docs*
