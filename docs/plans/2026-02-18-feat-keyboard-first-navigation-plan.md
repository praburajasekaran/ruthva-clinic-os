---
title: "feat: Keyboard-First Navigation for Clinic App"
type: feat
status: completed
date: 2026-02-18
---

# ✨ feat: Keyboard-First Navigation for Clinic App

## Overview

Transform the Siddha clinic management app into a **keyboard-first** experience so the doctor can register patients, search records, navigate between screens, and submit consultations without touching the mouse. All shortcuts are **visible on screen at all times** — no memorisation required.

The feature covers:
1. Global shortcut to open the New Patient form (`N`)
2. Tab-through form fields with Enter-to-submit and full validation
3. Global fuzzy search modal (`/` or `Ctrl+K`) with arrow-key result navigation
4. Patient-context shortcuts (navigate to new consultation, view prescription, back to patient)
5. Persistent, visible keyboard hint badges throughout the UI

---

## Problem Statement / Motivation

The doctor uses this app constantly during clinic hours. Reaching for the mouse between every action breaks focus and slows the workflow. Keyboard-first navigation eliminates that friction. Tamil IME input is already common for the doctor, so the shortcut system must not interfere with text composition.

---

## Definitive Shortcut Key Map

| Key | Context | Action | Suppressed When |
|-----|---------|--------|-----------------|
| `N` | Anywhere | Navigate to `/patients/new` | Focus in input/textarea/select, already on `/patients/new`, search modal open |
| `/` | Anywhere | Open search modal | Focus in input/textarea/select (use `Ctrl+K` instead) |
| `Ctrl+K` | Anywhere | Open search modal | Never suppressed |
| `Escape` | Search modal open | Close search modal, restore focus | — |
| `↓` | Search modal | Move highlight down results list | Loading state |
| `↑` | Search modal | Move highlight up; at first result → return to input | Loading state |
| `Enter` | Search modal, result highlighted | Navigate to `/patients/:id` | — |
| `Enter` | Search modal, no highlight | Submit search (navigate to first result) | No results |
| `C` | On `/patients/:id` | Navigate to `/patients/:id/consultations/new` | Focus in input |
| `P` | On `/consultations/:id` | Navigate to prescription for this consultation | Focus in input, no prescription exists |
| `H` | On `/consultations/:id` or `/prescriptions/:id` | Navigate back to parent patient detail | Focus in input |

**Primary displayed shortcut:** `Ctrl+K` for search (canonical, cross-platform). `/` also works as an alias.

---

## Proposed Solution

### Architecture

A new `"use client"` `KeyboardProvider` component is inserted inside `layout.tsx`. It:
- Registers a single `document` `keydown` listener
- Owns the `searchOpen` boolean state via React Context
- Renders the `CommandPalette` modal
- Dispatches route navigation via `useRouter`

Patient-context shortcuts (`C`, `P`, `H`) are handled in a separate `usePatientShortcuts` hook mounted in each relevant page component, so they only fire in the right route context.

### IME Guard (Critical)

All shortcut handlers call a shared utility first:

```ts
// lib/keyboard.ts
export function isShortcutSuppressed(e: KeyboardEvent): boolean {
  if (e.isComposing) return true; // Tamil IME mid-composition
  const tag = (e.target as HTMLElement).tagName;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return true;
  if ((e.target as HTMLElement).isContentEditable) return true;
  return false;
}
```

### Component Architecture

```
layout.tsx
  └── KeyboardProvider (client)          ← new: registers keydown, owns searchOpen state
        ├── CommandPalette (client)       ← new: fuzzy search modal
        ├── ShortcutsContext              ← new: React context
        └── {children}
              ├── Sidebar.tsx             ← modified: add KbdBadge hints
              └── pages/
                    ├── patients/[id]     ← modified: usePatientShortcuts(id)
                    ├── consultations/[id]← modified: usePatientShortcuts(id, consultationId)
                    └── prescriptions/[id]← modified: usePatientShortcuts(id, prescriptionId)
```

---

## Technical Approach

### Phase 1: Infrastructure & Guard Layer

**Files to create:**

**`frontend/src/lib/keyboard.ts`**
```ts
export function isShortcutSuppressed(e: KeyboardEvent): boolean { ... }
```

**`frontend/src/components/layout/KeyboardProvider.tsx`**
```tsx
"use client";
// React context: { searchOpen, openSearch, closeSearch }
// useEffect → document.addEventListener("keydown", handler)
// handler: isShortcutSuppressed guard → switch(e.key) { "n": router.push, "/": openSearch, "k": openSearch (ctrl) }
// Renders <CommandPalette open={searchOpen} onClose={closeSearch} />
```

