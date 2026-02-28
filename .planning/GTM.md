# Go-to-Market Plan: Sivanethram — AYUSH Clinic SaaS

## Executive Summary

Sivanethram is a multi-tenant SaaS platform for AYUSH clinics (Ayurveda, Yoga & Naturopathy, Unani, Siddha, Homeopathy). Each clinic gets a subdomain, manages patients, consultations, and prescriptions in complete data isolation. The platform targets solo and small-clinic AYUSH practitioners (1-3 doctors) in India — an underserved market with no purpose-built SaaS offering discipline-specific diagnostic forms.

---

## 1. Market Landscape

### Market Size
- **India has 800,000+ registered AYUSH practitioners** (Ministry of AYUSH, Govt. of India)
- **400,000+ AYUSH clinics and hospitals** across the country
- Majority are solo/small practices with 1-3 practitioners
- Annual growth of ~15% in AYUSH sector driven by government push (National AYUSH Mission) and rising consumer demand

### Current State
- Most AYUSH clinics use **paper records or generic spreadsheets**
- Existing EHR/clinic management software is built for allopathic (Western) medicine
- No SaaS product offers **discipline-specific diagnostic forms** (e.g., Siddha Envagai Thervu, Ayurveda Prakriti analysis)
- Language barrier: many practitioners prefer regional languages (Tamil, Hindi, Malayalam, etc.)

### Competitive Gap
| Competitor Type | Gap Sivanethram Fills |
|---|---|
| Generic EHR (Practo, Clinicia) | No AYUSH-specific diagnostic forms, expensive, bloated features |
| Government portals (AUSH Portal) | Reporting-focused, not practice management |
| Paper/Excel | No automation, no PDF prescriptions, no follow-up reminders |
| Custom-built apps | Expensive, single-clinic, no SaaS benefits |

---

## 2. Target Customer

### Primary Persona: Dr. Karthik — Solo Siddha Practitioner
- **Age:** 30-50
- **Location:** Tier 2/3 city in Tamil Nadu
- **Practice:** Solo clinic, sees 15-30 patients/day
- **Pain points:** Paper records are hard to search, no follow-up tracking, handwritten prescriptions are slow
- **Tech comfort:** Uses WhatsApp, Google, smartphone daily; comfortable with simple web apps
- **Willingness to pay:** Rs 500-2000/month for a tool that saves 1-2 hours/day

### Secondary Persona: Dr. Ananya — Small Ayurveda Clinic Owner
- **Age:** 35-55
- **Location:** Kerala or Karnataka
- **Practice:** 2-3 doctors, shared patient base
- **Pain points:** Team coordination, role management, data portability from old systems
- **Willingness to pay:** Rs 1000-3000/month

### Buying Triggers
1. Lost patient records due to paper damage/disorganization
2. Missed follow-ups leading to patient churn
3. Government compliance requirements increasing
4. Competitor clinic adopting digital tools
5. Desire to appear professional with branded prescriptions

---

## 3. Positioning & Messaging

### One-Liner
> **Sivanethram: The clinic management platform built for AYUSH practitioners.**

### Value Proposition (30 seconds)
> Sign up, get your own clinic subdomain, and start managing patients in minutes. Sivanethram gives you discipline-specific diagnostic forms, branded PDF prescriptions, automated follow-up reminders, and complete data privacy — built specifically for Ayurveda, Siddha, Unani, Yoga, and Homeopathy clinics.

### Key Messages by Audience

| Audience | Message |
|---|---|
| Solo practitioner | "Stop losing patient records. Go digital in 5 minutes." |
| Small clinic owner | "Manage your team, patients, and prescriptions — all in one place." |
| Tech-savvy doctor | "Your own subdomain, API-ready, CSV import/export, keyboard shortcuts." |
| Traditional practitioner | "Tamil-first prescription layout. Your practice, your language." |

### Differentiators (Why Sivanethram, Not X?)
1. **AYUSH-native** — Diagnostic forms built for your discipline, not retrofitted from Western medicine
2. **Multi-tenant SaaS** — Your own subdomain, your own branding, your data is isolated
3. **Affordable** — Priced for solo practitioners, not enterprise hospitals
4. **Data portable** — Import your existing data via CSV, export anytime, no lock-in
5. **Bilingual** — Tamil-primary print layout with English support

---

## 4. Pricing Strategy

### Recommended Model: Freemium + Tiered

| Tier | Price (Monthly) | Included | Target |
|---|---|---|---|
| **Free** | Rs 0 | 50 active patients, 1 user, basic PDF, Sivanethram branding on PDF | Solo practitioner trying it out |
| **Starter** | Rs 499/month | 200 active patients, 2 users, custom branding, follow-up reminders | Solo practitioner committed |
| **Clinic** | Rs 1,499/month | 1,000 active patients, 5 users, pharmacy module, data export, priority support | Small clinic |
| **Clinic Plus** | Rs 2,999/month | Unlimited patients, 15 users, all features, phone support, custom integrations | Growing clinic |

