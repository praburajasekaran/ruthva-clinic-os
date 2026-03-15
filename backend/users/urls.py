from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView,
    check_availability,
    me,
    request_otp,
    signup,
    update_clinic,
    update_me,
    verify_otp,
)

urlpatterns = [
    path("signup/", signup, name="auth-signup"),
    path("check-availability/", check_availability, name="auth-check-availability"),
    path("token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("request-otp/", request_otp, name="auth-request-otp"),
    path("verify-otp/", verify_otp, name="auth-verify-otp"),
    path("me/", me, name="auth-me"),
    path("me/update/", update_me, name="auth-me-update"),
    path("clinic/update/", update_clinic, name="auth-clinic-update"),
]
