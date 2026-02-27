from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    ClinicSerializer,
    ClinicSignupSerializer,
    CustomTokenObtainPairSerializer,
    UserSerializer,
)


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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(
        {
            "user": UserSerializer(request.user).data,
            "clinic": ClinicSerializer(request.user.clinic).data
            if request.user.clinic
            else None,
        }
    )
