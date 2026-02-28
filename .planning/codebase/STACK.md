# Technology Stack

**Analysis Date:** 2026-02-28

## Languages

**Primary:**
- Python 3.11.1 - Backend API (Django)
- TypeScript 5.9.3 - Frontend (Next.js)
- JavaScript - Build scripts and configuration

**Secondary:**
- HTML/CSS - Generated via Next.js/Tailwind
- SQL - PostgreSQL queries via Django ORM

## Runtime

**Environment:**
- Node.js 18+ (inferred from Next.js 14.2.35)
- Python 3.11.1

**Package Manager:**
- npm (frontend) - package-lock.json present
- pnpm (frontend) - pnpm-lock.yaml present (appears to be used in parallel)
- pip (backend)

## Frameworks

**Core:**
- Django 5.1.x - Backend REST API
- Next.js 14.2.35 - Frontend React application
- React 18 - UI components

**API & Serialization:**
- Django REST Framework 3.15.x - REST API implementation
- drf-spectacular 0.28.x - OpenAPI/Swagger documentation
- djangorestframework-simplejwt 5.3.x - JWT authentication

**UI/Styling:**
- Tailwind CSS 3.4.1 - Utility-first CSS framework
- Lucide React 0.564.0 - Icon library

**Database:**
- PostgreSQL (configured via dj-database-url)
- psycopg2-binary 2.9.x - PostgreSQL adapter for Python

**Admin/ORM:**
- Django Admin - Built-in admin interface
- Django ORM - Object-relational mapping

## Key Dependencies

**Critical:**
- django 5.1.x - Core framework (Backend)
- djangorestframework 3.15.x - REST API layer
- djangorestframework-simplejwt 5.3.x - JWT token management
- next 14.2.35 - Frontend framework
- react 18 - UI library
- axios 1.13.5 - HTTP client for frontend

**Infrastructure:**
- django-cors-headers 4.4.x - CORS handling in Django
- django-filter 24.0 - Query filtering for REST APIs
- dj-database-url 2.2.x - Database URL parsing
- python-decouple 3.8.x - Environment variable management
- resend 2.0.x - Email service SDK
- weasyprint 62.0 - PDF generation for reports

**Frontend:**
- lucide-react 0.564.0 - Icon components
- tailwindcss 3.4.1 - Styling framework
- postcss 8.x - CSS transformation

**Development:**
- typescript 5.9.3 - Type checking
- eslint 8.x - Code linting
- eslint-config-next 14.2.35 - Next.js ESLint rules

## Configuration

**Environment:**
- Configuration via `.env` files (not committed)
- Environment variables managed with python-decouple (backend) and dotenv (frontend)
- Backend: `DJANGO_SECRET_KEY`, `DATABASE_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CLINIC_DOCTOR_NAME`
- Frontend: `NEXT_PUBLIC_API_URL` (publicly accessible API base URL)

**Build:**
- Backend: Django built-in management commands
- Frontend: Next.js build system
- Config files: `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`

## Platform Requirements

**Development:**
- Python 3.11+
- Node.js 18+ (for Next.js 14)
- PostgreSQL 12+ (for database)
- Virtual environment (venv present in `/backend/venv`)

**Production:**
- PostgreSQL database
- Node.js runtime for Next.js
- Python runtime for Django
- Environment variables configured for production
- Secure settings: SSL redirect, secure cookies enforced in `config/settings/production.py`

---

*Stack analysis: 2026-02-28*
