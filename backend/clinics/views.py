import threading

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema, inline_serializer
from rest_framework import serializers as drf_serializers
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from users.serializers import CustomTokenObtainPairSerializer

from .email import send_invite_email
from .models import ClinicInvitation
from .permissions import IsClinicMember, IsClinicOwner
from .serializers import (
    AcceptInviteSerializer,
    InvitationSerializer,
    InviteMemberSerializer,
    TeamMemberSerializer,
    UpdateMemberRoleSerializer,
)

User = get_user_model()

_detail_response = inline_serializer(
    name="DetailResponse",
    fields={"detail": drf_serializers.CharField()},
)


@extend_schema(
    summary="List team members",
    description="List all members of the current clinic.",
    responses={200: TeamMemberSerializer(many=True)},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsClinicMember])
@throttle_classes([UserRateThrottle])
def team_list(request):
    """List all members of the current clinic."""
    members = User.objects.filter(clinic=request.clinic).order_by(
        "-is_clinic_owner", "first_name", "last_name"
    )
    return Response(TeamMemberSerializer(members, many=True).data)


@extend_schema(
    summary="Invite a team member",
    description="Invite a new member to the clinic by email.",
    request=InviteMemberSerializer,
    responses={201: InvitationSerializer, 400: OpenApiResponse(response=_detail_response)},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsClinicOwner])
@throttle_classes([UserRateThrottle])
def team_invite(request):
    """Invite a new member to the clinic by email."""
    serializer = InviteMemberSerializer(
        data=request.data, context={"clinic": request.clinic}
    )
    serializer.is_valid(raise_exception=True)

    invitation = ClinicInvitation.objects.create(
        clinic=request.clinic,
        email=serializer.validated_data["email"],
        first_name=serializer.validated_data["first_name"],
        last_name=serializer.validated_data.get("last_name", ""),
        role=serializer.validated_data["role"],
        invited_by=request.user,
    )

    threading.Thread(target=send_invite_email, kwargs={"invitation": invitation}, daemon=True).start()

    data = InvitationSerializer(invitation).data
    data["email_sent"] = True

    return Response(data, status=status.HTTP_201_CREATED)


@extend_schema(
    summary="Update member role",
    description="Update a clinic member's role. Owners cannot change their own role.",
    request=UpdateMemberRoleSerializer,
    responses={
        200: TeamMemberSerializer,
        400: OpenApiResponse(response=_detail_response),
        404: OpenApiResponse(response=_detail_response),
    },
)
@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsClinicOwner])
@throttle_classes([UserRateThrottle])
def team_update_role(request, member_id):
    """Update a clinic member's role. Owners cannot change their own role."""
    try:
        member = User.objects.get(id=member_id, clinic=request.clinic)
    except User.DoesNotExist:
        return Response(
            {"detail": "Member not found."}, status=status.HTTP_404_NOT_FOUND
        )

    if member.is_clinic_owner:
        return Response(
            {"detail": "Cannot change the clinic owner's role."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = UpdateMemberRoleSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    member.role = serializer.validated_data["role"]
    member.save(update_fields=["role"])

    return Response(TeamMemberSerializer(member).data)


@extend_schema(
    summary="Remove team member",
    description="Remove a member from the clinic. Owners cannot remove themselves.",
    responses={
        204: OpenApiResponse(description="Member removed successfully"),
        400: OpenApiResponse(response=_detail_response),
        404: OpenApiResponse(response=_detail_response),
    },
)
@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsClinicOwner])
@throttle_classes([UserRateThrottle])
def team_remove(request, member_id):
    """Remove a member from the clinic. Owners cannot remove themselves."""
    try:
        member = User.objects.get(id=member_id, clinic=request.clinic)
    except User.DoesNotExist:
        return Response(
            {"detail": "Member not found."}, status=status.HTTP_404_NOT_FOUND
        )

    if member.is_clinic_owner:
        return Response(
            {"detail": "Cannot remove the clinic owner."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    member.clinic = None
    member.role = ""
    member.is_clinic_owner = False
    member.save(update_fields=["clinic", "role", "is_clinic_owner"])

    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    summary="List pending invitations",
    description="List pending (non-expired) invitations for the current clinic.",
    responses={200: InvitationSerializer(many=True)},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsClinicOwner])
@throttle_classes([UserRateThrottle])
def invitation_list(request):
    """List pending invitations for the current clinic."""
    invitations = ClinicInvitation.objects.filter(
        clinic=request.clinic, accepted_at__isnull=True, expires_at__gt=timezone.now()
    ).select_related("invited_by")
    return Response(InvitationSerializer(invitations, many=True).data)


