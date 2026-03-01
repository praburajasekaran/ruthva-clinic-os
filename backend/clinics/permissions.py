from rest_framework.permissions import BasePermission


class IsClinicMember(BasePermission):
    """Ensures the authenticated user belongs to the request's clinic."""

    def has_permission(self, request, view):
        clinic = getattr(request, "clinic", None)
        return (
            clinic is not None
            and request.user.is_authenticated
            and request.user.clinic_id == clinic.id
        )


class IsClinicOwner(BasePermission):
    """Only clinic owners can perform this action."""

    def has_permission(self, request, view):
        clinic = getattr(request, "clinic", None)
        return (
            request.user.is_authenticated
            and clinic is not None
            and request.user.is_clinic_owner
            and request.user.clinic_id == clinic.id
        )


class IsDoctorOrReadOnly(BasePermission):
    """Doctors can write; therapists and admins get read-only access."""

    def has_permission(self, request, view):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return request.user.is_authenticated
        return (
            request.user.is_authenticated
            and request.user.role == "doctor"
        )
