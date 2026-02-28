---
title: "WeasyPrint PDF SSRF Risk from Clinic Logo URL - Allowlist Mitigation"
date: "2026-02-28"
status: documented
category: security-issues
tags:
  - security
  - ssrf
  - weasyprint
  - pdf
  - multi-tenant
  - django
  - logo-url
modules:
  - backend/clinics/logo_security.py
  - backend/users/serializers.py
  - backend/prescriptions/pdf.py
  - backend/prescriptions/templates/prescriptions/pdf.html
  - backend/config/settings/base.py
  - backend/users/tests.py
severity: critical
root_cause: untrusted-remote-resource-fetch-in-pdf-renderer
resolution_type: code-fix
related_issues:
  - "todo:021-pending-p1-pdf-logo-url-ssrf"
  - "branch: feat/phase3-branding-settings"
search_keywords:
  - ssrf
  - logo_url
  - weasyprint
  - pdf image fetch
  - CLINIC_LOGO_ALLOWED_HOSTS
  - django serializer validation
---

# WeasyPrint PDF SSRF Risk from Clinic Logo URL - Allowlist Mitigation

## Problem Statement

Clinic owners could update `logo_url` through settings, and that URL was injected directly into prescription PDF HTML. During PDF generation, WeasyPrint resolves image sources server-side. This created SSRF risk: the backend could be forced to fetch attacker-controlled or internal network URLs.

## Symptoms

- Branding feature introduced editable external logo URLs.
- PDF generation rendered `<img src="{{ clinic.logo_url }}">`.
- No hostname/scheme controls existed on `logo_url`.

## Investigation

1. Reviewed clinic update serializer and confirmed no security validation on `logo_url`.
2. Traced PDF rendering path and found direct use of `clinic.logo_url` in template.
3. Confirmed WeasyPrint HTML rendering performs server-side resource fetches.
4. Classified as P1 because request forgery from backend context can expose internal services/metadata endpoints.

## Root Cause

An untrusted user-controlled URL (`Clinic.logo_url`) crossed a trust boundary and was consumed by a server-side fetcher (WeasyPrint) without validation or allowlisting.

## Working Solution

Implemented defense-in-depth with a strict allowlist model:

1. Added shared URL security guard:
   - `is_logo_url_allowed(url)` requires:
     - HTTPS scheme
     - Host matches `CLINIC_LOGO_ALLOWED_HOSTS` (exact or subdomain)
   - File: `backend/clinics/logo_security.py`

2. Enforced validation at write-time:
   - `ClinicUpdateSerializer.validate_logo_url` rejects non-allowlisted or non-HTTPS URLs.
   - File: `backend/users/serializers.py`

3. Enforced validation at render-time:
   - PDF generator computes `clinic_logo_url` only when allowed; otherwise empty.
   - Template uses `clinic_logo_url` (not raw `clinic.logo_url`).
   - Files:
     - `backend/prescriptions/pdf.py`
     - `backend/prescriptions/templates/prescriptions/pdf.html`

4. Added configurable policy in settings:
   - `CLINIC_LOGO_ALLOWED_HOSTS` from env (comma-separated).
   - Secure-by-default: empty allowlist blocks external logos.
   - File: `backend/config/settings/base.py`

5. Added tests:
   - Reject non-HTTPS
   - Reject non-allowlisted hosts
   - Allow allowlisted subdomain host
   - Reject external logo when allowlist empty
   - File: `backend/users/tests.py`

## Verification

- Backend tests passed after fix: `python manage.py test` (`35/35`).
- Frontend lint passed: `npm run lint`.
- Manual logic check: disallowed logo URLs no longer flow into PDF image `src`.

## Prevention Strategies

1. Treat all user-provided URLs as untrusted inputs, especially when consumed by server-side fetchers (PDF, image processors, webhooks).
2. Enforce URL controls at both ingress (serializer/model validation) and egress (runtime guard before fetch).
3. Keep remote asset sources constrained via explicit allowlist.
4. Add test coverage for hostile URL variants (http, localhost, metadata IPs, private subnets, non-allowlisted domains).
5. Prefer upload-to-trusted-storage pattern over arbitrary remote URLs for branding assets.

## Known Pattern Links

- Related security review note on auth/password hardening:
  - `docs/solutions/security-issues/phase2-team-management-security-review.md`

## Operational Notes

- Deploy requires env configuration:
  - `CLINIC_LOGO_ALLOWED_HOSTS=cdn.example.com,assets.example.org`
- If unset, external logos are intentionally blocked (secure default).

## Files Changed

- `backend/clinics/logo_security.py`
- `backend/users/serializers.py`
- `backend/prescriptions/pdf.py`
- `backend/prescriptions/templates/prescriptions/pdf.html`
- `backend/config/settings/base.py`
- `backend/users/tests.py`
