# Clinical UI Enhancements Implementation Plan

**Goal:** Implement the remaining Phase 1 clinical UI best practices: bilingual labels, dosha chips, medication timing, paper size toggle, phone-priority search, touch target hardening, accessibility improvements, and global print styles.

**Architecture:** Enhancement pass on existing Next.js 14 frontend components. No new pages, no backend changes, no new dependencies.

**Design:** See `docs/plans/2026-02-17-feat-clinical-ui-enhancements-design.md`

**Research:** See `docs/research/clinical-ui-best-practices.md` sections 2, 3, 4, 6, 7, 8, 9

---

### Task 1: Create bilingual constants and BilingualLabel component

**Files:**
- Create: `frontend/src/lib/constants/bilingual-labels.ts`
- Create: `frontend/src/components/ui/BilingualLabel.tsx`

**Step 1: Create bilingual labels constants**

`frontend/src/lib/constants/bilingual-labels.ts`:
```typescript
// Section headers
export const SECTION_LABELS = {
  vitals: { en: "Vitals", ta: "உடல் அளவுகள்" },
  generalAssessment: { en: "General Assessment", ta: "பொது மதிப்பீடு" },
  envagaiThervu: { en: "Envagai Thervu", ta: "எண்வகைத் தேர்வு" },
  chiefComplaints: { en: "Chief Complaints", ta: "முக்கிய குறைகள்" },
  diagnosis: { en: "Diagnosis", ta: "நோய் கண்டறிதல்" },
  medications: { en: "Medications", ta: "மருந்துகள்" },
  procedures: { en: "Procedures", ta: "சிகிச்சைகள்" },
  advice: { en: "Advice", ta: "அறிவுரை" },
  followUp: { en: "Follow-up", ta: "மறு ஆய்வு" },
  patientDetails: { en: "Patient Details", ta: "நோயாளி விவரங்கள்" },
} as const;

// Vitals field labels
export const VITALS_LABELS = {
  weight: { en: "Weight", ta: "எடை" },
  height: { en: "Height", ta: "உயரம்" },
  pulseRate: { en: "Pulse Rate", ta: "நாடி விகிதம்" },
  temperature: { en: "Temperature", ta: "வெப்பநிலை" },
  bpSystolic: { en: "BP Systolic", ta: "இரத்த அழுத்தம் (மேல்)" },
  bpDiastolic: { en: "BP Diastolic", ta: "இரத்த அழுத்தம் (கீழ்)" },
} as const;

// General assessment labels
export const ASSESSMENT_LABELS = {
  appetite: { en: "Appetite", ta: "பசி" },
  bowel: { en: "Bowel", ta: "மலம்" },
  micturition: { en: "Micturition", ta: "சிறுநீர்" },
  sleep: { en: "Sleep", ta: "தூக்கம்" },
} as const;

// Medication field labels
export const MEDICATION_LABELS = {
  drugName: { en: "Drug Name", ta: "மருந்தின் பெயர்" },
  dosage: { en: "Dosage", ta: "அளவு" },
  frequency: { en: "Frequency", ta: "எத்தனை வேளை" },
  timing: { en: "Timing", ta: "நேரம்" },
  duration: { en: "Duration", ta: "காலம்" },
  instructions: { en: "Instructions", ta: "வழிமுறைகள்" },
} as const;

// Advice section labels
export const ADVICE_LABELS = {
  diet: { en: "Diet", ta: "உணவுக் கட்டுப்பாடு" },
  lifestyle: { en: "Lifestyle", ta: "வாழ்க்கைமுறை" },
  exercise: { en: "Exercise", ta: "உடற்பயிற்சி" },
} as const;

// Print-specific headers
export const PRINT_LABELS = {
  rxMedications: { en: "Rx MEDICATIONS", ta: "மருந்துகள்" },
  diagnosis: { en: "DIAGNOSIS", ta: "நோய் கண்டறிதல்" },
  procedures: { en: "PROCEDURES", ta: "சிகிச்சைகள்" },
  advice: { en: "ADVICE", ta: "அறிவுரை" },
  followUp: { en: "FOLLOW-UP", ta: "மறு ஆய்வு" },
  patientDetails: { en: "PATIENT DETAILS", ta: "நோயாளி விவரங்கள்" },
} as const;
```

