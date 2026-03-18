"""Production settings."""
from .base import *  # noqa: F401,F403

import dj_database_url
from decouple import config

# Frontend URL for invite links (required in production)
FRONTEND_URL = config("FRONTEND_URL")

DEBUG = config("DEBUG", default="False", cast=bool)

ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="").split(",")

DATABASES = {
    "default": dj_database_url.config(default=config("DATABASE_URL"))
}

CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", default="").split(",")
CORS_ALLOW_CREDENTIALS = True

# Railway terminates SSL at the proxy — trust the forwarded header
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = False  # Railway proxy handles HTTPS; internal healthchecks use HTTP
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Storage backends
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}