**Files to modify:**

**`frontend/src/app/layout.tsx`**
```tsx
// Before: <Sidebar /> + {children} as server component
// After: wrap {children} in <KeyboardProvider>
// layout.tsx stays as server component; KeyboardProvider is a client island
```

### Phase 2: New Patient Shortcut + Form Tab Order

**`frontend/src/components/patients/PatientForm.tsx`** (minor modification)
- No change needed for Tab order — native HTML handles it
- Verify `<form onSubmit={handleSubmit}>` — Enter already submits (confirmed)
- Add `aria-expanded` to the `FormSection` toggle buttons (prerequisite for correct Tab flow through collapsed sections)

**`frontend/src/components/forms/FormSection.tsx`** (one-line fix)
```tsx
// Add aria-expanded={isOpen} to the toggle <button>
<button
  type="button"
  aria-expanded={isOpen}     // ← add this
  onClick={() => setIsOpen(!isOpen)}
>
```

**Validation already exists in `PatientForm` (line 21-82):**
- Phone: `/^[6-9]\d{9}$/` ✅
- Name, Age, Gender: required validation ✅
- Email: uses browser `type="email"` validation ✅
- On error: focuses first `aria-invalid="true"` field ✅

**No new validation logic needed.**

### Phase 3: Fuzzy Search Modal (CommandPalette)

**`frontend/src/components/layout/CommandPalette.tsx`** (new)

```tsx
"use client";
// Props: open: boolean, onClose: () => void

// State:
// - selectedIndex: number (-1 = input focused)
// - useDebouncedSearch reused, pointed at /patients/ with ?page_size=8

// ARIA contract:
// - <dialog role="dialog" aria-modal="true" aria-label="Search patients">
// - <input role="combobox" aria-expanded aria-controls="search-results" aria-autocomplete="list" aria-activedescendant>
// - <ul role="listbox" id="search-results">
//     <li role="option" aria-selected id="result-{i}">

// Keyboard handling (inside modal):
// - ArrowDown: selectedIndex = min(selectedIndex + 1, results.length - 1)
// - ArrowUp: selectedIndex > 0 ? selectedIndex - 1 : (focus input, selectedIndex = -1)
// - Enter: navigate to /patients/results[selectedIndex].id
// - Escape: onClose()

// Focus trap: Tab and Shift+Tab cycle within modal only
// Focus restored to previously focused element on close

// Result row displays: name (bold) + phone + record_id
// States: idle (no query), too-short (1 char), loading, no-results, results
// Max 8 results (?page_size=8 param added to useDebouncedSearch call)

// Backdrop click → onClose()
```

**`useDebouncedSearch` hook** — no changes needed. Pass `{ extraParams: { page_size: 8 } }` or append to URL.

### Phase 4: Patient Context Shortcuts

**`frontend/src/hooks/usePatientShortcuts.ts`** (new)

```ts
// Args: patientId, consultationId?, prescriptionId?
// Registers keydown on document
// C → router.push(`/patients/${patientId}/consultations/new`)
// H → router.push(`/patients/${patientId}`)
// P → if consultationId && prescription exists: router.push(`/prescriptions/${prescriptionId}`)
// All check isShortcutSuppressed()
// Cleanup on unmount
```

**Files to modify:**

| File | Change |
|------|--------|
| `frontend/src/app/patients/[id]/page.tsx` | Add client wrapper, call `usePatientShortcuts(patientId)` |
| `frontend/src/app/consultations/[id]/page.tsx` | Add client wrapper, call `usePatientShortcuts(patientId, consultationId, prescriptionId)` |
| `frontend/src/app/prescriptions/[id]/page.tsx` | Add client wrapper, call `usePatientShortcuts(patientId)` |

### Phase 5: Visible Shortcut Hints

**`frontend/src/components/ui/KbdBadge.tsx`** (new)
```tsx
// <kbd className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-600">
//   {children}
// </kbd>
// Props: keys: string[] (renders as "Ctrl" + "K" or just "N")
```

**Hints placement strategy:**

1. **Sidebar nav items** — add `<KbdBadge>` inline next to each nav item label:
   - Patients → `[N]` (new patient) and `[Ctrl+K]` (search)
   - Shown only on `md:` breakpoint (desktop), hidden on mobile

2. **PatientBanner component** — add `[C]` hint near "New Consultation" button, `[H]` near patient name link

3. **Print layout exclusion** — hints are `no-print` via `className="no-print"` (existing print CSS hides `.no-print`)

4. **`?` toggle** — pressing `?` shows/hides an expanded shortcut reference overlay (nice-to-have, Phase 5b)

