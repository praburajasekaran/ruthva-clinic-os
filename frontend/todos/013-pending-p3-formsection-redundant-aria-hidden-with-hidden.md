---
status: pending
priority: p3
issue_id: "013"
tags: [code-review, accessibility, aria, quality]
dependencies: []
---

# 013 — FormSection: redundant `aria-hidden` alongside HTML `hidden` attribute

## Problem Statement

`FormSection.tsx` applies both `hidden={!isOpen}` and `aria-hidden={!isOpen}` to the collapsible content panel. The HTML `hidden` attribute already removes an element from the accessibility tree — `aria-hidden` is therefore redundant. While harmless, it adds noise and could mislead future developers into thinking `aria-hidden` is doing additional work here.

## Findings

- **File:** `src/components/forms/FormSection.tsx` line 39
- `hidden` HTML attribute: removes from rendering AND accessibility tree.
- `aria-hidden`: removes from accessibility tree only.
- Combining both is redundant (though not incorrect).
- ARIA Authoring Practices: prefer native HTML semantics over ARIA overrides where native semantics already provide the correct behaviour.

## Proposed Solutions

### Option A — Remove `aria-hidden`, keep `hidden` (Recommended)
```tsx
<div id={panelId} hidden={!isOpen} className="…">{children}</div>
```
- Pros: Simpler; relies on native HTML semantics.
- Cons: None.
- Effort: Trivial
- Risk: None

## Recommended Action

Implement Option A.

## Technical Details

- **Affected files:** `src/components/forms/FormSection.tsx`

## Acceptance Criteria

- [ ] `aria-hidden` is removed from the FormSection panel div.
- [ ] `hidden={!isOpen}` remains and correctly hides the panel from rendering and AT.

## Work Log

- 2026-03-14: Identified during a11y code review of feat/ruthva-branding-otp-login.
