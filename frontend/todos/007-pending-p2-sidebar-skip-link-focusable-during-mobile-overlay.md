---
status: pending
priority: p2
issue_id: "007"
tags: [code-review, accessibility, focus-management, inert, wcag]
dependencies: []
---

# 007 — Sidebar: skip-link remains focusable when mobile overlay is open

## Problem Statement

`DashboardLayout` applies `inert={mobileOpen || undefined}` to `<main>` to block AT when the mobile sidebar dialog is open. However, the skip-link `<a href="#main-content">` sits in the DOM *before* `<main>` and is *not* covered by the `inert` attribute. When the mobile sidebar is open, a keyboard user pressing Tab can still reach the skip link (and potentially other elements outside `<main>` such as the footer's link inside the inerted region). This partially breaks the modal containment guarantee.

## Findings

- **File:** `src/app/(dashboard)/layout.tsx` lines 19–23 (skip link), line 29 (`inert` on main)
- The `<Sidebar>` component itself (the `role="dialog"` aside) correctly traps focus via `aria-modal="true"`, but `aria-modal` alone does not reliably block all AT from reaching background content — `inert` is the correct supplement.
- The skip link is outside `<main>`, so `inert` on `<main>` does not suppress it.
- The footer `<a href="https://ruthva.com">` is inside `<main>` and *is* correctly inerted.

## Proposed Solutions

### Option A — Wrap everything except the sidebar in a single `inert`-able container (Recommended)
```tsx
<div className="flex h-screen">
  <Sidebar onMobileOpenChange={setMobileOpen} />
  <div inert={mobileOpen || undefined} className="flex flex-1 flex-col">
    <a href="#main-content" className="sr-only …">Skip to main content</a>
    <main id="main-content" …>…</main>
  </div>
</div>
```
By wrapping the skip link + main in a single container and applying `inert` to that wrapper, all non-sidebar interactive elements are suppressed.
- Pros: Correct; skip link is blocked; footer is blocked; future elements in that container are automatically blocked.
- Cons: Minor DOM restructuring.
- Effort: Small
- Risk: Low

### Option B — Add `aria-hidden` to the skip link when `mobileOpen` is true
```tsx
<a href="#main-content" aria-hidden={mobileOpen || undefined} tabIndex={mobileOpen ? -1 : undefined} …>
```
- Pros: No DOM restructuring.
- Cons: Must be kept in sync manually; fragile if more elements are added outside `<main>`.
- Effort: Small
- Risk: Medium

## Recommended Action

Implement Option A.

## Technical Details

- **Affected files:** `src/app/(dashboard)/layout.tsx`
- **WCAG criteria:** 2.1.1 (A) — Keyboard, 2.4.3 (A) — Focus Order

## Acceptance Criteria

- [ ] When the mobile sidebar is open, Tab key cannot reach the skip link.
- [ ] When the mobile sidebar is closed, the skip link is reachable normally.
- [ ] The `inert` behaviour still blocks `<main>` content as before.

## Work Log

- 2026-03-14: Identified during a11y code review of feat/ruthva-branding-otp-login.
