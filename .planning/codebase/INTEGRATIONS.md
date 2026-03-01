# External Integrations

**Analysis Date:** 2026-02-28

## APIs & External Services

**Email Service:**
- Resend - Transactional email delivery
  - SDK/Client: `resend` 2.0.x (Python)
  - Auth: `RESEND_API_KEY` environment variable
  - Configuration: `RESEND_FROM_EMAIL` for sender address
  - Usage: Clinic doctor follow-up reminders (prescriptions and procedures)
  - Implementation: `backend/reminders/email.py` with functions `send_prescription_followup_email()` and `send_procedure_followup_email()`

## Data Storage

**Databases:**
- PostgreSQL
  - Connection: `DATABASE_URL` environment variable (parsed by dj-database-url)
  - Client: psycopg2-binary (Python adapter)
  - ORM: Django ORM with custom User model
  - Development default: `postgres://postgres:postgres@localhost:5432/sivanethram`
  - Apps using database: users, clinics, patients, consultations, prescriptions, reminders

**File Storage:**
- Local filesystem only
  - Static files: `STATIC_ROOT = BASE_DIR / "staticfiles"`
  - Media files: `MEDIA_ROOT = BASE_DIR / "media"`
  - No cloud storage integration detected

**Caching:**
- None detected in current configuration
- No Redis or Memcached dependencies

## Authentication & Identity

**Auth Provider:**
- Custom implementation (no third-party OAuth)
  - Custom User model: `AUTH_USER_MODEL = "users.User"` in `config/settings/base.py`
  - Implementation: `users/authentication.py` - TenantJWTAuthentication

**Token Management:**
- JWT (JSON Web Tokens) via djangorestframework-simplejwt 5.3.x
  - Access tokens stored in browser localStorage
  - Refresh tokens for token refresh
  - Frontend auth interceptor: `frontend/src/lib/api.ts` handles `Authorization: Bearer {token}` header
  - Auto-redirect on 401 (unauthorized) to `/login`

**Multi-Tenancy:**
- Clinic-based multi-tenancy
  - Clinic slug passed via `X-Clinic-Slug` header in development
  - Custom middleware: `clinics.middleware.TenantMiddleware` in `config/settings/base.py`
  - Clinic slug stored in browser localStorage (key: `clinic_slug`)

## Monitoring & Observability

**Error Tracking:**
- None detected
- No Sentry, DataDog, or similar integration

**Logs:**
- Django logging configuration (standard Python logging)
- Resend email failures logged via `logger.exception()` in `reminders/email.py`
- Timezone: Asia/Kolkata (UTC+5:30)

## CI/CD & Deployment

**Hosting:**
- Not specified in current configuration
- Likely candidates: Heroku, Railway, AWS, DigitalOcean, or similar PAAS (inferred from dj-database-url usage)

**CI Pipeline:**
- None detected in repository
- No GitHub Actions, GitLab CI, or Jenkins configuration found

## Environment Configuration

**Required env vars:**
- `DJANGO_SECRET_KEY` - Django secret key
- `DATABASE_URL` - PostgreSQL connection string
- `RESEND_API_KEY` - Resend email API key
- `RESEND_FROM_EMAIL` - Sender email address and name
- `ALLOWED_HOSTS` - Comma-separated list of allowed hosts
- `CORS_ALLOWED_ORIGINS` - Comma-separated list of CORS origins
- `CLINIC_DOCTOR_NAME` - Doctor's name for email signatures
- `NEXT_PUBLIC_API_URL` - API base URL (frontend, public)

**Example:** See `backend/.env.example` and `frontend/.env.example`

**Secrets location:**
- `.env` files (not committed to git per `.gitignore`)
- Development: `.env` in each directory
- Production: Environment variables set via hosting platform

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- Email callbacks: Resend sends emails but no webhook handling for delivery status detected
- No Stripe, payment, or SMS webhooks found

## Inter-Service Communication

**Frontend to Backend:**
- HTTP REST API via axios
- Base URL: `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000/api/v1`)
- Auth: JWT Bearer tokens in Authorization header
- Multi-tenant support: `X-Clinic-Slug` header for clinic context

**Backend API Documentation:**
- OpenAPI/Swagger via drf-spectacular
- API title: "AYUSH Clinic Platform API"
- API version: 2.0.0

---

*Integration audit: 2026-02-28*
