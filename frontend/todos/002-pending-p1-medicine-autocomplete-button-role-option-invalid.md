---
status: pending
priority: p1
issue_id: "002"
tags: [code-review, accessibility, aria, combobox, wcag]
dependencies: []
---

# 002 — MedicineAutocomplete: `<button role="option">` is an invalid ARIA pattern

## Problem Statement

`MedicineAutocomplete.tsx` renders each dropdown suggestion as a `<button type="button" role="option">`. The ARIA spec (and the APG Combobox with Listbox pattern) requires `role="option"` to be applied to a non-interactive element (typically `<div>` or `<li>`). Combining an interactive `<button>` (which has an implicit `role="button"`) with an explicit `role="option"` creates a conflicting role hierarchy. NVDA and VoiceOver will announce these as "button", not "option", breaking the screen-reader combobox experience. WCAG 4.1.2 (Name, Role, Value — Level A) is violated.

## Findings

- **File:** `src/components/pharmacy/MedicineAutocomplete.tsx` lines 108–129
- APG Combobox Listbox pattern: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
- `role="option"` is not allowed on interactive elements per ARIA 1.2 spec.
- The `onMouseDown={(e) => e.preventDefault()}` trick (to prevent input blur) works correctly for mouse, but the element should not be a button.

## Proposed Solutions

### Option A — Replace `<button>` with `<div role="option">` (Recommended)
```tsx
<div
  key={medicine.id}
  id={`medicine-option-${index}`}
  role="option"
  aria-selected={activeIndex === index}
  onMouseDown={(e) => e.preventDefault()}
  onClick={() => handleSelect(medicine)}
  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm cursor-default hover:bg-emerald-50${activeIndex === index ? " bg-emerald-50" : ""}`}
>
```
- Pros: Correct ARIA semantics; keyboard handling already lives on the input's `onKeyDown`.
- Cons: Loses native button focus behaviour (not needed here — focus stays on input).
- Effort: Small
- Risk: Low

### Option B — Use `<li role="option">` with `<ul role="listbox">`
Change the listbox container to `<ul>` and options to `<li role="option">`.
- Pros: Semantically richer HTML.
- Cons: Minor styling adjustments needed for list reset.
- Effort: Small
- Risk: Low

## Recommended Action

Implement Option A (div with role="option").

## Technical Details

- **Affected files:** `src/components/pharmacy/MedicineAutocomplete.tsx`
- **WCAG criteria:** 4.1.2 (A)

## Acceptance Criteria

- [ ] Option elements use `<div role="option">` or `<li role="option">`, not `<button role="option">`.
- [ ] Screen reader announces items as "option" within a listbox, not as "button".
- [ ] Keyboard selection (Enter, ArrowDown/Up) still works correctly.
- [ ] Mouse click on an option still selects it (via onClick on the div).

## Work Log

- 2026-03-14: Identified during a11y code review of feat/ruthva-branding-otp-login.
