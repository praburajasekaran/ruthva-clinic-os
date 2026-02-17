"""Development settings."""
from .base import *  # noqa: F401,F403

import dj_database_url
from decouple import config

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", ".localhost"]

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
    "http://localhost:3001",
]
CORS_ALLOW_CREDENTIALS = True

<<<<<<< HEAD
# Frontend URL for invite links
FRONTEND_URL = "http://localhost:3000"
=======
# Allow unauthenticated API access during development (no login page yet)
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
}
>>>>>>> 67c68e3 (feat: Tamil-primary print layout for pre-printed letterhead)