**Step 2: Create BilingualLabel component**

`frontend/src/components/ui/BilingualLabel.tsx`:
```tsx
type BilingualLabelProps = {
  english: string;
  tamil: string;
  required?: boolean;
  htmlFor?: string;
  as?: "label" | "span" | "h3";
  className?: string;
};

export function BilingualLabel({
  english,
  tamil,
  required,
  htmlFor,
  as: Tag = "label",
  className = "",
}: BilingualLabelProps) {
  const baseProps = Tag === "label" ? { htmlFor } : {};

  return (
    <Tag {...baseProps} className={`block ${className}`}>
      <span className="text-sm font-medium text-gray-700">{english}</span>
      <span className="ml-1.5 font-tamil text-xs text-gray-500">{tamil}</span>
      {required && (
        <>
          <span className="text-red-600" aria-hidden="true"> *</span>
          <span className="sr-only">(required)</span>
        </>
      )}
    </Tag>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/src/lib/constants/bilingual-labels.ts frontend/src/components/ui/BilingualLabel.tsx
git commit -m "feat(ui): add BilingualLabel component and Tamil translation constants"
```

---

### Task 2: Create DoshaChip component

**Files:**
- Create: `frontend/src/components/ui/DoshaChip.tsx`

**Step 1: Create DoshaChip component**

Reference: `docs/research/clinical-ui-best-practices.md` Section 9 — Dosha Color System

`frontend/src/components/ui/DoshaChip.tsx`:
```tsx
"use client";

import { Wind, Flame, Droplet } from "lucide-react";

const DOSHA_CONFIG = {
  vatham: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    icon: Wind,
    label: "Vatham",
    labelTamil: "வாதம்",
  },
  pitham: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    icon: Flame,
    label: "Pitham",
    labelTamil: "பித்தம்",
  },
  kapham: {
    bg: "bg-teal-100",
    text: "text-teal-700",
    icon: Droplet,
    label: "Kapham",
    labelTamil: "கபம்",
  },
} as const;

type DoshaChipProps = {
  dosha: keyof typeof DOSHA_CONFIG;
  showTamil?: boolean;
};

export function DoshaChip({ dosha, showTamil = true }: DoshaChipProps) {
  const config = DOSHA_CONFIG[dosha];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ${config.bg} ${config.text}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
      {showTamil && (
        <span className="font-tamil text-xs opacity-75">
          {config.labelTamil}
        </span>
      )}
    </span>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/ui/DoshaChip.tsx
git commit -m "feat(ui): add DoshaChip component with color-coded dosha indicators"
```

---

### Task 3: Add timing options to medication constants

**Files:**
- Modify: `frontend/src/lib/constants/envagai-options.ts`

**Step 1: Add TIMING_OPTIONS**

Add after the existing `DOSAGE_UNITS` export:

```typescript
export const TIMING_OPTIONS = [
  { value: "before_food" as const, label: "Before food", tamil: "உணவுக்கு முன்" },
  { value: "after_food" as const, label: "After food", tamil: "உணவுக்குப் பின்" },
  { value: "with_food" as const, label: "With food", tamil: "உணவுடன்" },
  { value: "empty_stomach" as const, label: "Empty stomach", tamil: "வெறும் வயிற்றில்" },
] as const;
```

**Step 2: Commit**

```bash
git add frontend/src/lib/constants/envagai-options.ts
git commit -m "feat(constants): add medication timing options with Tamil labels"
```

---

### Task 4: Upgrade MedicationRow with timing dropdown and bilingual labels

