---
status: pending
priority: p1
issue_id: "004"
tags: [code-review, accessibility, aria, dialog, wcag, regression]
dependencies: []
---

# 004 — DispenseModal: not migrated to native `<dialog>`, missing all dialog ARIA

## Problem Statement

`DispenseModal.tsx` was not migrated to the new native `<dialog>`-based `Modal` component. It renders a `div.fixed.inset-0` backdrop + inner div. It has no `role="dialog"`, no `aria-modal`, no `aria-labelledby`, no Escape key handling, and no focus trap. This is a full accessibility regression against the goals of this PR. A screen reader user can navigate freely into the inert background. WCAG 2.1.2 (No Keyboard Trap) is violated (no trap when there should be one). WCAG 4.1.2 (Name, Role, Value) is violated (no dialog role). This modal is invisible to AT as a dialog context.

## Findings

- **File:** `src/components/pharmacy/DispenseModal.tsx` — entire component
- Renders `div.fixed.inset-0` with no ARIA dialog role (line 72).
- Close button has no `aria-label` (line 79).
- `X` icon in close button has no `aria-hidden` (line 80).
- The new `Modal` component (which wraps native `<dialog>`) exists and is used by `StartJourneyModal` and others — `DispenseModal` is the only one that didn't get migrated.
- WCAG 2.1.2 (A) — No Keyboard Trap.
- WCAG 4.1.2 (A) — Name, Role, Value.
- WCAG 2.4.3 (A) — Focus Order.

## Proposed Solutions

### Option A — Migrate to the existing `Modal` component (Recommended)
Refactor `DispenseModal` to use `<Modal open={…} onClose={onClose} title="Dispense Medicines">` as its outer wrapper. Pass the form content as children.
- Pros: Gets native dialog, focus trap, Escape handling, backdrop click-to-close, and `aria-labelledby` for free. Consistent with rest of codebase.
- Cons: Minor layout adjustment (Modal provides its own header with close button — the internal header should be removed to avoid duplication).
- Effort: Small–Medium
- Risk: Low

### Option B — Add ARIA attributes to existing div-based modal
Add `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, manual focus trap via `useEffect`, and Escape key listener.
- Pros: Minimal structural change.
- Cons: Duplicates focus-trap logic already in `<dialog>`; inconsistent with the rest of the codebase; more code to maintain.
- Effort: Medium
- Risk: Medium

## Recommended Action

Implement Option A — migrate to `<Modal>`.

## Technical Details

- **Affected files:** `src/components/pharmacy/DispenseModal.tsx`
- **WCAG criteria:** 2.1.2 (A), 4.1.2 (A), 2.4.3 (A)

## Acceptance Criteria

- [ ] `DispenseModal` uses the `Modal` component as its root wrapper.
- [ ] The modal is announced as a dialog by screen readers.
- [ ] Focus is trapped within the modal when open.
- [ ] Pressing Escape closes the modal.
- [ ] The close button has an accessible label.
- [ ] No duplicate modal header (the `Modal` component's built-in title header is used).

## Work Log

- 2026-03-14: Identified during a11y code review of feat/ruthva-branding-otp-login.
