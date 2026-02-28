---
status: resolved
priority: p2
issue_id: "010"
tags: [code-review, accessibility, frontend]
dependencies: []
---

# InviteModal lacks keyboard accessibility and ARIA attributes

## Problem Statement

The InviteModal component on the team page lacks essential accessibility features: no Escape key to close, no keyboard trap (focus can leave the modal), missing `aria-labelledby`/`aria-describedby`, and missing `htmlFor` on form labels.

## Findings

- `frontend/src/app/(dashboard)/team/page.tsx` — InviteModal component
- No `onKeyDown` handler for Escape key
- No focus trap implementation (Tab can cycle to background content)
- Missing `aria-labelledby` on modal dialog role
- Lines 435, 455, 466, 484 — `<label>` elements missing `htmlFor` attribute
- WCAG 2.1 Level A violation (2.1.1 Keyboard, 2.1.2 No Keyboard Trap)
- Identified by: typescript-reviewer, architecture-strategist

## Proposed Solutions

### Option 1: Add keyboard handling and ARIA attributes

**Approach:** Add Escape key handler, focus trap, ARIA attributes, and htmlFor on labels.

**Effort:** 1 hour | **Risk:** Low

### Option 2: Use a headless UI dialog component (e.g., @headlessui/react)

**Approach:** Replace custom modal with a battle-tested accessible dialog component.

**Effort:** 2 hours | **Risk:** Low

## Technical Details

**Affected files:**
- `frontend/src/app/(dashboard)/team/page.tsx` — InviteModal component

## Acceptance Criteria

- [ ] Escape key closes the modal
- [ ] Tab key cycles within modal (focus trap)
- [ ] Modal has appropriate ARIA attributes
- [ ] All labels have htmlFor matching input ids
- [ ] Screen reader announces modal opening/closing

## Work Log

### 2026-02-28 - Initial Discovery
**By:** Claude Code
**Actions:** Identified WCAG violations in InviteModal
