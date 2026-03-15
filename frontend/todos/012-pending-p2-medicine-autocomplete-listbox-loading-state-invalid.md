---
status: pending
priority: p2
issue_id: "012"
tags: [code-review, accessibility, aria, combobox, wcag]
dependencies: ["002"]
---

# 012 — MedicineAutocomplete: loading state inside listbox has no valid option child

## Problem Statement

When `isLoading` is true and `medicines` is empty, `MedicineAutocomplete` renders the listbox container with a plain `<div class="px-3 py-2 text-sm text-gray-500">Searching...</div>` child. A `role="listbox"` element must contain only `role="option"` children (or `role="group"` containing options). A plain `<div>` is not a valid child of a listbox, violating ARIA required ownership. Some screen readers will announce "Searching..." as an option or skip it entirely.

## Findings

- **File:** `src/components/pharmacy/MedicineAutocomplete.tsx` lines 104–106
- ARIA spec: `listbox` required owned elements are `group` or `option`.
- The loading div is inside the `role="listbox"` element.
- When `isLoading && medicines.length > 0`, this is also an issue (loading div + option children mixed).

## Proposed Solutions

### Option A — Surface loading state via `aria-busy` and a live region outside the listbox (Recommended)
```tsx
{/* Outside the listbox: */}
<div aria-live="polite" className="sr-only">
  {isLoading ? "Searching for medicines…" : ""}
</div>

{/* The listbox: only renders when medicines.length > 0 */}
{open && medicines.length > 0 && (
  <div id="medicine-listbox" role="listbox" aria-busy={isLoading} …>
    {medicines.map(…)}
  </div>
)}
```
- Pros: Valid ARIA structure; loading state announced politely without polluting listbox children.
- Cons: Live region requires pre-rendering pattern (render empty, fill content).
- Effort: Small
- Risk: Low

### Option B — Add `role="option"` and `aria-disabled="true"` to the loading div
```tsx
<div role="option" aria-disabled="true" aria-selected="false">Searching…</div>
```
- Pros: Quick fix; keeps loading state inside listbox.
- Cons: Announces "Searching, dimmed" as an option — misleading to screen reader users.
- Effort: Trivial
- Risk: Medium

## Recommended Action

Implement Option A.

## Technical Details

- **Affected files:** `src/components/pharmacy/MedicineAutocomplete.tsx`
- **WCAG criteria:** 4.1.2 (A)

## Acceptance Criteria

- [ ] The `role="listbox"` element contains only `role="option"` children (or is empty).
- [ ] Loading state is announced to screen readers via a polite live region.
- [ ] The loading announcement does not interrupt ongoing AT speech.

## Work Log

- 2026-03-14: Identified during a11y code review of feat/ruthva-branding-otp-login.