**Files:**
- Modify: `frontend/src/components/prescriptions/MedicationRow.tsx`
- Modify: `frontend/src/components/prescriptions/PrescriptionBuilder.tsx` (update MedicationData type if needed)

**Step 1: Add timing field to MedicationData type**

Add `timing` and `timing_tamil` to the MedicationData type:

```typescript
type MedicationData = {
  drug_name: string;
  dosage_amount: string;
  dosage_unit: string;
  frequency: string;
  frequency_tamil: string;
  timing: string;
  timing_tamil: string;
  duration: string;
  instructions: string;
};
```

**Step 2: Add timing dropdown to MedicationRow**

Import `TIMING_OPTIONS` and `BilingualLabel`. Add a timing Select between Frequency and Duration:

```tsx
<div>
  <BilingualLabel english="Timing" tamil="நேரம்" />
  <Select
    value={data.timing}
    onChange={(e) => {
      onChange("timing", e.target.value);
      const opt = TIMING_OPTIONS.find((t) => t.value === e.target.value);
      if (opt) onChange("timing_tamil", opt.tamil);
    }}
  >
    <option value="">Select timing</option>
    {TIMING_OPTIONS.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </Select>
  {data.timing_tamil && (
    <p className="mt-1 font-tamil text-xs text-gray-500">{data.timing_tamil}</p>
  )}
</div>
```

**Step 3: Replace all existing plain labels with BilingualLabel**

Replace `Drug Name` label with `<BilingualLabel english="Drug Name" tamil="மருந்தின் பெயர்" />`, etc. for Dosage, Frequency, Duration, Instructions.

**Step 4: Update PrescriptionBuilder**

Update the default medication object in PrescriptionBuilder to include `timing: ""` and `timing_tamil: ""`.

**Step 5: Commit**

```bash
git add frontend/src/components/prescriptions/MedicationRow.tsx frontend/src/components/prescriptions/PrescriptionBuilder.tsx
git commit -m "feat(prescription): add timing dropdown and bilingual labels to MedicationRow"
```

---

### Task 5: Add bilingual labels to ConsultationForm sections

**Files:**
- Modify: `frontend/src/components/consultations/ConsultationForm.tsx`

**Step 1: Update SECTIONS array to include Tamil labels**

```typescript
const SECTIONS = [
  { id: "vitals", label: "Vitals", labelTamil: "உடல் அளவுகள்" },
  { id: "general-assessment", label: "General Assessment", labelTamil: "பொது மதிப்பீடு" },
  { id: "envagai-thervu", label: "Envagai Thervu", labelTamil: "எண்வகைத் தேர்வு" },
  { id: "diagnosis-section", label: "Diagnosis", labelTamil: "நோய் கண்டறிதல்" },
];
```

**Step 2: Update section nav to show Tamil text**

In both the desktop sidebar nav and mobile pill bar, add Tamil text below/beside the English label using `font-tamil text-xs text-gray-500`.

**Step 3: Update FormSection titles to show Tamil alongside English**

Where FormSection titles are rendered as `<h3>`, add the Tamil translation:
```tsx
<FormSection
  id="vitals"
  title={
    <>
      Vitals <span className="font-tamil text-xs font-normal text-gray-500">உடல் அளவுகள்</span>
    </>
  }
>
```

Or if FormSection accepts string-only title, update it to accept `ReactNode`.

**Step 4: Add BilingualLabel to vitals field labels**

Replace plain "Weight" labels with `<BilingualLabel english="Weight" tamil="எடை" />` for Weight, Height, Pulse Rate, Temperature, BP.

**Step 5: Add BilingualLabel to general assessment labels**

Replace Appetite, Bowel, Micturition, Sleep labels with bilingual versions.

**Step 6: Commit**

```bash
git add frontend/src/components/consultations/ConsultationForm.tsx
git commit -m "feat(consultation): add bilingual Tamil labels to form sections and fields"
```

---

### Task 6: Add DoshaChip to EnvagaiThervu Nadi section

