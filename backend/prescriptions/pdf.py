from __future__ import annotations

import base64
import io
import logging
import ssl
import urllib.request
from typing import TYPE_CHECKING, Any
from urllib.error import URLError
from urllib.parse import urlparse

import segno

from django.template.loader import render_to_string
from weasyprint import HTML
from weasyprint.urls import default_url_fetcher

from clinics.logo_security import is_logo_url_allowed

if TYPE_CHECKING:
    from prescriptions.models import Prescription

logger = logging.getLogger(__name__)

LOGO_FETCH_TIMEOUT = 5  # seconds
LOGO_MAX_BYTES = 2 * 1024 * 1024  # 2 MB
_ALLOWED_LOGO_CONTENT_TYPES = frozenset({
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
})


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Block HTTP redirects during logo fetch to prevent SSRF via open redirects."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError(f"Redirect blocked during logo fetch: {newurl}")


_logo_opener = urllib.request.build_opener(_NoRedirectHandler)


def _fetch_logo_as_data_uri(url: str) -> str:
    """Download an allowed logo URL and return it as a data: URI.

    Returns an empty string if the fetch fails so the PDF still renders
    without a logo instead of breaking.
    """
    try:
        resp = _logo_opener.open(url, timeout=LOGO_FETCH_TIMEOUT)  # noqa: S310
        content_length = resp.headers.get("Content-Length")
        if content_length and int(content_length) > LOGO_MAX_BYTES:
            logger.warning("Logo too large (%s bytes): %s", content_length, url)
            return ""
        data = resp.read(LOGO_MAX_BYTES + 1)
        if len(data) > LOGO_MAX_BYTES:
            logger.warning("Logo body exceeded max bytes: %s", url)
            return ""
        content_type = resp.headers.get("Content-Type", "").split(";")[0].strip().lower()
        if content_type not in _ALLOWED_LOGO_CONTENT_TYPES:
            logger.warning("Unexpected logo content type %r from %s", content_type, url)
            return ""
        encoded = base64.b64encode(data).decode("ascii")
        return f"data:{content_type};base64,{encoded}"
    except (URLError, OSError, ValueError):
        logger.warning("Failed to fetch logo: %s", url)
        return ""


def _safe_url_fetcher(
    url: str,
    timeout: int = 10,
    ssl_context: ssl.SSLContext | None = None,
) -> dict[str, Any]:
    """WeasyPrint url_fetcher that blocks all external network requests.

    Only ``data:`` URIs are allowed so the renderer can never be tricked
    into making server-side requests to internal or attacker-controlled hosts.
    """
    parsed = urlparse(url)
    if parsed.scheme == "data":
        return default_url_fetcher(url, timeout=timeout, ssl_context=ssl_context)
    raise ValueError(f"Blocked non-data URI in PDF render: {url}")


def _generate_qr_data_uri(url: str) -> str:
    """Generate a QR code as a base64 SVG data URI."""
    if not url:
        return ""
    qr = segno.make(url)
    buffer = io.BytesIO()
    qr.save(buffer, kind="svg", scale=3, border=1)
    b64 = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/svg+xml;base64,{b64}"


def generate_prescription_pdf(prescription: Prescription) -> bytes:
    """Render prescription as bilingual PDF (Tamil + English)."""
    clinic = prescription.clinic

    # Pre-fetch the logo at the application layer so WeasyPrint never
    # makes network requests itself.
    clinic_logo_url = ""
    if clinic.logo_url and is_logo_url_allowed(clinic.logo_url):
        clinic_logo_url = _fetch_logo_as_data_uri(clinic.logo_url)

    letterhead_mode = getattr(clinic, "letterhead_mode", "digital")

    context = {
        "prescription": prescription,
        "patient": prescription.consultation.patient,
        "consultation": prescription.consultation,
        "clinic": clinic,
        "clinic_logo_url": clinic_logo_url,
        "letterhead_mode": letterhead_mode,
        "conducted_by": prescription.consultation.conducted_by,
        "medications": prescription.medications.all(),
        "procedures": prescription.procedures.all(),
        "qr_code_data_uri": _generate_qr_data_uri(
            getattr(clinic, "google_review_url", "")
        ),
    }
    html_string = render_to_string("prescriptions/pdf.html", context)
    return HTML(string=html_string).write_pdf(url_fetcher=_safe_url_fetcher)
