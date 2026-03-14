---
date: 2026-03-14
topic: homeopathy-clinic-workflow
---

# Homeopathy Clinic Workflow

## What We're Building

A full end-to-end homeopathic clinical workflow within the existing Sivanethram clinic OS, covering:

1. **Structured case-taking** — a discipline-specific diagnostic form for homeopathy (mental generals, physical generals, chief complaints with modalities)
2. **Remedy + potency prescribing** — extend the prescription/medication model to carry potency (e.g., Sulphur 200C, Nat Mur 1M) with a full homeopathic remedy catalog in pharmacy
3. **Remedy response follow-up** — a new follow-up model for tracking how the patient responded to a remedy and what action was taken (continue / change potency / change remedy)

The homeopathy discipline is already declared in `Clinic.discipline`. The system currently assigns only a bare `notes` field to it. This design gives it a first-class workflow matching the depth of the Ayurveda/Siddha disciplines.

**Target users:** Indian BHMS-qualified homeopaths practicing classical Hahnemannian homeopathy, treating both acute and chronic patients.

---

## Why This Approach

We evaluated three approaches:

**A — Pure extension of existing models:** Extend `diagnostic_data` JSONField, add potency fields to `Medication`, add homeopathic pharmacy categories. Pure extension, no new tables, maximum reuse of existing patterns.

**B — New standalone homeopathy models:** Fully separate models for homeopathic case records, remedies, and follow-ups. Clean separation but duplicates existing infrastructure.

**C — Hybrid (recommended):** Extend where existing models are a good fit; introduce new models only for genuinely new concepts. Follows the existing `diagnostic_data` discipline pattern for case-taking, extends `Medication` and `Medicine` for remedy/potency, and adds one new model (`RemedyFollowUpResponse`) for remedy response — a concept with no analog in the current system.

We choose **Approach C** because:
- It follows the established pattern of adding discipline-specific data to `diagnostic_data` without DB migrations (as Siddha and Ayurveda already do)
- Remedy follow-up response is genuinely new and deserves its own model rather than being shoehorned into `SessionFeedback` (which is procedure-therapy-oriented)
- It avoids duplicating the `Patient`, `Consultation`, and `Prescription` infrastructure that already exists and works well

---

## Key Decisions

### 1. Diagnostic Data Schema for Homeopathy

Extend `DISCIPLINE_SCHEMA_KEYS` in `consultations/serializers.py` to map `homeopathy` to a structured key (e.g., `homeopathy_case`) with a validated schema:

```json
{
  "homeopathy_case": {
    "chief_complaints": [
      {
        "complaint": "Headache",
        "duration": "3 months",
        "location": "Right temporal",
        "modalities": {
          "worse": ["heat", "morning"],
          "better": ["cold application", "pressure"]
        },
        "concomitants": "Nausea, photophobia"
      }
    ],
    "mental_generals": {
      "mood": "",
      "fears": "",
      "grief": "",
      "irritability": "",
      "dreams": "",
      "notes": ""
    },
    "physical_generals": {
      "thermals": "chilly",
      "thirst": "excessive",
      "perspiration": "",
      "sleep": "",
      "notes": ""
    },
    "miasmatic_classification": "psoric",
    "constitutional_notes": "",
    "notes": ""
  }
}
```

`miasmatic_classification` choices: `psoric`, `sycotic`, `syphilitic`, `tubercular`, `cancer`, `mixed`, `unknown`.

This requires no DB migration — only a new JSON schema and frontend form.

### 2. Potency & Dilution in Prescriptions

Add two nullable fields to the `Medication` model (existing table, additive migration):

- `potency` — CharField (e.g., "30C", "200C", "1M", "LM1", "Q") — free text to handle the full range
- `dilution_scale` — CharField choices: `C` (centesimal), `X` (decimal), `LM`, `Q` (mother tincture)

When `clinic.discipline == homeopathy`, the prescription form surfaces these fields. They are ignored for other disciplines.

### 3. Pharmacy — Homeopathic Remedy Categories

Add to `Medicine.CATEGORY_CHOICES`:

- `mother_tincture` — Mother Tincture (Q)
- `trituration` — Trituration (3X, 6X)
- `centesimal` — Centesimal Potency (6C, 30C, 200C, 1M, 10M, CM)
- `lm_potency` — LM Potency (LM1, LM2…)
- `biochemic` — Biochemic Tissue Salt

Stock tracking, dispensing, and purchase flows reuse the existing `StockEntry` and `DispensingRecord` infrastructure unchanged.

### 4. Remedy Follow-Up Response Model (New)

A new model `RemedyFollowUpResponse` linked to a `Prescription`:

| Field | Type | Notes |
|---|---|---|
| `clinic` | FK → Clinic | Tenant scoping |
| `prescription` | FK → Prescription | The follow-up prescription being recorded at |
| `previous_prescription` | FK → Prescription (nullable) | The prescription being evaluated |
| `remedy_evaluated` | FK → Medication (nullable) | The specific remedy being assessed |
| `response_type` | choices | `amelioration`, `aggravation`, `partial_response`, `no_change`, `return_of_old_symptoms`, `new_symptoms` |
| `action_taken` | choices | `continue_same`, `increase_potency`, `decrease_potency`, `change_remedy`, `wait_and_watch`, `antidote` |
| `new_potency` | CharField (nullable) | If potency changed, the new value |
| `notes` | TextField | Doctor's narrative on the response |

This model surfaces in the follow-up queue when a patient returns after a prescription with a homeopathic remedy. It replaces the Ayurveda/Siddha `SessionFeedback` concept for homeopathy cases.

### 5. No Repertorization Engine

The doctor selects the remedy manually based on their training. The app records the decision, not the reasoning process. Repertorization (Kent rubric lookup, Synthesis database) is explicitly out of scope — doctors use Radar Opus / MacRepertory externally and record the final prescription here.

### 6. Treatment Plans — Not Applicable for Homeopathy

The `TreatmentPlan / TreatmentBlock / TreatmentSession` model is procedure/therapy-oriented (daily sessions with a therapist). Homeopathy does not have multi-session daily procedures. It is consultation-and-remedy-based with periodic follow-ups. The treatment plan workflow is not extended to homeopathy.

### 7. Follow-Up Queue Integration

The existing `follow_ups_list` in `config/views.py` already surfaces `legacy` follow-up items from `Prescription.follow_up_date`. Homeopathy follow-ups will use this same mechanism. When a patient arrives for a follow-up, the doctor can record a `RemedyFollowUpResponse` as part of the new consultation's prescription.

---

## Resolved Questions

1. **Constitutional remedy history** → **Yes — track on patient profile.** A timeline of constitutional remedies tried over the patient's history will be derived from prescription history and surfaced on the Patient detail page. Critical for chronic case management.

2. **Bilingual remedy instructions** → **Yes — Tamil translations.** Dosage/instruction fields on homeopathic medications will follow the existing `_ta` bilingual pattern, matching `diet_advice_ta`, `lifestyle_advice_ta`, etc.

3. **Miasmatic classification visibility** → Internal clinical data only (not printed on prescription). Standard for Indian clinical practice.

4. **Pellet count** → **Explicit `pellet_count` field** (integer). Added alongside `potency` and `dilution_scale` on the `Medication` model.

5. **Single vs. multi-remedy prescribing** → **Multiple remedies allowed.** Indian homeopaths commonly prescribe intercurrent and complementary remedies. The UI allows multiple medications (as it does today) with potency fields on each.

## Open Questions

_None — all questions resolved._

---

## Next Steps

Once open questions are resolved, this feeds into `/workflows:plan` to generate the implementation plan covering:

1. `diagnostic_data` schema extension + frontend form for homeopathy case-taking
2. `Medication` model migration (potency + dilution_scale fields)
3. `Medicine.CATEGORY_CHOICES` extension for homeopathic categories
4. New `RemedyFollowUpResponse` model + API
5. Follow-up queue integration for remedy response
6. Frontend forms for remedy prescribing and follow-up response recording