**Sidebar.tsx** (modified):
```tsx
// Existing: <span>Patients</span>
// After:    <span>Patients</span> <KbdBadge keys={["N"]} aria-label="Press N to register new patient" />
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] Pressing `N` anywhere outside a text input navigates to `/patients/new`
- [ ] `N` is suppressed when focus is in any `<input>`, `<textarea>`, or `<select>`, and when `e.isComposing` is true (Tamil IME guard)
- [ ] `N` is suppressed when already on `/patients/new`
- [ ] Pressing `/` or `Ctrl+K` opens the search modal
- [ ] `/` is suppressed when focus is in an input; `Ctrl+K` is never suppressed
- [ ] Search modal auto-focuses the search input on open
- [ ] Typing ≥ 2 characters triggers `useDebouncedSearch` after 300ms
- [ ] Results show: name (bold), phone, record_id — capped at 8 results
- [ ] `↓` / `↑` navigate through results; `↑` at first result returns focus to search input
- [ ] `Enter` on a highlighted result navigates to `/patients/:id` and closes modal
- [ ] `Escape` closes modal and restores focus to previously focused element
- [ ] Clicking the backdrop closes the modal
- [ ] `C` on `/patients/:id` navigates to `/patients/:id/consultations/new` (suppressed in inputs)
- [ ] `H` on `/consultations/:id` or `/prescriptions/:id` navigates to parent patient detail
- [ ] `P` on `/consultations/:id` navigates to the prescription if one exists (no-op if none)
- [ ] Keyboard shortcut badges (`KbdBadge`) visible in Sidebar on desktop
- [ ] Shortcut badges hidden in `@media print`
- [ ] `FormSection` toggle button has `aria-expanded` attribute
- [ ] Enter submits the PatientForm (already works natively — verify not broken)

### Non-Functional Requirements

- [ ] No keyboard shortcuts fire during Tamil IME composition (`e.isComposing === true`)
- [ ] Focus trap inside CommandPalette (Tab cycles within modal only)
- [ ] `aria-modal="true"` on CommandPalette dialog
- [ ] `aria-live="polite"` region announces result count when results load
- [ ] Result list uses `role="listbox"` / `role="option"` / `aria-selected` / `aria-activedescendant`
- [ ] All Input/Select/Button components retain existing `focus-visible:ring-emerald-500` focus rings
- [ ] `text-base` (16px min) preserved on all inputs — no iOS Safari zoom regression
- [ ] No `localStorage` usage — shortcut state is ephemeral (in-memory React state only)
- [ ] KbdBadge does not render on mobile (`hidden md:inline` Tailwind class)
- [ ] CommandPalette z-index does not conflict with `z-30` (ConsultationForm pill bar) or `z-40`/`z-50` (Sidebar mobile overlay) — use `z-50` for modal backdrop, `z-60` for modal panel

### Quality Gates

- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] No new Tailwind purge misses (classes used as template literals are safelisted)
- [ ] Tested with Tamil IME — shortcuts do not fire during composition
- [ ] Tested in Chrome and Safari
- [ ] `aria-expanded` added to `FormSection` without breaking existing form layout

---

## Edge Cases & Resolutions

| Edge Case | Resolution |
|-----------|-----------|
| `N` pressed while search modal is open | Suppressed — modal input has focus, input-focus guard fires |
| `N` pressed on `/patients/new` | Suppressed by route check in `KeyboardProvider` |
| `↑` at first search result | Return focus to search input (not wraparound) |
| No results in search modal + `Enter` | No-op |
| `P` shortcut when no prescription exists | No-op (check `prescriptionId` before navigating) |
| Shortcut during form submission (`isLoading`) | No lock needed — navigation while submitting is acceptable; auto-save covers draft |
| `ConsultationForm` draft abandoned via `N` | Existing `useAutoSave` persists to sessionStorage; draft banner appears on re-entry — acceptable |
| Search API returns 500 | Show error message in modal ("Search unavailable, try again") — needs explicit error state in `useDebouncedSearch` or local catch |
| Print page (`/prescriptions/:id/print`) | `KeyboardProvider` wraps all routes; hints have `no-print` class; shortcuts still work but irrelevant during print |
| Mobile (no keyboard) | Shortcuts simply don't fire; `KbdBadge` hidden via `hidden md:inline`; no regression |

---

## Dependencies & Prerequisites

1. `FormSection` needs `aria-expanded` fix **before** keyboard navigation testing (1-line change)
2. No new npm packages required — all built with existing React, Next.js Router, and Tailwind
3. No backend changes required — `/patients/?search=` endpoint already supports name + phone search
4. `useDebouncedSearch` reused as-is — confirm backend accepts `?page_size=8` param (Django REST Framework `PageNumberPagination` supports this by default)

---

## Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/lib/keyboard.ts` | `isShortcutSuppressed()` utility |
| `frontend/src/components/layout/KeyboardProvider.tsx` | Client wrapper, global keydown handler, context |
| `frontend/src/components/layout/CommandPalette.tsx` | Fuzzy search modal with ARIA combobox |
| `frontend/src/hooks/usePatientShortcuts.ts` | Route-context shortcuts (C, H, P) |
| `frontend/src/components/ui/KbdBadge.tsx` | `<kbd>` shortcut hint badge |

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/app/layout.tsx` | Wrap `{children}` in `<KeyboardProvider>` |
| `frontend/src/components/layout/Sidebar.tsx` | Add `<KbdBadge>` next to nav items |
| `frontend/src/components/forms/FormSection.tsx` | Add `aria-expanded={isOpen}` to toggle button |
| `frontend/src/app/patients/[id]/page.tsx` | Mount `usePatientShortcuts` via client wrapper |
| `frontend/src/app/consultations/[id]/page.tsx` | Mount `usePatientShortcuts` |
| `frontend/src/app/prescriptions/[id]/page.tsx` | Mount `usePatientShortcuts` |
| `frontend/src/components/patients/PatientBanner.tsx` | Add `[C]` and `[H]` KbdBadge hints |

---

## Success Metrics

- Doctor can register a new patient using only the keyboard (N → Tab × N → Enter)
- Doctor can search and open a patient record in under 3 keystrokes after the shortcut
- No keyboard shortcut fires during Tamil text composition
- All shortcut hints visible without hovering or opening any menu
- Zero regressions to existing form submission, validation, and print flows

---

## Future Considerations

- `?` key to open/close an expanded shortcut reference overlay (Phase 5b)
- Add `ArrowLeft`/`ArrowRight` to navigate through consultation/prescription history on patient page
- Shortcut customisation (allow doctor to remap keys) — not needed now
- Mobile swipe gestures as touch equivalent — separate feature

---

## References & Research

### Internal References

- Phone validation regex: `frontend/src/components/patients/PatientForm.tsx:21`
- Focus-first-error pattern: `frontend/src/components/patients/PatientForm.tsx:77-79`
- `useDebouncedSearch` hook: `frontend/src/hooks/useDebouncedSearch.ts`
- Root layout insertion point: `frontend/src/app/layout.tsx:14-31`
- `FormSection` toggle button (needs `aria-expanded`): `frontend/src/components/forms/FormSection.tsx:23`
- Sidebar width (`w-64`): `frontend/src/components/layout/Sidebar.tsx`
- z-index reference: ConsultationForm pill bar uses `z-30`, Sidebar mobile uses `z-40`/`z-50`
- Tamil font config: `frontend/src/lib/fonts.ts`, `tailwind.config.ts:12`
- Print CSS pattern: `docs/solutions/ui-bugs/prescription-print-layout-tamil-bilingual-letterhead.md`
- Draft key namespacing: `docs/solutions/ui-bugs/missing-clickable-rows-and-edit-capability.md`

### External References

- WCAG 2.1 — Keyboard Accessible (Guideline 2.1): https://www.w3.org/WAI/WCAG21/Understanding/keyboard-accessible
- ARIA Combobox Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
- MDN KeyboardEvent.isComposing: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/isComposing
- Next.js App Router Client Components: https://nextjs.org/docs/app/building-your-application/rendering/client-components

---

## ERD / Component Diagram

```mermaid
graph TD
    A[layout.tsx - Server] --> B[KeyboardProvider - Client]
    B --> C[ShortcutsContext]
    B --> D[CommandPalette Modal]
    B --> E[children]

    C --> F[Sidebar.tsx]
    C --> G[patients/id/page.tsx]
    C --> H[consultations/id/page.tsx]
    C --> I[prescriptions/id/page.tsx]

    G --> J[usePatientShortcuts C]
    H --> K[usePatientShortcuts C,H,P]
    I --> L[usePatientShortcuts H]

    D --> M[useDebouncedSearch]
    M --> N[/patients/?search=&page_size=8]

    F --> O[KbdBadge N]
    F --> P[KbdBadge Ctrl+K]
    G --> Q[PatientBanner + KbdBadge C]
    H --> R[PatientBanner + KbdBadge H,P]

    style B fill:#d1fae5,stroke:#059669
    style D fill:#d1fae5,stroke:#059669
    style J fill:#dbeafe,stroke:#2563eb
    style K fill:#dbeafe,stroke:#2563eb
    style L fill:#dbeafe,stroke:#2563eb
```
