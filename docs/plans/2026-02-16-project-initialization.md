# Project Initialization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scaffold a monorepo with Django 5 backend and Next.js 14 frontend that both start and communicate.

**Architecture:** Monorepo with `backend/` (Django + DRF) and `frontend/` (Next.js App Router + Tailwind). Each runs independently. Frontend calls backend API via Axios. CORS configured for local dev.

**Tech Stack:** Django 5, DRF, PostgreSQL, Next.js 14, TypeScript, Tailwind CSS, Lucide React, Axios

---

### Task 1: Create root .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Write .gitignore covering Python + Node**

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
.venv/
*.egg-info/
dist/
build/
.eggs/

# Django
*.log
local_settings.py
db.sqlite3
media/

# Environment
.env
.env.local
.env.*.local

# Node
node_modules/
.next/
out/
.vercel

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "Add .gitignore for Python and Node"
```

---

### Task 2: Initialize Django backend

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/config/__init__.py`
- Create: `backend/config/settings/__init__.py`
- Create: `backend/config/settings/base.py`
- Create: `backend/config/settings/development.py`
- Create: `backend/config/settings/production.py`
- Create: `backend/config/urls.py`
- Create: `backend/config/wsgi.py`
- Create: `backend/config/asgi.py`
- Create: `backend/manage.py`

**Step 1: Create backend directory and requirements.txt**

```
django>=5.1,<5.2
djangorestframework>=3.15,<4.0
djangorestframework-simplejwt>=5.3,<6.0
django-cors-headers>=4.4,<5.0
django-filter>=24.0
drf-spectacular>=0.28,<1.0
dj-database-url>=2.2,<3.0
python-decouple>=3.8,<4.0
psycopg2-binary>=2.9,<3.0
weasyprint>=62.0
```

**Step 2: Create Python virtual environment and install dependencies**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Step 3: Create Django project manually (not django-admin, for custom layout)**

Create `backend/manage.py`:
```python
#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
```

Create `backend/config/__init__.py`: empty file

Create `backend/config/settings/__init__.py`: empty file

Create `backend/config/settings/base.py`:
```python
"""Base settings shared across all environments."""
import os
from pathlib import Path

from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config("DJANGO_SECRET_KEY", default="change-me-in-production")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    # Local apps
    "patients",
    "consultations",
    "prescriptions",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAccountSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# DRF
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# Spectacular (OpenAPI)
SPECTACULAR_SETTINGS = {
    "TITLE": "Sivanethram API",
    "DESCRIPTION": "Siddha Clinic Management System API",
    "VERSION": "1.0.0",
}
```

Create `backend/config/settings/development.py`:
```python
"""Development settings."""
from .base import *  # noqa: F401,F403

import dj_database_url
from decouple import config

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

# Database
DATABASES = {
    "default": dj_database_url.config(
        default=config(
            "DATABASE_URL",
            default="postgres://postgres:postgres@localhost:5432/sivanethram",
        )
    )
}

# CORS
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]
CORS_ALLOW_CREDENTIALS = True
```

Create `backend/config/settings/production.py`:
```python
"""Production settings."""
from .base import *  # noqa: F401,F403

import dj_database_url
from decouple import config

DEBUG = False

ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="").split(",")

DATABASES = {
    "default": dj_database_url.config(default=config("DATABASE_URL"))
}

CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", default="").split(",")
CORS_ALLOW_CREDENTIALS = True

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

Create `backend/config/urls.py`:
```python
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/patients/", include("patients.urls")),
    path("api/v1/consultations/", include("consultations.urls")),
    path("api/v1/prescriptions/", include("prescriptions.urls")),
    # API docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
```

Create `backend/config/wsgi.py`:
```python
"""WSGI config for Sivanethram project."""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
application = get_wsgi_application()
```

Create `backend/config/asgi.py`:
```python
"""ASGI config for Sivanethram project."""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
application = get_asgi_application()
```

**Step 4: Create .env.example**

Create `backend/.env.example`:
```
DJANGO_SECRET_KEY=change-me-in-production
DATABASE_URL=postgres://postgres:postgres@localhost:5432/sivanethram
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

**Step 5: Commit**

```bash
git add backend/
git commit -m "Scaffold Django backend with split settings and DRF config"
```

---

### Task 3: Create Django apps

**Files:**
- Create: `backend/patients/__init__.py`
- Create: `backend/patients/admin.py`
- Create: `backend/patients/apps.py`
- Create: `backend/patients/models.py`
- Create: `backend/patients/serializers.py`
- Create: `backend/patients/urls.py`
- Create: `backend/patients/views.py`
- Create: `backend/patients/migrations/__init__.py`
- Create: same structure for `consultations/` and `prescriptions/`

