from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from clinics.models import Clinic

from .serializers import (
    ClinicSerializer,
    ClinicSignupSerializer,
    CustomTokenObtainPairSerializer,
    UserSerializer,
)

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    serializer = ClinicSignupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    result = serializer.save()
    # Generate tokens for the new user
    token_serializer = CustomTokenObtainPairSerializer()
    token = token_serializer.get_token(result["user"])
    return Response(
        {
            "user": UserSerializer(result["user"]).data,
            "clinic": ClinicSerializer(result["clinic"]).data,
            "access": str(token.access_token),
            "refresh": str(token),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def check_availability(request):
    field = request.data.get("field")
    value = request.data.get("value", "").strip()

    if field not in ("username", "email", "subdomain") or not value:
        return Response(
            {"error": "Invalid request"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if field == "subdomain":
        taken = Clinic.objects.filter(subdomain=value).exists()
    else:
        taken = User.objects.filter(**{field: value}).exists()

    return Response({"available": not taken})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    data = UserSerializer(request.user).data
    data["clinic"] = (
        ClinicSerializer(request.user.clinic).data if request.user.clinic else None
    )
    return Response(data)