### Pricing Rationale
- Free tier drives adoption — AYUSH practitioners are price-sensitive and need to see value first
- Rs 499 is less than the cost of one wasted hour per day
- Annual discount: 2 months free (pay for 10, get 12)
- Payment via **Razorpay** (Phase 6) — standard for Indian SaaS, supports UPI/cards/net banking

---

## 5. Launch Strategy

### Pre-Launch (Months 1-2) — Build Foundation

**Goal:** Complete Phases 3-5, validate with 10 pilot clinics

| Action | Details |
|---|---|
| Complete Phase 3: Branding & Settings | Logo upload, clinic settings, print preview |
| Complete Phase 4: Data Portability | Full CSV import/export for all entities |
| Complete Phase 5: Multi-Discipline | Ayurveda Prakriti form + generic fallback |
| Recruit 10 pilot clinics | Personal network, AYUSH college alumni, local practitioners |
| Pilot program | Free access for 3 months in exchange for feedback and testimonials |
| Set up landing page | Simple page at sivanethram.com with signup waitlist |
| Social media presence | Create accounts on Instagram, YouTube, WhatsApp Business |

### Soft Launch (Month 3) — First 50 Clinics

**Goal:** Validate pricing, onboarding flow, and retention

| Action | Details |
|---|---|
| Open signups | Allow self-service signup with free tier |
| Complete Phase 6 | Pharmacy module + usage billing |
| Onboarding automation | Welcome email sequence (Day 1, 3, 7, 14) |
| Content marketing | Publish 2 blog posts/week on AYUSH practice management |
| WhatsApp community | Create a practitioners group for support and feedback |
| Referral program | "Invite a colleague, both get 1 month free Starter" |

### Public Launch (Month 4-6) — Scale to 200+ Clinics

**Goal:** Establish market presence, achieve Rs 1L+ MRR

| Action | Details |
|---|---|
| Product Hunt / Indian alternatives | Launch on Product Hunt, list on SaaSWorthy, G2 |
| AYUSH conference presence | Attend 2-3 AYUSH medical conferences with demo booth |
| Partnership with AYUSH colleges | Free access for final-year students starting their practice |
| YouTube tutorial series | "Digital Clinic in 5 Minutes" — screen recordings in Tamil & English |
| Google Ads (targeted) | "Siddha clinic software", "Ayurveda patient management", "AYUSH EHR" |
| Local language content | Blog and video content in Tamil, Hindi, Malayalam, Kannada |

---

## 6. Distribution Channels

### Channel Priority (ranked by expected ROI)

| # | Channel | Strategy | Cost | Expected Impact |
|---|---|---|---|---|
| 1 | **WhatsApp word-of-mouth** | Referral program, shareable prescription PDFs with "Powered by Sivanethram" | Low | High — AYUSH community is tight-knit |
| 2 | **YouTube** | Tamil/English tutorial videos showing real workflows | Low | High — practitioners search YouTube for solutions |
| 3 | **Google Search (SEO)** | Blog content targeting "siddha clinic software", "ayurveda patient management" | Low | Medium-High — long-term organic traffic |
| 4 | **AYUSH conferences** | Demo booth, flyers, live signup | Medium | High — direct access to target audience |
| 5 | **Google Ads** | Targeted keywords for AYUSH + clinic + software | Medium | Medium — validate before scaling |
| 6 | **Instagram** | Before/after (paper vs digital), feature highlights, practitioner spotlights | Low | Medium — visual platform, good for branding |
| 7 | **AYUSH college partnerships** | Free access for graduating students | Low | Long-term — lifetime customers from Day 1 |
| 8 | **Pharmacy distributors** | Partner with AYUSH medicine distributors to recommend the platform | Low | Medium — trusted channel for practitioners |

---

## 7. Onboarding & Activation

### The "Aha Moment"
> A practitioner signs up, adds their first patient, creates a consultation with their discipline-specific form, and generates a branded PDF prescription — all within 10 minutes.

### Onboarding Flow
1. **Signup** (2 min) — Name, email, password, clinic name, discipline → instant subdomain
2. **Guided setup** (3 min) — Upload logo, set clinic address, choose paper size
3. **First patient** (2 min) — Add or import a patient
4. **First consultation** (3 min) — Fill diagnostic form, generate prescription PDF
5. **Celebration** — "Your first digital prescription is ready!" with share/print options

### Activation Metrics
| Metric | Target | Timeframe |
|---|---|---|
| Signup → First patient added | 70% | Within 24 hours |
| First patient → First consultation | 50% | Within 48 hours |
| First consultation → PDF generated | 80% | Same session |
| Free → Paid conversion | 10-15% | Within 30 days |
| Monthly churn (paid) | < 5% | Ongoing |

---

## 8. Growth Loops

### Loop 1: Prescription Virality
```
Doctor generates PDF → PDF has "Powered by Sivanethram" →
Patient shows PDF to another doctor → Doctor signs up
```

### Loop 2: Referral Network
```
Doctor invites colleague → Both get free month →
Colleague invites their network → Exponential growth
```

