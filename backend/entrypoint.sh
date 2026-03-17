#!/bin/bash
set -e

echo "Running migrations..."
python manage.py migrate || echo "Migration warnings (non-fatal)"

echo "Collecting static files..."
python manage.py collectstatic --noinput || echo "collectstatic warnings (non-fatal)"

echo "Starting gunicorn on port 8000..."
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120 --access-logfile - --error-logfile -
