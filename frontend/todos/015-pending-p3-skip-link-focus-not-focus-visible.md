---
status: pending
priority: p3
issue_id: "015"
tags: [code-review, accessibility, focus, wcag, quality]
dependencies: []
---

# 015 — Dashboard layout: skip link uses `focus:` instead of `focus-visible:`

## Problem Statement

The skip-to-main-content link in `DashboardLayout` uses Tailwind's `focus:not-sr-only focus:fixed focus:top-4 …` selectors. The rest of the codebase was upgraded to `focus-visible:` in this PR. While skip links are inherently keyboard-targeted (mouse users don't use them), using `focus:` is inconsistent with the project's pattern. If the skip link ever becomes clickable in a UI test or automated scenario, a visible ring would appear on mouse click.

## Findings

- **File:** `src/app/(dashboard)/layout.tsx` lines 19–23
- Current: `focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-emerald-800 focus:px-4 focus:py-2 focus:text-white focus:ring-2 focus:ring-white focus:outline-none`
- Should be: `focus-visible:not-sr-only focus-visible:fixed …` for consistency.
- This is a P3 (nice-to-have) because skip links are almost exclusively keyboard-triggered.

## Proposed Solutions

### Option A — Replace `focus:` with `focus-visible:` on skip link (Recommended)
- Pros: Consistent with project convention; future-proof.
- Cons: None.
- Effort: Trivial
- Risk: None

## Recommended Action

Implement Option A during the next housekeeping pass.

## Technical Details

- **Affected files:** `src/app/(dashboard)/layout.tsx`

## Acceptance Criteria

- [ ] Skip link uses `focus-visible:` Tailwind variants for all visible-state styles.
- [ ] Skip link still appears correctly when focused via keyboard.

## Work Log

- 2026-03-14: Identified during a11y code review of feat/ruthva-branding-otp-login.
