# Project Initialization Design

**Date:** 2026-02-16
**Status:** Approved

## Decision

Monorepo with separate `backend/` and `frontend/` directories. Each runs independently with its own dependencies.

## Structure

```
sivanethram/
├── backend/                  # Django 5 project
│   ├── config/               # Django settings, urls, wsgi
│   │   ├── settings/
│   │   │   ├── base.py       # Shared settings
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── patients/             # Patient registration & records
│   ├── consultations/        # Envagai Thervu, diagnosis
│   ├── prescriptions/        # Prescription builder, PDF gen
│   ├── billing/              # Invoices, payments (Phase 2)
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/                 # Next.js 14 (App Router)
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   ├── components/       # Reusable UI components
│   │   └── lib/              # API client, utilities
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── .env.example
├── docs/                     # Design docs, plans
├── .gitignore
└── README.md
```

## Backend

- Django 5 with split settings (base/dev/prod)
- Django REST Framework + drf-spectacular (OpenAPI)
- djangorestframework-simplejwt for auth
- PostgreSQL via dj-database-url
- django-cors-headers for frontend communication
- Three starter apps: patients, consultations, prescriptions
- Django Admin enabled and configured

## Frontend

- Next.js 14 with App Router + TypeScript
- Tailwind CSS
- Lucide React for icons
- Axios for API communication
- Basic layout with sidebar navigation placeholder

## Dev Experience

- .env.example files for both backend and frontend
- .gitignore covering Python + Node
- Backend on localhost:8000, frontend on localhost:3000
- CORS configured for local development

## Excluded (intentionally)

- No Docker (add later if needed)
- No CI/CD (add when deploying)
- No test setup beyond defaults
- No seed data (add during model implementation)

## Alternatives Considered

1. **Django serves Next.js (django-nextjs)** — Rejected. Tighter coupling, harder to deploy separately.
2. **Separate repositories** — Rejected. Overkill for a small team, harder to coordinate changes.
