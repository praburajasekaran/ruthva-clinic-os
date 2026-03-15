---
status: pending
priority: p1
issue_id: "001"
tags: [code-review, accessibility, aria, wcag]
dependencies: []
---

# 001 — Modal: static `id="modal-title"` causes aria-labelledby collision

## Problem Statement

`Modal.tsx` hard-codes `id="modal-title"` on the `<h2>` title element and references it via `aria-labelledby="modal-title"` on the `<dialog>`. When two Modal instances are simultaneously mounted (even with `open={false}`), the DOM contains duplicate ids. `aria-labelledby` must reference a unique id to satisfy WCAG 1.3.1 (Info and Relationships). Screen readers may announce the wrong title or fail to announce any title.

## Findings

- **File:** `src/components/ui/Modal.tsx` line 44, 55
- Every `<Modal title="…">` renders `<h2 id="modal-title">` — static, never unique.
- Multiple modals exist in the app: `StartJourneyModal`, `DispenseModal` (indirectly), etc.
- WCAG 1.3.1 (Level A) requires labelling relationships to be programmatically determinable.
- WCAG 4.1.1 (Level A) requires unique ids.

## Proposed Solutions

### Option A — `useId()` hook (Recommended)
Generate a unique id per instance with React's `useId()`:
```tsx
const titleId = useId();
// <dialog aria-labelledby={title ? titleId : undefined}>
// <h2 id={titleId}>
```
- Pros: Zero-dep, React-native, SSR-safe, stable across renders.
- Cons: None.
- Effort: Small
- Risk: None

### Option B — Accept `id` as a prop
Add an optional `id` prop and derive the title id from it.
- Pros: Caller-controlled.
- Cons: Every call site must supply a unique id — easy to forget.
- Effort: Small
- Risk: Medium (call site discipline required)

### Option C — Keep static id, deduplicate with `open` prop
Only render the title element when `open === true`.
- Pros: No id collision while only one modal is open at a time.
- Cons: Breaks if two modals are simultaneously open; doesn't fix 4.1.1.
- Effort: Small
- Risk: Medium

## Recommended Action

Implement Option A.

## Technical Details

- **Affected files:** `src/components/ui/Modal.tsx`
- **WCAG criteria:** 1.3.1 (A), 4.1.1 (A)

## Acceptance Criteria

- [ ] `Modal` uses `useId()` to generate a unique title id per instance.
- [ ] Multiple simultaneously-mounted `<Modal>` components have unique title ids in the DOM.
- [ ] No duplicate id warnings in browser DevTools.

## Work Log

- 2026-03-14: Identified during a11y code review of feat/ruthva-branding-otp-login.
