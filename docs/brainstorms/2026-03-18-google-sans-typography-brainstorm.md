# Typography: Switch to Google Sans

**Date:** 2026-03-18
**Status:** Ready for planning

## What We're Building

Replace the current font stack (Manrope + Noto Sans Tamil) with **Google Sans** as the single font family across the entire Ruthva Clinic OS application. Google Sans is a variable font that natively covers Latin, Tamil, and Devanagari (Hindi) scripts in one font file.

## Why This Approach

- **Original problem:** Manrope feels too thin/light for a clinic application — lacks the visual weight and authority expected in a healthcare context
- **Multi-script unification:** Google Sans covers English, Tamil, and Hindi in a single variable font. Eliminates the need to manage separate font families (Manrope + Noto Sans Tamil + future Noto Sans Devanagari)
- **Variable font features:** Weight range 400–700, optical size axis (auto-adjusts letterforms for small UI text vs large headings) — ideal for data-dense clinic dashboards
- **Tone:** Professional but approachable. Right register for healthcare SaaS — signals modern, reliable, well-built
- **Google product association:** Acceptable tradeoff. For a clinic SaaS, feeling like a well-built Google tool is a net positive

## Key Decisions

1. **Font:** Google Sans (variable, all scripts in one file)
2. **Loading method:** `<link>` tag from Google Fonts CDN (not available in `next/font/google` yet)
3. **Replaces:** Manrope (primary) and Noto Sans Tamil (secondary) — both removed
4. **Weight range:** 400–700 (regular through bold)
5. **Scripts covered:** Latin, Tamil, Devanagari (Hindi)
6. **Prescription PDFs:** Also switch from Noto Sans / Noto Sans Tamil to Google Sans

## Scope of Changes

- `frontend/src/lib/fonts.ts` — remove Manrope and Noto Sans Tamil imports, remove next/font/google usage for these
- `frontend/src/app/layout.tsx` — add Google Fonts `<link>` tags, update font variable application
- `frontend/tailwind.config.ts` — update `fontFamily.sans` and remove `fontFamily.tamil`
- `frontend/src/app/globals.css` — remove Tamil-specific font overrides, update any font references
- `backend/prescriptions/templates/prescriptions/pdf.html` — update font-family declarations
- Any components with hardcoded Tamil font references

## Open Questions

None — all key decisions resolved during brainstorming.
