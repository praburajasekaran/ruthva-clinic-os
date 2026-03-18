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
from .models import Clinic, ClinicInvitation
from .permissions import IsClinicMember, IsClinicOwner
from .plan_limits import get_role_limit
from .serializers import (
    AcceptInviteSerializer,
    InvitationSerializer,
    InviteMemberSerializer,
    TeamMemberSerializer,
    UpdateMemberRoleSerializer,
)

User = get_user_model()


def _check_role_slot_available(clinic, role):
    """Check if a role slot is available on the clinic's plan.

    Counts active members + pending (non-expired) invitations for the role.
    Returns (is_available, used_count, limit).
    """
    limit = get_role_limit(clinic.plan, role)
    member_count = User.objects.filter(clinic=clinic, role=role).count()
    pending_invite_count = ClinicInvitation.objects.filter(
        clinic=clinic, role=role, accepted_at__isnull=True, expires_at__gt=timezone.now()
    ).count()
    used = member_count + pending_invite_count
    return used < limit, used, limit


_detail_response = inline_serializer(
    name="DetailResponse",
    fields={"detail": drf_serializers.CharField()},
)


@extend_schema(
    summary="Get team plan limits",
    description="Get per-role slot usage and availability for the current clinic's plan.",
    responses={
        200: inline_serializer(
            name="TeamLimitsResponse",
            fields={
                "plan": drf_serializers.CharField(),
                "slots": drf_serializers.DictField(),
                "all_slots_full": drf_serializers.BooleanField(),
            },
        )
    },
)
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsClinicMember])
@throttle_classes([UserRateThrottle])
def team_limits(request):
    """Get per-role slot usage and availability for the current clinic's plan."""
    clinic = request.clinic
    roles = ["doctor", "therapist", "admin"]
    slots = {}
    all_full = True

    for role in roles:
        available, used, limit = _check_role_slot_available(clinic, role)
        slots[role] = {"used": used, "limit": limit, "available": available}
        if available:
            all_full = False

    return Response({
        "plan": clinic.plan,
        "slots": slots,
        "all_slots_full": all_full,
    })


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

    role = serializer.validated_data["role"]

    with transaction.atomic():
        clinic = Clinic.objects.select_for_update().get(pk=request.clinic.pk)
        available, used, limit = _check_role_slot_available(clinic, role)
        if not available:
            return Response(
                {"detail": f"Free plan: {role} slot is full ({used}/{limit}). Upgrade to add more."},
                status=status.HTTP_403_FORBIDDEN,
            )

        invitation = ClinicInvitation.objects.create(
            clinic=clinic,
            email=serializer.validated_data["email"],
            first_name=serializer.validated_data["first_name"],
            last_name=serializer.validated_data.get("last_name", ""),
            role=role,
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

    new_role = serializer.validated_data["role"]
    if new_role != member.role:
        available, used, limit = _check_role_slot_available(request.clinic, new_role)
        if not available:
            return Response(
                {"detail": f"Free plan: {new_role} slot is full ({used}/{limit}). Upgrade to add more."},
                status=status.HTTP_403_FORBIDDEN,
            )

    member.role = new_role
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
        "logo_url": invitation.clinic.logo_url,
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

        # Check role slot is still available (may have filled since invite was sent)
        available, used, limit = _check_role_slot_available(invitation.clinic, invitation.role)
        # Subtract 1 from used since this pending invitation is counted but is about to be accepted
        actual_members = used - 1
        if actual_members >= limit:
            return Response(
                {
                    "detail": (
                        f"This clinic's {invitation.role} slot has been filled since your "
                        "invitation was sent. Please contact the clinic owner."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
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
