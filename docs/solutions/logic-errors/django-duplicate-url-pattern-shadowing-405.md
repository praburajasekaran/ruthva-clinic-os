---
title: "Django URL Path Collision: Duplicate 'invitations/' Routes Cause 405 on GET"
date: 2026-02-28
category: logic-errors
severity: high
component: backend/clinics/urls.py
tags: [django, url-routing, drf, method-not-allowed, 405, urlpatterns, first-match-shadowing]
symptoms:
  - "GET /team/invitations/ returns 405 Method Not Allowed"
  - "invitation_list view is unreachable despite being defined in urlpatterns"
  - "Only POST requests to /team/invitations/ succeed (hitting team_invite view)"
root_cause: "Duplicate URL path entries in Django urlpatterns cause first-match shadowing - renaming path('invite/', ...) to path('invitations/', ...) created a collision with the existing path('invitations/', invitation_list, ...) entry. Django's URL resolver matches the first entry for all HTTP methods, so the POST-only team_invite view intercepted GET requests meant for invitation_list."
resolution: "Use distinct URL paths for semantically different operations: path('invite/', ...) for the POST action endpoint and path('invitations/', ...) for the GET resource list endpoint. Updated both backend/clinics/urls.py and frontend/src/app/(dashboard)/team/page.tsx."
time_to_resolve: "~15 minutes once identified"
prevention: "URL path uniqueness review during code review, integration tests that exercise all endpoints with their expected HTTP methods, linting or CI checks for duplicate path entries in urlpatterns"
---

## Context

