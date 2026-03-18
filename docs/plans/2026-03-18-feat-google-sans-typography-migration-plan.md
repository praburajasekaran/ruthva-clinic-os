---
title: "feat: Migrate typography to Google Sans"
type: feat
status: completed
date: 2026-03-18
---

# feat: Migrate Typography to Google Sans

## Overview

Replace Manrope + Noto Sans Tamil with **Google Sans** — a single variable font covering Latin, Tamil, and Devanagari scripts. This gives the clinic app a bolder, more professional feel while unifying the font stack across all three scripts.

## Problem Statement / Motivation

- Manrope renders too thin/light for a healthcare application — lacks visual weight and authority
- Current setup requires managing two separate fonts (Manrope + Noto Sans Tamil) with a third needed for Hindi (Noto Sans Devanagari)
- Google Sans covers all three scripts in one variable font, simplifying the stack
- Variable font axes (weight 400–700, optical size) provide better typographic control

## Proposed Solution

Load Google Sans via CDN `<link>` tag (not yet available in `next/font/google`), remove Manrope and Noto Sans Tamil, and update all font references across frontend and backend.

### Google Fonts CDN URL

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link
  href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap"
  rel="stylesheet"
/>
```

### Fallback Font Stack

```
'Google Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
```

## Technical Approach

### Phase 1: Frontend Font Loading

#### 1.1 Update `frontend/src/app/layout.tsx`

**Before:**
```tsx
import { inter, notoSansTamil } from "@/lib/fonts";
// ...
<html lang="en" className={`${inter.variable} ${notoSansTamil.variable}`}>
  <body className="font-sans antialiased">
```

**After:**
```tsx
// Remove font imports entirely
// ...
<html lang="en">
  <head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link
      href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body className="font-sans antialiased">
