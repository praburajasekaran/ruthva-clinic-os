"""Base settings shared across all environments."""
import os
from datetime import timedelta
from pathlib import Path

from corsheaders.defaults import default_headers
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config("DJANGO_SECRET_KEY", default="change-me-in-production")

AUTH_USER_MODEL = "users.User"

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
    "storages",
    # Local apps — users before auth for custom User model
    "users",
    "clinics",
    "patients",
    "consultations",
    "prescriptions",
    "treatments",
    "pharmacy",
    "reminders",
    "integrations",
    "feedback",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "clinics.middleware.TenantMiddleware",
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
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
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

# CORS
CORS_ALLOW_HEADERS = (*default_headers, "x-clinic-slug")

# DRF
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "users.authentication.TenantJWTAuthentication",
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
    "DEFAULT_THROTTLE_RATES": {
        "user": "100/hour",
        "anon": "20/hour",
    },
}

# Spectacular (OpenAPI)
SPECTACULAR_SETTINGS = {
    "TITLE": "AYUSH Clinic Platform API",
    "DESCRIPTION": "Multi-tenant Clinic Management System API",
    "VERSION": "2.0.0",
    "ENUM_NAME_OVERRIDES": {
        "AssessmentEnum": "consultations.models.Consultation.ASSESSMENT_CHOICES",
    },
}

# AWS credentials (shared by SES + S3)
AWS_SES_REGION = config("AWS_SES_REGION", default="ap-south-1")
AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY", default="")

# S3 file storage
AWS_STORAGE_BUCKET_NAME = config("AWS_S3_BUCKET_NAME", default="ruthva-clinic-uploads")
AWS_S3_REGION_NAME = config("AWS_S3_REGION", default="us-east-1")
AWS_S3_FILE_OVERWRITE = False
AWS_S3_CUSTOM_DOMAIN = f"{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com"
DEFAULT_FROM_EMAIL = config(
    "DEFAULT_FROM_EMAIL",
    default="Ruthva <noreply@ruthva.com>",
)
CLINIC_NAME = "Sivanethram Siddha Clinic"
CLINIC_DOCTOR_NAME = config("CLINIC_DOCTOR_NAME", default="Dr. Subashini")
_extra_logo_hosts = [AWS_S3_CUSTOM_DOMAIN] if AWS_STORAGE_BUCKET_NAME else []
CLINIC_LOGO_ALLOWED_HOSTS = _extra_logo_hosts + [
    host.strip().lower()
    for host in config("CLINIC_LOGO_ALLOWED_HOSTS", default="").split(",")
    if host.strip()
]

# GitHub feedback integration
GITHUB_TOKEN = config("GITHUB_TOKEN", default="")
GITHUB_FEEDBACK_REPO = config("GITHUB_FEEDBACK_REPO", default="")

# S3 for feedback screenshots
AWS_S3_BUCKET_NAME = config("AWS_S3_BUCKET_NAME", default="")
AWS_S3_REGION = config("AWS_S3_REGION", default="ap-south-1")

# Cron secret (cron-job.org sends this as Bearer token)
CRON_SECRET = config("CRON_SECRET", default="")

# JWT
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
}