**Step 1: Create patients app**

`backend/patients/__init__.py`: empty

`backend/patients/apps.py`:
```python
from django.apps import AppConfig


class PatientsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "patients"
```

`backend/patients/models.py`:
```python
# Models will be implemented in Phase 1
```

`backend/patients/admin.py`:
```python
from django.contrib import admin  # noqa: F401

# Admin registrations will be added with models
```

`backend/patients/serializers.py`:
```python
# Serializers will be implemented in Phase 1
```

`backend/patients/views.py`:
```python
# Views will be implemented in Phase 1
```

`backend/patients/urls.py`:
```python
from django.urls import path

app_name = "patients"

urlpatterns = []
```

`backend/patients/migrations/__init__.py`: empty

**Step 2: Create consultations app** (same structure, name="consultations")

**Step 3: Create prescriptions app** (same structure, name="prescriptions")

**Step 4: Verify Django starts**

```bash
cd backend
source venv/bin/activate
python manage.py check
```

Expected: `System check identified no issues`

**Step 5: Commit**

```bash
git add backend/patients/ backend/consultations/ backend/prescriptions/
git commit -m "Add patients, consultations, and prescriptions Django apps"
```

---

### Task 4: Initialize Next.js frontend

**Files:**
- Create: `frontend/` (entire Next.js project)

**Step 1: Create Next.js app with TypeScript and Tailwind**

```bash
cd /path/to/sivanethram
npx create-next-app@14 frontend --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

When prompted:
- Would you like to use Turbopack? **No**

**Step 2: Install additional dependencies**

```bash
cd frontend
npm install axios lucide-react
```

**Step 3: Create .env.example and .env.local**

`frontend/.env.example`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

`frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**Step 4: Commit**

```bash
git add frontend/
git commit -m "Scaffold Next.js 14 frontend with TypeScript and Tailwind"
```

---

### Task 5: Set up API client and base layout

**Files:**
- Create: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/page.tsx`

**Step 1: Create API client**

`frontend/src/lib/api.ts`:
```typescript
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

**Step 2: Update root layout with sidebar placeholder**

`frontend/src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutDashboard, Users, Stethoscope, FileText } from "lucide-react";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sivanethram — Siddha Clinic Management",
  description: "Digital clinic management for Siddha practitioners",
};

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/consultations", label: "Consultations", icon: Stethoscope },
  { href: "/prescriptions", label: "Prescriptions", icon: FileText },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen">
          <aside className="w-64 border-r bg-white p-4">
            <h1 className="mb-8 text-xl font-bold text-emerald-700">
              Sivanethram
            </h1>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 overflow-auto bg-gray-50 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
```

**Step 3: Update home page**

`frontend/src/app/page.tsx`:
```tsx
export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Welcome to Sivanethram — Siddha Clinic Management System
      </p>
    </div>
  );
}
```

**Step 4: Verify frontend starts**

```bash
cd frontend
npm run dev
```

Visit http://localhost:3000 — should see sidebar + dashboard page.

**Step 5: Commit**

```bash
git add frontend/src/
git commit -m "Add API client and base layout with sidebar navigation"
```

---

### Task 6: Verify full stack communication

**Step 1: Create a health check endpoint in Django**

Create `backend/config/views.py`:
```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok", "app": "sivanethram"})
```

Update `backend/config/urls.py` to add:
```python
from config.views import health_check

# Add to urlpatterns:
path("api/health/", health_check, name="health-check"),
```

**Step 2: Create database and run migrations**

```bash
cd backend
source venv/bin/activate
createdb sivanethram  # or via psql
python manage.py migrate
python manage.py createsuperuser
```

**Step 3: Start backend, verify health check**

```bash
python manage.py runserver
```

Visit http://localhost:8000/api/health/ — should return `{"status": "ok", "app": "sivanethram"}`
Visit http://localhost:8000/admin/ — should see Django admin login
Visit http://localhost:8000/api/docs/ — should see Swagger UI

**Step 4: Commit**

```bash
git add backend/config/views.py backend/config/urls.py
git commit -m "Add health check endpoint and verify full stack setup"
```

---

## Verification Checklist

After all tasks complete, verify:

- [ ] `backend/manage.py check` passes
- [ ] `backend/manage.py runserver` starts on :8000
- [ ] Django admin accessible at /admin/
- [ ] API docs accessible at /api/docs/
- [ ] Health check returns OK at /api/health/
- [ ] `frontend npm run dev` starts on :3000
- [ ] Frontend shows sidebar with navigation
- [ ] No console errors in browser