@extend_schema(
    summary="Cancel invitation",
    description="Cancel a pending invitation.",
    responses={
        204: OpenApiResponse(description="Invitation cancelled"),
        404: OpenApiResponse(response=_detail_response),
    },
)
@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsClinicOwner])
@throttle_classes([UserRateThrottle])
def invitation_cancel(request, invitation_id):
    """Cancel a pending invitation."""
    try:
        invitation = ClinicInvitation.objects.get(
            id=invitation_id, clinic=request.clinic, accepted_at__isnull=True
        )
    except ClinicInvitation.DoesNotExist:
        return Response(
            {"detail": "Invitation not found."}, status=status.HTTP_404_NOT_FOUND
        )
    invitation.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    summary="Get invite details",
    description="Get invite details by token (for the accept page to display info).",
    responses={
        200: inline_serializer(
            name="InviteDetailsResponse",
            fields={
                "email": drf_serializers.EmailField(),
                "first_name": drf_serializers.CharField(),
                "last_name": drf_serializers.CharField(),
                "role": drf_serializers.CharField(),
                "clinic_name": drf_serializers.CharField(),
            },
        ),
        400: OpenApiResponse(response=_detail_response),
        404: OpenApiResponse(response=_detail_response),
        410: OpenApiResponse(response=_detail_response),
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([AnonRateThrottle])
def invite_details(request):
    """Get invite details by token (for the accept page to display info)."""
    token = request.query_params.get("token")
    if not token:
        return Response(
            {"detail": "Token is required."}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        invitation = ClinicInvitation.objects.select_related("clinic").get(
            token=token, accepted_at__isnull=True
        )
    except ClinicInvitation.DoesNotExist:
        return Response(
            {"detail": "Invalid or already used invitation."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if invitation.is_expired:
        return Response(
            {"detail": "This invitation has expired."},
            status=status.HTTP_410_GONE,
        )

    return Response({
        "email": invitation.email,
        "first_name": invitation.first_name,
        "last_name": invitation.last_name,
        "role": invitation.role,
        "clinic_name": invitation.clinic.name,
    })


@extend_schema(
    summary="Accept invitation",
    description="Accept an invitation: create user account and join the clinic.",
    request=AcceptInviteSerializer,
    responses={
        201: inline_serializer(
            name="AcceptInviteResponse",
            fields={
                "user": inline_serializer(
                    name="AcceptInviteUser",
                    fields={
                        "id": drf_serializers.IntegerField(),
                        "username": drf_serializers.CharField(),
                        "email": drf_serializers.EmailField(),
                        "first_name": drf_serializers.CharField(),
                        "last_name": drf_serializers.CharField(),
                        "role": drf_serializers.CharField(),
                        "is_clinic_owner": drf_serializers.BooleanField(),
                    },
                ),
                "clinic_slug": drf_serializers.CharField(),
                "access": drf_serializers.CharField(),
                "refresh": drf_serializers.CharField(),
            },
        ),
        400: OpenApiResponse(response=_detail_response),
        409: OpenApiResponse(response=_detail_response),
    },
)
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AnonRateThrottle])
def accept_invite(request):
    """Accept an invitation: create user account and join the clinic."""
    serializer = AcceptInviteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    with transaction.atomic():
        # Re-fetch with row lock to prevent TOCTOU race on concurrent acceptance
        try:
            invitation = ClinicInvitation.objects.select_for_update().get(
                pk=serializer.invitation.pk, accepted_at__isnull=True
            )
        except ClinicInvitation.DoesNotExist:
            return Response(
                {"detail": "This invitation has already been accepted."},
                status=status.HTTP_409_CONFLICT,
            )

        user = User.objects.create_user(
            username=serializer.validated_data["username"],
            email=invitation.email,
            password=serializer.validated_data["password"],
            first_name=invitation.first_name,
            last_name=invitation.last_name,
            clinic=invitation.clinic,
            role=invitation.role,
            is_clinic_owner=False,
        )
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=["accepted_at"])

    # Generate tokens so the new user is logged in immediately
    token_serializer = CustomTokenObtainPairSerializer()
    token = token_serializer.get_token(user)

    return Response(
        {
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "is_clinic_owner": user.is_clinic_owner,
            },
            "clinic_slug": invitation.clinic.subdomain,
            "access": str(token.access_token),
            "refresh": str(token),
        },
        status=status.HTTP_201_CREATED,
    )
