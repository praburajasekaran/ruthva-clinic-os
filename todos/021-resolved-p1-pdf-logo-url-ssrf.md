---
status: resolved
priority: p1
issue_id: "021"
tags: [code-review, security, backend, pdf]
dependencies: []
---

# Untrusted Logo URL Enables SSRF During PDF Generation

Clinic-provided `logo_url` is rendered directly in prescription PDFs, which allows server-side fetches to attacker-controlled or internal URLs during WeasyPrint rendering.

## Problem Statement

The system accepts arbitrary clinic logo URLs and injects them into HTML used by WeasyPrint. WeasyPrint resolves remote resources server-side, so a clinic owner can make the backend request internal network targets (SSRF), metadata endpoints, or large payloads.

## Findings

- `logo_url` is editable by clinic owner with no host/scheme allowlist: [backend/users/serializers.py](/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/users/serializers.py:140)
- PDF template directly embeds `clinic.logo_url` in `<img src>`: [backend/prescriptions/templates/prescriptions/pdf.html](/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/prescriptions/templates/prescriptions/pdf.html:129)
- PDF generation calls WeasyPrint with default resource fetching behavior: [backend/prescriptions/pdf.py](/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/prescriptions/pdf.py:17)

## Proposed Solutions

### Option 1: Strict allowlist for remote logo hosts

**Approach:** Validate `logo_url` against approved CDN/storage domains and reject everything else.

**Pros:**
- Fastest mitigation.
- Keeps remote image workflow.

**Cons:**
- Operational overhead for allowlist maintenance.
- Still relies on outbound network access.

**Effort:** 2-4 hours

**Risk:** Medium

---

### Option 2: Proxy/download at upload time and store sanitized media only

**Approach:** Replace free-form URL input with upload or controlled fetch pipeline; persist logo in trusted storage and reference only trusted internal URL/path.

**Pros:**
- Strong SSRF mitigation.
- Better reliability/performance for PDF rendering.

**Cons:**
- Requires storage/upload flow changes.
- Larger implementation.

**Effort:** 1-2 days

**Risk:** Low

---

### Option 3: Disable network fetching in WeasyPrint and use local/data URIs only

**Approach:** Configure custom `url_fetcher` to block external schemes/hosts; allow only internal/static sources.

**Pros:**
- Defense-in-depth at render layer.
- Works even if validation regresses.

**Cons:**
- Requires careful handling for existing remote logos.
- Potential compatibility work.

**Effort:** 4-8 hours

**Risk:** Low

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- [backend/users/serializers.py](/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/users/serializers.py)
- [backend/prescriptions/templates/prescriptions/pdf.html](/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/prescriptions/templates/prescriptions/pdf.html)
- [backend/prescriptions/pdf.py](/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/prescriptions/pdf.py)

**Related components:**
- Clinic settings (`/api/v1/auth/clinic/update/`)
- Prescription PDF generation pipeline

**Database changes (if any):**
- Not required for minimal mitigation

## Resources

- Branch under review: `feat/phase3-branding-settings`
- Related plan context: [2026-02-27-saas-multi-tenant-brainstorm.md](/Users/praburajasekaran/Documents/local-htdocs/sivanethram/docs/plans/2026-02-27-saas-multi-tenant-brainstorm.md)

## Acceptance Criteria

- [ ] `logo_url` accepts only trusted/approved sources (or upload-only workflow)
- [ ] PDF renderer cannot fetch arbitrary external/internal URLs
- [ ] Added tests for malicious/internal URL attempts
- [ ] Manual verification: valid clinic logos still render in PDF

## Work Log

### 2026-02-28 - Review Discovery

**By:** Codex

**Actions:**
- Reviewed clinic update serializer, PDF template, and PDF render path.
- Confirmed untrusted `logo_url` is used as server-fetched resource during PDF creation.
- Classified as P1 due to SSRF potential.

**Learnings:**
- Branding feature introduced a new external fetch path in backend rendering.
- Existing controls do not constrain remote logo sources.

## Notes

- This is a merge-blocking security finding.
