from rest_framework.exceptions import PermissionDenied


class TenantQuerySetMixin:
    """Filters querysets by request.clinic. FAIL-CLOSED: returns none() if no clinic."""

    def get_queryset(self):
        qs = super().get_queryset()
        clinic = getattr(self.request, "clinic", None)
        if clinic is None:
            return qs.none()
        return qs.filter(clinic=clinic)

    def perform_create(self, serializer):
        clinic = getattr(self.request, "clinic", None)
        if clinic is None:
            raise PermissionDenied("No clinic context.")
        serializer.save(clinic=clinic)
