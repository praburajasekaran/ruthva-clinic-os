FROM python:3.11-slim-bookworm

# WeasyPrint system dependencies (Cairo, Pango, GDK-Pixbuf)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Install Google Sans font for WeasyPrint PDF rendering
COPY fonts/google-sans/ /usr/share/fonts/truetype/google-sans/
RUN fc-cache -f

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV DJANGO_SETTINGS_MODULE=config.settings.production
ENV PYTHONUNBUFFERED=1

RUN python manage.py collectstatic --noinput 2>/dev/null || true
RUN chmod +x entrypoint.sh

EXPOSE 8000

CMD ["./entrypoint.sh"]
