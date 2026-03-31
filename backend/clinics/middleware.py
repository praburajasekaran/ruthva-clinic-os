from django.core.cache import cache
from django.http import JsonResponse

from .models import Clinic


class TenantMiddleware:
    """Resolves clinic from subdomain or X-Clinic-Slug header. CACHED."""

    EXEMPT_SUBDOMAINS = {"www", "api", "admin", ""}
    RESERVED_SUBDOMAINS = {"www", "api", "admin", "demo", "app"}
    EXEMPT_PATH_PREFIXES = ("/api/health/", "/api/schema/", "/api/docs/", "/api/v1/auth/", "/api/v1/invite/", "/api/v1/integrations/webhooks/")
    CACHE_TTL = 300  # 5 minutes

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Dev mode: allow X-Clinic-Slug header for testing without subdomains
        slug = request.META.get("HTTP_X_CLINIC_SLUG", "")

        if not slug:
            host = request.get_host().split(":")[0]  # strip port
            parts = host.split(".")
            slug = parts[0] if len(parts) >= 3 else ""

        if slug in self.EXEMPT_SUBDOMAINS or request.path.startswith(self.EXEMPT_PATH_PREFIXES):
            request.clinic = None
            return self.get_response(request)

        # Cached subdomain lookup
        cache_key = f"clinic:subdomain:{slug}"
        clinic = cache.get(cache_key)
        if clinic is None:
            try:
                clinic = Clinic.objects.get(subdomain=slug, is_active=True)
                cache.set(cache_key, clinic, self.CACHE_TTL)
            except Clinic.DoesNotExist:
                return JsonResponse({"detail": "Clinic not found."}, status=404)

        request.clinic = clinic
        return self.get_response(request)