```

Note: Next.js 14 App Router supports `<head>` children in `layout.tsx` for `<link>` tags.

#### 1.2 Update `frontend/src/lib/fonts.ts`

Delete or empty this file. Manrope and Noto Sans Tamil imports are no longer needed.

#### 1.3 Update `frontend/tailwind.config.ts`

**Before:**
```ts
fontFamily: {
  sans: ["var(--font-inter)"],
  tamil: ["var(--font-tamil)"],
},
```

**After:**
```ts
fontFamily: {
  sans: ["'Google Sans'", "system-ui", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "sans-serif"],
},
```

Remove `fontFamily.tamil` — Google Sans handles Tamil natively.

#### 1.4 Update `frontend/src/app/globals.css`

Remove the print media Tamil font override (lines 146–151):
```css
/* DELETE this block */
.font-tamil,
[style*="font-tamil"] {
  font-family: var(--font-tamil), "Noto Sans Tamil", sans-serif !important;
}
```

### Phase 2: Remove `font-tamil` from Components

Remove the `font-tamil` Tailwind class from all 12 usages across 7 components. Tamil text will render via the unified `font-sans` (Google Sans).

| File | Line(s) | Change |
|------|---------|--------|
| `components/ui/BilingualLabel.tsx` | 23 | Remove `font-tamil` from className |
| `components/ui/DoshaChip.tsx` | 47 | Remove `font-tamil` from className |
| `components/consultations/ConsultationForm.tsx` | 216 | Remove `font-tamil` from className |
| `components/consultations/EnvagaiThervu.tsx` | 27 | Remove `font-tamil` from className |
| `components/consultations/DiagnosticDataDisplay.tsx` | 63 | Remove `font-tamil` from className |
| `components/prescriptions/MedicationRow.tsx` | 143, 172 | Remove `font-tamil` from className |
| `app/(dashboard)/prescriptions/[id]/page.tsx` | 143, 153, 202, 218, 234, 262 | Remove `font-tamil` from className |

While touching these files, add `lang="ta"` to Tamil text spans that are missing it (only `DoshaChip.tsx` currently has it). This fixes a WCAG 3.1.2 (Language of Parts) accessibility gap.

### Phase 3: Fix Print Prescription Page

**File:** `frontend/src/app/(dashboard)/prescriptions/[id]/print/page.tsx`

1. **Remove line 16:** `const tamil = { style: { fontFamily: "var(--font-tamil)" } };`
2. **Remove all `{...tamil}` spreads** (~11 usages) — Tamil text renders via the default Google Sans font
3. The `TamilHeader` and `BilingualTh` components no longer need the tamil style spread

**Fix print race condition** in `PrintTrigger.tsx` — CDN fonts may not be loaded when `window.print()` fires after 500ms:

**Before:**
```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    window.print();
  }, 500);
  return () => clearTimeout(timer);
}, []);
```

**After:**
```tsx
useEffect(() => {
  const timer = setTimeout(async () => {
    await document.fonts.ready;
    window.print();
  }, 500);
  return () => clearTimeout(timer);
}, []);
```

### Phase 4: Backend PDF (WeasyPrint)

The SSRF-blocking `_safe_url_fetcher` in `backend/prescriptions/pdf.py` blocks all non-data URIs, so WeasyPrint cannot fetch Google Sans from CDN. Solution: **install Google Sans in the Docker image**.

#### 4.1 Download Google Sans font files

Download the `.ttf` variable font files and place them in `backend/fonts/google-sans/`.

#### 4.2 Update Dockerfile

```dockerfile
# Install Google Sans font
COPY fonts/google-sans/ /usr/share/fonts/truetype/google-sans/
RUN fc-cache -f -v
```

#### 4.3 Update PDF template

**File:** `backend/prescriptions/templates/prescriptions/pdf.html` (line 11)

**Before:**
```css
font-family: 'Noto Sans', 'Noto Sans Tamil', sans-serif;
```

**After:**
```css
font-family: 'Google Sans', sans-serif;
```

### Phase 5: Backend Email Template

**File:** `backend/utils/email_templates.py` (line 22)

**Before:**
```python
_FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
```

**After:**
```python
_FONT = "'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
```

Note: Email clients won't load Google Sans — this is for brand consistency. The fallback stack handles actual rendering.

## Acceptance Criteria

### Functional Requirements

- [ ] All frontend pages render in Google Sans (English text)
- [ ] Tamil text renders correctly in Google Sans without `font-tamil` class
- [ ] Print prescription page renders Tamil text correctly
- [ ] `window.print()` waits for fonts to load before printing
- [ ] WeasyPrint PDFs render in Google Sans (both English and Tamil)
- [ ] Email templates reference Google Sans in font stack

### Non-Functional Requirements

- [ ] Preconnect hints present for `fonts.googleapis.com` and `fonts.gstatic.com`
- [ ] `font-display: swap` set via `&display=swap` URL parameter
- [ ] `lang="ta"` added to all Tamil text spans (WCAG 3.1.2)
- [ ] No stale references to `--font-inter`, `--font-tamil`, Manrope, or Noto Sans Tamil

### Quality Gates

- [ ] Visual QA: prescription detail page, print page, generated PDF
- [ ] Tamil text renders correctly across all surfaces
- [ ] No Tailwind build warnings about undefined `font-tamil` utility

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Google Sans CDN goes down | Low | Medium — FOUT to system fonts | Fallback stack includes system-ui |
| Tamil glyphs missing from CDN subset | Low | High — boxes instead of Tamil | Already verified via Google Fonts preview (screenshots in brainstorm) |
| Print fires before fonts load | Medium | High — wrong fonts on clinical documents | `document.fonts.ready` guard |
| WeasyPrint can't find Google Sans | Medium | High — boxes in PDF | Install font in Docker image |
| Layout shift from Manrope → Google Sans metrics | Certain | Low — cosmetic only | Visual QA pass |

## Files Changed (Complete Checklist)

### Frontend (modify)
- [x] `frontend/src/lib/fonts.ts` — delete contents or file
- [x] `frontend/src/app/layout.tsx` — remove font imports, add CDN link tags
- [x] `frontend/tailwind.config.ts` — update fontFamily.sans, remove fontFamily.tamil
- [x] `frontend/src/app/globals.css` — remove print Tamil font override
- [x] `frontend/src/components/ui/BilingualLabel.tsx` — remove font-tamil, add lang="ta"
- [x] `frontend/src/components/ui/DoshaChip.tsx` — remove font-tamil
- [x] `frontend/src/components/consultations/ConsultationForm.tsx` — remove font-tamil, add lang="ta"
- [x] `frontend/src/components/consultations/EnvagaiThervu.tsx` — remove font-tamil, add lang="ta"
- [x] `frontend/src/components/consultations/DiagnosticDataDisplay.tsx` — remove font-tamil, add lang="ta"
- [x] `frontend/src/components/prescriptions/MedicationRow.tsx` — remove font-tamil, add lang="ta"
- [x] `frontend/src/app/(dashboard)/prescriptions/[id]/page.tsx` — remove font-tamil, add lang="ta"
- [x] `frontend/src/app/(dashboard)/prescriptions/[id]/print/page.tsx` — remove tamil const + all spreads
- [x] `frontend/src/app/(dashboard)/prescriptions/[id]/print/PrintTrigger.tsx` — add document.fonts.ready guard

### Backend (modify)
- [x] `backend/prescriptions/templates/prescriptions/pdf.html` — update font-family
- [x] `backend/utils/email_templates.py` — update _FONT constant
- [x] `backend/Dockerfile` — add Google Sans font installation

### Backend (add)
- [x] `backend/fonts/google-sans/` — Google Sans .ttf files for WeasyPrint

## References

- Brainstorm: `docs/brainstorms/2026-03-18-google-sans-typography-brainstorm.md`
- Google Fonts URL: `https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap`
- Security learning: `docs/solutions/security-issues/weasyprint-logo-url-ssrf-allowlist-mitigation.md`
- Performance learning: Font preconnect patterns from Motionify portal optimization
