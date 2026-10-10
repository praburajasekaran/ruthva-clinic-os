# Heading typography

Clinic pages, clinical forms, account screens, and admin pages use one heading hierarchy. Define values in `frontend/src/app/globals.css`; Tailwind exposes them as semantic text utilities in `frontend/tailwind.config.ts`.

| Role | Utility | Size at the default text setting |
| --- | --- | --- |
| Page or patient title | `text-heading-page` | 30–36px, responsive |
| Main section | `text-heading-section` | 22–24px, responsive |
| Nested section or card | `text-heading-subsection` | 18px |
| Secondary heading language | `text-heading-secondary` | 75% of the parent heading |

Size, line height, weight, and tracking are defined together. Georgia remains the heading typeface. Sizes use `rem` and responsive limits so browser text scaling still applies.

`FormSection` uses the main section role. Its bilingual titles pass `variant="heading"` to `BilingualLabel`. English inherits the parent heading style; Tamil uses the secondary heading role with extra line height and normal tracking. Field labels retain the default variant.

Landing page display typography and prescription print sizes have separate layout requirements and retain their existing styles.

## Verification

- Frontend type checking and lint passed.
- Existing home and complete-visit browser workflows passed: two tests.
- Manual prescription preview: English section titles measured 24px and Tamil 18px at a 1280px viewport. Field labels measured 14px.
- Mobile preview: English section titles measured 22px and Tamil 16.5px at a 390px viewport. The page had no horizontal overflow.
- Screenshots and computed styles are saved in the ignored `.audit/heading-tokens/` directory.
- The Cloudflare build and configuration preflight passed. The deployed prescription page rendered English titles at 24px and Tamil at 18px.

Deployed on 10 October 2026 as frontend Worker version `d877db38-a183-4012-9f7e-059f06b7755b`. The API Worker was unchanged.
