---
status: resolved
priority: p2
issue_id: "006"
tags: [code-review, security, backend]
dependencies: []
---

# No rate limiting on team and invite endpoints

## Problem Statement

All team management and invitation endpoints lack rate limiting. An attacker could:
- Spam invite emails to arbitrary addresses (email abuse)
- Brute-force invitation tokens via `invite_details` endpoint
- Flood team management endpoints

## Findings

- `backend/clinics/views.py` — No `throttle_classes` on any view
- `team_invite` is the highest-risk endpoint (triggers email sends)
- `invite_details` accepts GET with token parameter (brute-forceable)
- No global throttle configured in DRF settings
- Identified by: security-sentinel, performance-oracle

## Proposed Solutions

### Option 1: Add DRF throttling to sensitive endpoints

**Approach:** Add `UserRateThrottle` and `AnonRateThrottle` to invite and accept endpoints.

```python
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

@api_view(["POST"])
@permission_classes([IsAuthenticated, IsClinicOwner])
@throttle_classes([UserRateThrottle])  # Default: 100/hour
def team_invite(request):
    ...
```

**Effort:** 30 minutes | **Risk:** Low

## Technical Details

**Affected files:**
- `backend/clinics/views.py` — all views
- `backend/config/settings/base.py` — DEFAULT_THROTTLE_RATES

## Acceptance Criteria

- [ ] Invite endpoint rate-limited (e.g., 10/hour per user)
- [ ] Public invite endpoints rate-limited per IP
- [ ] Rate limit errors return 429 with Retry-After header

## Work Log

### 2026-02-28 - Initial Discovery
**By:** Claude Code
**Actions:** Identified missing rate limiting on all team/invite endpoints
