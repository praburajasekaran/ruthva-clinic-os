from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import CustomTokenObtainPairView, check_availability, me, signup

urlpatterns = [
    path("signup/", signup, name="auth-signup"),
    path("check-availability/", check_availability, name="auth-check-availability"),
    path("token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", me, name="auth-me"),
]