During the resolution of 20 code review findings (P1 through P3) for a Django + Next.js SaaS team management feature, a critical regression was inadvertently introduced. One of the review findings (TODO #017) recommended renaming the `path("invite/", team_invite, ...)` URL entry to `path("invitations/", team_invite, ...)` for RESTful consistency. However, the `urlpatterns` list already contained a `path("invitations/", invitation_list, ...)` entry serving GET requests to list pending invitations.

Because Django's URL resolver evaluates patterns in order and matches the first entry regardless of HTTP method, the renamed `team_invite` view (which only accepts POST) shadowed the `invitation_list` view entirely. This caused all GET requests to `/team/invitations/` to return a 405 Method Not Allowed error instead of the invitation list.

## Investigation Steps

1. Reviewed `backend/clinics/urls.py` after the TODO #017 rename and noticed two consecutive `path("invitations/", ...)` entries.
2. Confirmed that Django's URL resolver performs top-to-bottom matching on the path string alone, without considering HTTP method.
3. Traced the frontend mutation in `frontend/src/app/(dashboard)/team/page.tsx` which had also been updated to point to `"/team/invitations/"`.

## Root Cause Analysis

Django's URL routing is **path-based only**. The `urlpatterns` list is evaluated sequentially, and the **first** `path(...)` whose pattern matches the incoming request URL wins. HTTP method filtering (GET, POST, etc.) happens **after** URL resolution, inside the view layer -- in this case via DRF's `@api_view(["POST"])` and `@api_view(["GET"])` decorators.

When TODO #017 renamed the invite endpoint:

```python
# BEFORE (working)
path("invite/", team_invite, name="team-invite"),              # POST - unique path
path("invitations/", invitation_list, name="invitation-list"),  # GET - unique path

# AFTER (broken)
path("invitations/", team_invite, name="team-invite"),         # POST - FIRST MATCH
path("invitations/", invitation_list, name="invitation-list"), # GET - UNREACHABLE
```

The consequence:
- **`POST /team/invitations/`** matched the first entry, dispatched to `team_invite`, and worked (POST is allowed).
- **`GET /team/invitations/`** also matched the first entry, dispatched to `team_invite`, and was **rejected with 405** because `@api_view(["POST"])` does not allow GET. The second entry was never reached.

## Working Solution

The fix restores distinct paths that reflect the semantic difference between the two endpoints -- one is an **action** (sending an invitation) and the other is a **resource listing** (viewing invitations).

### Backend: `backend/clinics/urls.py`

**Before (broken):**
```python
urlpatterns = [
    path("", team_list, name="team-list"),
    path("invitations/", team_invite, name="team-invite"),          # POST only
    path("<int:member_id>/role/", team_update_role, name="team-update-role"),
    path("<int:member_id>/", team_remove, name="team-remove"),
    path("invitations/", invitation_list, name="invitation-list"),  # GET only - UNREACHABLE
    path("invitations/<int:invitation_id>/", invitation_cancel, name="invitation-cancel"),
]
```

**After (fixed):**
```python
urlpatterns = [
    path("", team_list, name="team-list"),
    path("invite/", team_invite, name="team-invite"),               # POST /team/invite/
    path("<int:member_id>/role/", team_update_role, name="team-update-role"),
    path("<int:member_id>/", team_remove, name="team-remove"),
    path("invitations/", invitation_list, name="invitation-list"),  # GET /team/invitations/
    path("invitations/<int:invitation_id>/", invitation_cancel, name="invitation-cancel"),
]
```

### Frontend: `frontend/src/app/(dashboard)/team/page.tsx` (line 438)

**Before (broken):**
```typescript
} = useMutation<InviteMemberRequest, Invitation>("post", "/team/invitations/");
```

**After (fixed):**
```typescript
} = useMutation<InviteMemberRequest, Invitation>("post", "/team/invite/");
```

### Design rationale

| Endpoint | Method | Path | Purpose |
|---|---|---|---|
| `team_invite` | POST | `/team/invite/` | Action: send a new invitation |
| `invitation_list` | GET | `/team/invitations/` | Resource: list pending invitations |
| `invitation_cancel` | DELETE | `/team/invitations/<id>/` | Resource: cancel a specific invitation |

## Verification

1. **URL pattern uniqueness**: Every entry in `urlpatterns` now has a distinct path string.
2. **Route resolution**: `GET /team/invitations/` resolves to `invitation_list`, `POST /team/invite/` resolves to `team_invite`.
3. **Frontend integration**: The `useMutation` hook sends POST to `/team/invite/`, matching the backend.

## Prevention Strategies

### 1. URL Path Uniqueness Test

Add a CI test that catches duplicate path entries:

```python
# tests/test_url_uniqueness.py
from django.urls import get_resolver
from django.urls.resolvers import URLResolver, URLPattern


def test_no_duplicate_url_paths():
    """Ensure no two URL patterns resolve to the same path string."""
    resolver = get_resolver()
    seen_paths = {}
    duplicates = []

    def check(pattern, prefix=""):
        if isinstance(pattern, URLResolver):
            for child in pattern.url_patterns:
                check(child, prefix + str(pattern.pattern))
        elif isinstance(pattern, URLPattern):
            full_path = prefix + str(pattern.pattern)
            name = pattern.name or "(unnamed)"
            if full_path in seen_paths:
                duplicates.append(
                    f"  '{full_path}' used by '{seen_paths[full_path]}' and '{name}'"
                )
            else:
                seen_paths[full_path] = name

    for p in resolver.url_patterns:
        check(p)

    assert duplicates == [], (
        "Duplicate URL paths found (second entry is unreachable):\n"
        + "\n".join(duplicates)
    )
```

### 2. Regression Tests

```python
@pytest.mark.django_db
def test_get_invitations_returns_200(authenticated_client):
    """Regression: GET /team/invitations/ must not return 405."""
    response = authenticated_client.get("/api/team/invitations/")
    assert response.status_code != 405, (
        "GET returned 405 -- check urls.py for duplicate 'invitations/' entries."
    )
    assert response.status_code == 200


@pytest.mark.django_db
def test_post_invite_returns_201(authenticated_client, valid_invite_payload):
    """Regression: POST /team/invite/ must not return 404."""
    response = authenticated_client.post(
        "/api/team/invite/",
        data=valid_invite_payload,
        content_type="application/json",
    )
    assert response.status_code != 404
    assert response.status_code == 201
```

### 3. Code Review Checklist for URL Changes

| Check | What to look for |
|---|---|
| **No duplicate path strings** | Search the file for the exact path string being added |
| **URL name uniqueness** | Every `path()` should have a unique `name=` within its namespace |
| **Method separation** | Two `path()` entries with the same string will NOT disambiguate by HTTP method |
| **Reverse resolution** | Confirm `reverse("the-url-name")` resolves to the intended path |
| **No orphaned references** | Grep for old URL names in `reverse()` calls, templates, and frontend code |

### 4. Django Best Practices

**The core rule:** Django's URL resolver matches on path alone, never on HTTP method. Never rely on two `path()` entries with the same path string.

**Preferred patterns:**

- **Same path, multiple methods** -> Use a single class-based view (APIView/ViewSet) that dispatches internally
- **Distinct operations** -> Use distinct path strings (`invite/` vs `invitations/`)
- **Full CRUD** -> Use DRF's Router + ViewSet to auto-generate unique paths

## Related Documentation

- `todos/017-resolved-p3-rest-url-inconsistency.md` -- The original TODO that triggered this bug
- PR #14: Phase 2 - Team Management (introduced the original URL patterns)
- PR #15: Fix 20 code review findings (introduced and fixed the collision)