**Files:**
- Modify: `frontend/src/components/consultations/EnvagaiThervu.tsx`

**Step 1: Import DoshaChip**

**Step 2: After the Nadi type select, conditionally render DoshaChip**

When the Nadi `type` field value is "Vatham", "Pitham", or "Kapham", show the corresponding DoshaChip below the select:

```tsx
{key === "nadi" && getFieldValue(values[key] ?? "", "type") && (
  <div className="mt-1">
    <DoshaChip
      dosha={getFieldValue(values[key] ?? "", "type").toLowerCase() as "vatham" | "pitham" | "kapham"}
    />
  </div>
)}
```

Handle the "Thondham" (mixed) case by not showing a chip, or showing multiple.

**Step 3: Commit**

```bash
git add frontend/src/components/consultations/EnvagaiThervu.tsx
git commit -m "feat(envagai): show DoshaChip for Nadi pulse type selection"
```

---

### Task 7: Add bilingual labels to PrescriptionBuilder sections

**Files:**
- Modify: `frontend/src/components/prescriptions/PrescriptionBuilder.tsx`

**Step 1: Import BilingualLabel and SECTION_LABELS**

**Step 2: Update section headers**

Replace "Medications" title in FormSection with bilingual version. Same for Procedures, Advice (Diet/Lifestyle/Exercise), Follow-up.

**Step 3: Commit**

```bash
git add frontend/src/components/prescriptions/PrescriptionBuilder.tsx
git commit -m "feat(prescription): add bilingual section headers to PrescriptionBuilder"
```

---

### Task 8: Phone-priority search hint in PatientTable

**Files:**
- Modify: `frontend/src/components/patients/PatientTable.tsx`

**Step 1: Detect digit-first input**

Add a computed variable that checks if the search query starts with a digit:

```typescript
const isPhoneSearch = /^\d/.test(query);
```

**Step 2: Show contextual search hint**

Below the search input, show a hint:
```tsx
{query.length > 0 && (
  <p className="mt-1 text-xs text-gray-500">
    {isPhoneSearch
      ? "Searching by phone number..."
      : query.match(/^PAT-/)
        ? "Searching by record ID..."
        : "Searching by name..."
    }
  </p>
)}
```

**Step 3: Commit**

```bash
git add frontend/src/components/patients/PatientTable.tsx
git commit -m "feat(search): add phone-priority search hint for digit-first queries"
```

---

### Task 9: Paper size toggle and bilingual print view

**Files:**
- Modify: `frontend/src/app/prescriptions/[id]/print/page.tsx`
- Modify: `frontend/src/app/prescriptions/[id]/print/PrintTrigger.tsx`

**Step 1: Add paper size toggle (client component)**

Create a small client component `PaperSizeToggle` or add it to `PrintTrigger.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Select } from "@/components/ui/Select";

export function PrintTrigger() {
  const [paperSize, setPaperSize] = useState<"a5" | "a4">("a5");

  return (
    <>
      <div className="no-print mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Paper Size</label>
        <Select
          value={paperSize}
          onChange={(e) => setPaperSize(e.target.value as "a5" | "a4")}
          className="w-40"
        >
          <option value="a5">A5 (Half page)</option>
          <option value="a4">A4 (Full page)</option>
        </Select>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Print
        </button>
      </div>
      <style>{`
        @media print {
          @page { size: ${paperSize} portrait; }
        }
      `}</style>
    </>
  );
}
```

**Step 2: Add bilingual section headers to print view**

Replace plain text headers with bilingual versions:
- "Rx MEDICATIONS / மருந்துகள்"
- "DIAGNOSIS / நோய் கண்டறிதல்"
- "Procedures: / சிகிச்சைகள்:"
- "Advice: / அறிவுரை:"
- "Follow-up Date: / மறு ஆய்வு:"

**Step 3: Add timing column to medication table if present**

If medication has timing data, show it in the print table.

**Step 4: Commit**

