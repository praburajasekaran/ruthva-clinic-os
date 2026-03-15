---
status: pending
priority: p2
issue_id: "006"
tags: [code-review, accessibility, dialog, regression, typescript]
dependencies: ["001"]
---

# 006 — Modal: `dialog.close()` called when dialog was never opened causes InvalidStateError

## Problem Statement

In `Modal.tsx`, the `useEffect` calls `dialog.close()` whenever `open` becomes `false`. If the component mounts with `open={false}` (or in React Strict Mode where effects fire twice), `dialog.close()` is called on a dialog that was never shown. The native `HTMLDialogElement.close()` method throws `InvalidStateError` in some browser implementations when the dialog is not in the open state. This causes console errors in development (Strict Mode) and may cause crashes in production on certain browsers.

## Findings

- **File:** `src/components/ui/Modal.tsx` lines 31–39
- React Strict Mode in Next.js dev: effects run, cleanup runs, effects run again. On the second run, if `open=false`, `close()` is called with no prior `showModal()`.
- The `<dialog>` element has no `open` attribute unless `showModal()` was called.
- Fix: guard with `dialog.open` before calling `dialog.close()`.

## Proposed Solutions

### Option A — Guard with `dialog.open` check (Recommended)
```tsx
useEffect(() => {
  const dialog = dialogRef.current;
  if (!dialog) return;
  if (open) {
    if (!dialog.open) dialog.showModal();
  } else {
    if (dialog.open) dialog.close();
  }
}, [open]);
```
- Pros: Safe in Strict Mode and on cold mount with `open={false}`.
- Cons: None.
- Effort: Small
- Risk: None

### Option B — Try/catch around close()
- Pros: Defensive.
- Cons: Silences errors rather than preventing them; masks legitimate bugs.
- Effort: Small
- Risk: Medium

## Recommended Action

Implement Option A.

## Technical Details

- **Affected files:** `src/components/ui/Modal.tsx`
- **Browser spec:** HTMLDialogElement.close() — https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/close

## Acceptance Criteria

- [ ] No `InvalidStateError` in browser console when `<Modal open={false}>` mounts.
- [ ] No errors when running under React Strict Mode.
- [ ] Modal still opens and closes correctly under all state transitions.

## Work Log

- 2026-03-14: Identified during a11y code review of feat/ruthva-branding-otp-login.
