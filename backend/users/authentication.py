from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication


class TenantJWTAuthentication(JWTAuthentication):
    """Cross-validates token's clinic_id against subdomain's clinic."""

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None

        user, token = result
        clinic = getattr(request, "clinic", None)

        if clinic and token.get("clinic_id") != clinic.id:
            raise AuthenticationFailed("Token not valid for this clinic.")

        return user, token