### Loop 3: Content & SEO
```
Publish AYUSH practice tips → Rank on Google →
Practitioner finds blog → Signs up for free tier → Converts to paid
```

### Loop 4: Team Expansion
```
Clinic owner signs up → Invites 2 doctors →
Doctors leave and open own clinic → Sign up independently
```

---

## 9. Key Metrics & Milestones

### North Star Metric
**Monthly Active Clinics (clinics with 5+ consultations/month)**

### Milestone Targets

| Milestone | Target | Timeline |
|---|---|---|
| Pilot clinics onboarded | 10 | Month 2 |
| Free tier signups | 50 | Month 3 |
| First paying customer | 1 | Month 3 |
| Paying clinics | 20 | Month 4 |
| MRR | Rs 20,000 | Month 4 |
| Paying clinics | 50 | Month 6 |
| MRR | Rs 1,00,000 | Month 6 |
| Paying clinics | 200 | Month 12 |
| MRR | Rs 4,00,000 | Month 12 |
| Break-even | - | Month 10-14 |

### Unit Economics (Target)
- **CAC (Customer Acquisition Cost):** Rs 500-1,000 (mostly organic/referral)
- **LTV (Lifetime Value):** Rs 12,000-36,000 (avg Rs 1,000/month x 12-36 months)
- **LTV:CAC Ratio:** > 10:1
- **Payback Period:** < 1 month

---

## 10. Operating Costs (Monthly Estimate at Scale)

| Item | Monthly Cost | Notes |
|---|---|---|
| Server (VPS/Cloud) | Rs 3,000-8,000 | DigitalOcean/Hetzner, scales with usage |
| PostgreSQL (managed) | Rs 2,000-5,000 | Or self-hosted on VPS |
| Cloudflare R2 (storage) | Rs 500-1,000 | Logo uploads, exports |
| Resend (email) | Rs 0-1,500 | Free tier covers early stage |
| Domain + SSL | Rs 200 | Annual, amortized |
| Razorpay fees | 2% of revenue | Payment processing |
| **Total** | **Rs 6,000-16,000** | Lean until 100+ clinics |

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Low adoption — practitioners resist digital tools | Medium | High | Free tier, WhatsApp support, in-person demos at conferences |
| Price sensitivity — practitioners won't pay | Medium | High | Generous free tier, Rs 499 starter is very low barrier |
| Competition from generalist EHR adding AYUSH features | Low | Medium | Deep discipline-specific features are hard to replicate; move fast |
| Data privacy concerns | Medium | Medium | Highlight tenant isolation, offer data export, transparent privacy policy |
| Single-developer bottleneck | High | High | Prioritize ruthlessly, automate deploys, keep architecture simple |
| Regional language support needed beyond Tamil | Medium | Medium | Progressive rollout: Tamil → Hindi → Malayalam → Kannada |
| Government regulation changes | Low | Medium | Stay updated with Ministry of AYUSH directives, build compliance features as needed |

---

## 12. 90-Day Action Plan

### Days 1-30: Ship & Recruit
- [ ] Complete Phase 3 (Branding & Settings)
- [ ] Complete Phase 4 (Data Portability)
- [ ] Build landing page at sivanethram.com
- [ ] Recruit 5 pilot clinics from personal network
- [ ] Set up Instagram and YouTube accounts
- [ ] Record first YouTube demo video (Tamil)

### Days 31-60: Validate & Iterate
- [ ] Complete Phase 5 (Multi-Discipline forms)
- [ ] Onboard 10 pilot clinics with hands-on support
- [ ] Collect feedback, fix top 5 pain points
- [ ] Gather 3 written testimonials from pilot users
- [ ] Publish 4 blog posts (SEO-targeted)
- [ ] Launch WhatsApp community group

### Days 61-90: Open & Grow
- [ ] Complete Phase 6 (Pharmacy & Billing)
- [ ] Open self-service signups with free tier
- [ ] Launch referral program
- [ ] Attend 1 AYUSH conference/meetup
- [ ] Run targeted Google Ads experiment (Rs 5,000 budget)
- [ ] Target: 50 signups, 5 paying customers
- [ ] Target: Rs 5,000+ MRR

---

## 13. Long-Term Vision (Year 2-3)

1. **Multi-language support** — Hindi, Malayalam, Kannada, Telugu interfaces
2. **Patient appointment booking** — Online scheduling with SMS reminders
3. **Telemedicine module** — Video consultations for remote patients
4. **Government compliance** — Auto-generate reports for AYUSH regulatory bodies
5. **AI-powered insights** — Treatment outcome analytics, prescription pattern analysis
6. **Marketplace** — Connect AYUSH medicine suppliers with clinics
7. **Mobile app** — Native Android app (where most Indian practitioners operate)
8. **API platform** — Let clinics integrate with existing tools (accounting, lab systems)

---

*This plan is a living document. Review and update monthly based on actual metrics and market feedback.*

*Last updated: 2026-02-28*
