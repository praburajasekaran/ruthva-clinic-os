---
status: pending
priority: p1
issue_id: "003"
tags: [code-review, accessibility, aria, tablist, wcag]
dependencies: []
---

# 003 — Settings page: "Usage" tabpanel conditionally unmounted breaks aria-controls

## Problem Statement

In `settings/page.tsx`, the Usage tabpanel is rendered with `{activeTab === "usage" && <div role="tabpanel" id="tabpanel-usage" …>}`. When the Usage tab is not active, the element with `id="tabpanel-usage"` is absent from the DOM. The Usage tab button has `aria-controls="tabpanel-usage"`, which now points to a non-existent element. WCAG 4.1.2 requires referenced ids to be present and resolvable. All other tabpanels correctly use `hidden={activeTab !== "…"}` to stay in the DOM.

## Findings

- **File:** `src/app/(dashboard)/settings/page.tsx` lines 852–861
- Profile panel (line 830): uses `hidden={activeTab !== "profile"}` — correct.
- Clinic panel (line 841): uses `hidden={activeTab !== "clinic"}` — correct.
- Usage panel (line 852): uses `{activeTab === "usage" && …}` — WRONG, unmounts element.
- Portability panel (line 863): uses `hidden={activeTab !== "portability"}` — correct.
- WCAG 4.1.2 (Name, Role, Value — Level A) requires `aria-controls` to reference existing elements.

## Proposed Solutions

### Option A — Replace conditional render with `hidden` attribute (Recommended)
```tsx
<div
  role="tabpanel"
  id="tabpanel-usage"
  aria-labelledby="tab-usage"
  tabIndex={0}
  hidden={activeTab !== "usage"}
>
  {activeTab === "usage" && <UsageDashboard />}
</div>
```
The outer div stays in the DOM (so `aria-controls` resolves), but `UsageDashboard` is only mounted when active (preserving the lazy-load behaviour).
- Pros: Correct ARIA; aria-controls always resolves; UsageDashboard still lazy.
- Cons: None.
- Effort: Small
- Risk: None

### Option B — Always mount `UsageDashboard` with `hidden` on wrapper
Mount `UsageDashboard` always, hide the wrapper.
- Pros: Simpler code.
- Cons: `UsageDashboard` makes API calls on mount — would fire even on non-usage tabs.
- Effort: Small
- Risk: Medium (unnecessary API calls)

## Recommended Action

Implement Option A.

## Technical Details

- **Affected files:** `src/app/(dashboard)/settings/page.tsx`
- **WCAG criteria:** 4.1.2 (A)

## Acceptance Criteria

- [ ] `id="tabpanel-usage"` is always present in the DOM on the Settings page.
- [ ] `aria-controls="tabpanel-usage"` on the Usage tab button resolves correctly at all times.
- [ ] `UsageDashboard` is still only mounted when the Usage tab is active.

## Work Log

- 2026-03-14: Identified during a11y code review of feat/ruthva-branding-otp-login.
