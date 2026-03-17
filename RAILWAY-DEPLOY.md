# Railway Deployment Guide

## Architecture

Two Railway services + one Postgres database in a single project:

| Service | Root Dir | Port |
|---------|----------|------|
| **backend** (Django API) | `backend/` | 8000 |
| **frontend** (Next.js) | `frontend/` | 3000 |
| **Postgres** (Railway plugin) | — | auto |

## Step 1: Preserve Local Data

Before deploying, dump your local database to carry over the ayurveda doctor credentials and patient data:

```bash
cd backend
./scripts/db-dump-local.sh
```

This creates `ruthva_clinic_os.dump`.

## Step 2: Create Railway Project

1. Create a new project on Railway
2. Add a **PostgreSQL** database plugin
3. Add two services from your GitHub repo:
   - **backend** — set Root Directory to `backend/`
   - **frontend** — set Root Directory to `frontend/`

## Step 3: Restore Database

Get the `DATABASE_URL` from Railway's Postgres plugin variables, then:

```bash
pg_restore --no-owner --no-acl -d "$DATABASE_URL" ruthva_clinic_os.dump
```

Then run migrations to ensure schema is up to date:

```bash
# From Railway backend service shell, or:
DJANGO_SETTINGS_MODULE=config.settings.production python manage.py migrate
```

## Step 4: Set Environment Variables

### Backend Service

| Variable | Example | Required |
|----------|---------|----------|
| `DATABASE_URL` | (auto from Railway Postgres) | Yes (link the plugin) |
| `DJANGO_SECRET_KEY` | (generate: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`) | Yes |
| `ALLOWED_HOSTS` | `backend-production-xxxx.up.railway.app` | Yes |
| `CORS_ALLOWED_ORIGINS` | `https://frontend-production-xxxx.up.railway.app` | Yes |
| `FRONTEND_URL` | `https://frontend-production-xxxx.up.railway.app` | Yes |
| `AWS_SES_REGION` | `us-east-1` | Yes (for emails) |
| `AWS_ACCESS_KEY_ID` | `AKIA...` | Yes (for emails) |
| `AWS_SECRET_ACCESS_KEY` | `cNke...` | Yes (for emails) |
| `DEFAULT_FROM_EMAIL` | `Ruthva <noreply@ruthva.com>` | No (has default) |
| `CLINIC_DOCTOR_NAME` | `Dr. Subashini` | No (has default) |
| `DJANGO_SETTINGS_MODULE` | `config.settings.production` | No (Dockerfile sets it) |

### Frontend Service

These are build-time args (set in Railway service settings under "Build" > "Build Args"):

| Variable | Example | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_API_URL` | `https://backend-production-xxxx.up.railway.app/api/v1` | Yes |
| `NEXT_PUBLIC_RUTHVA_URL` | `https://ruthva.com` | No (defaults to ruthva.com) |

## Step 5: Custom Domain (Optional)

1. In Railway, go to each service's Settings > Networking
2. Add your custom domain
3. Update `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` accordingly

## Local Development

Local dev is unaffected — `manage.py` still defaults to `config.settings.development`.

```bash
cd backend && source venv/bin/activate && python manage.py runserver
cd frontend && npm run dev
```