```bash
git add frontend/src/app/prescriptions/[id]/print/
git commit -m "feat(print): add A4/A5 toggle and bilingual headers to print view"
```

---

### Task 10: Global print stylesheet

**Files:**
- Modify: `frontend/src/app/globals.css`

**Step 1: Add comprehensive print styles**

Reference: `docs/research/clinical-ui-best-practices.md` Section 7

```css
@media print {
  nav,
  .sidebar,
  .no-print,
  button:not(.print-include),
  footer {
    display: none !important;
  }

  @page {
    margin: 15mm 12mm 20mm 12mm;
  }

  body {
    font-size: 11pt;
    line-height: 1.4;
    color: #000 !important;
    background: white !important;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  a {
    color: #000 !important;
    text-decoration: none !important;
  }

  .card, .panel {
    box-shadow: none !important;
  }

  .prescription-header,
  .medication-item,
  .advice-section {
    break-inside: avoid;
  }

  table {
    break-inside: avoid;
  }
}
```

**Step 2: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat(print): add global print stylesheet with medical layout rules"
```

---

### Task 11: Touch target and accessibility hardening

**Files:**
- Modify: `frontend/src/components/ui/Select.tsx`
- Modify: `frontend/src/components/ui/Input.tsx`
- Modify: `frontend/src/components/ui/Button.tsx`
- Modify: `frontend/src/components/consultations/ConsultationForm.tsx` (toggle buttons)
- Modify: `frontend/src/components/consultations/EnvagaiThervu.tsx`

**Step 1: Audit and fix touch targets**

Ensure all interactive elements have `min-h-[44px]`:
- Select already uses `h-11` (44px) -- PASS
- Input already uses `h-11` (44px) -- PASS
- Button sm variant uses `h-9` (36px) -- needs `min-h-[44px]` or bump to `h-11`
- Toggle buttons in ConsultationForm (Normal/Abnormal) -- verify 44px height
- Remove button on MedicationRow (`p-1.5`) -- needs `min-h-[44px] min-w-[44px]`

**Step 2: Add aria-live regions**

In ConsultationForm, add an aria-live region for auto-save status:
```tsx
<div aria-live="polite" className="sr-only">
  {isSaving ? "Saving draft..." : "Draft saved"}
</div>
```

In PrescriptionBuilder, add aria-live for medication add/remove:
```tsx
<div aria-live="polite" className="sr-only">
  {`${medications.length} medication${medications.length !== 1 ? "s" : ""} in prescription`}
</div>
```

In PatientTable, add aria-live for search results:
```tsx
<div aria-live="polite" className="sr-only">
  {`${results.length} patient${results.length !== 1 ? "s" : ""} found`}
</div>
```

**Step 3: Ensure consistent focus rings**

Verify all Input, Select, Button components use `focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2` (not `ring-1`). Update if inconsistent.

**Step 4: Commit**

```bash
git add frontend/src/components/
git commit -m "feat(a11y): enforce 44px touch targets and add aria-live announcements"
```

---

### Task 12: Verify and test

**Step 1: Run linter**

```bash
cd frontend && npm run lint
```

**Step 2: Run build**

```bash
npm run build
```

**Step 3: Fix any issues**

**Step 4: Final commit if needed**

---

## Verification Checklist

After all tasks complete, verify:

- [ ] BilingualLabel renders English + Tamil across all clinical forms
- [ ] DoshaChip appears when Nadi type is selected in Envagai Thervu
- [ ] MedicationRow has timing dropdown with Tamil translations
- [ ] ConsultationForm sections show Tamil alongside English
- [ ] PrescriptionBuilder sections show Tamil alongside English
- [ ] Print view has bilingual headers
- [ ] A4/A5 paper size toggle works on print page
- [ ] Phone-first search shows "Searching by phone number..." hint
- [ ] All buttons and interactive elements are at least 44px touch targets
- [ ] aria-live regions announce medication count, save status, search results
- [ ] Global print stylesheet hides nav and formats correctly
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] No console errors
