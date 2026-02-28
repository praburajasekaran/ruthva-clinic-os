from urllib.parse import urlparse

from django.conf import settings


def _normalized_allowed_hosts():
    raw = getattr(settings, "CLINIC_LOGO_ALLOWED_HOSTS", [])
    if isinstance(raw, str):
        raw = [raw]
    hosts = []
    for item in raw:
        if not item:
            continue
        normalized = item.strip().lower()
        if normalized:
            hosts.append(normalized)
    return hosts


def is_logo_url_allowed(url: str) -> bool:
    if not url:
        return True

    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        return False

    hostname = parsed.hostname.lower()
    for allowed in _normalized_allowed_hosts():
        if hostname == allowed:
            return True
        if hostname.endswith(f".{allowed}"):
            return True
    return False
