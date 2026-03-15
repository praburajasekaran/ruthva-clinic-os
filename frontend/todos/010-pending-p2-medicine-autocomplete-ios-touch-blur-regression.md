---
status: pending
priority: p2
issue_id: "010"
tags: [code-review, accessibility, combobox, mobile, regression]
dependencies: ["002"]
---

# 010 — MedicineAutocomplete: dropdown closes before selection on iOS Safari (touch regression)

## Problem Statement

`MedicineAutocomplete` uses `onMouseDown={(e) => e.preventDefault()}` on each option button to prevent the input from blurring before the `onClick` fires. This technique works on desktop browsers. On iOS Safari, `preventDefault()` on `touchstart`/`mousedown` does not reliably prevent `blur` from firing on the input before `click`. The result: the `onBlur` handler fires, sets `open = false`, the dropdown unmounts, and the `onClick` never fires — the selection is lost. This is a regression for mobile pharmacy workflows.

## Findings

- **File:** `src/components/pharmacy/MedicineAutocomplete.tsx` lines 64–69 (onBlur), line 114 (onMouseDown)
- iOS Safari does not suppress `blur` on `mousedown.preventDefault()` in all cases.
- Standard fix: use `onPointerDown` with `preventDefault()` (more reliable across touch/mouse), or use a `mousedown` + `touchstart` double-bind.
- Alternatively, replace option `<button>` with `<div role="option">` (fix from todo #002) and use `onPointerDown` on the listbox container to set a flag, checked in the input's `onBlur`.
- This is the most common real-world combobox bug.

## Proposed Solutions

### Option A — Use `onPointerDown` instead of `onMouseDown` (Recommended)
Replace `onMouseDown={(e) => e.preventDefault()}` with `onPointerDown={(e) => e.preventDefault()}`.
`pointerdown` fires before `blur` on both touch and mouse on iOS Safari 15+.
- Pros: Cross-platform; minimal change.
- Cons: Requires iOS 13+ (acceptable given clinic app context).
- Effort: Trivial
- Risk: Low

### Option B — Use a `mousedownOccurred` ref flag
Set a ref flag on `mousedown`, check it in `onBlur` to skip closing the dropdown, clear it after `click`.
- Pros: Maximum browser compatibility.
- Cons: More state management complexity.
- Effort: Small
- Risk: Low

## Recommended Action

Implement Option A as a minimal fix alongside todo #002.

## Technical Details

- **Affected files:** `src/components/pharmacy/MedicineAutocomplete.tsx`

## Acceptance Criteria

- [ ] On iOS Safari (tested on iOS 16+), tapping a medicine option correctly selects it.
- [ ] The dropdown does not close before selection on touch devices.
- [ ] Desktop mouse behaviour is unchanged.

## Work Log

- 2026-03-14: Identified during a11y code review of feat/ruthva-branding-otp-login.
