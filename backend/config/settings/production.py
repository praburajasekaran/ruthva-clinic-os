"""Production settings."""
from .base import *  # noqa: F401,F403

import dj_database_url
from decouple import config

# Frontend URL for invite links (required in production)
FRONTEND_URL = config("FRONTEND_URL")

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
