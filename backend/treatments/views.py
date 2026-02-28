from django.db.models import Prefetch
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from clinics.permissions import IsClinicMember, IsDoctorOrReadOnly

from .models import TreatmentPlan, TreatmentSession
from .serializers import (
    SessionFeedbackSerializer,
    TreatmentBlockCreateSerializer,
    TreatmentPlanCreateSerializer,
    TreatmentPlanDetailSerializer,
)


class TreatmentPlanViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsClinicMember, IsDoctorOrReadOnly]
    queryset = TreatmentPlan.objects.select_related(
        "clinic",
        "prescription__consultation__patient",
    ).prefetch_related(
        Prefetch("blocks__sessions"),
    )

    def get_queryset(self):
        clinic = getattr(self.request, "clinic", None)
        if clinic is None:
            return self.queryset.none()
        return self.queryset.filter(clinic=clinic)

    @extend_schema(request=TreatmentPlanCreateSerializer, responses={201: TreatmentPlanDetailSerializer})
    def create(self, request):
        serializer = TreatmentPlanCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        plan = serializer.save()
        output = TreatmentPlanDetailSerializer(plan)
        return Response(output.data, status=status.HTTP_201_CREATED)

    @extend_schema(responses={200: TreatmentPlanDetailSerializer})
    def retrieve(self, request, pk=None):
        plan = self.get_object()
        return Response(TreatmentPlanDetailSerializer(plan).data)

    @action(detail=True, methods=["post"], url_path="blocks")
    def add_block(self, request, pk=None):
        plan = self.get_object()
        serializer = TreatmentBlockCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.create_block(plan)

        refreshed = self.get_queryset().get(pk=plan.pk)
        return Response(TreatmentPlanDetailSerializer(refreshed).data, status=status.HTTP_201_CREATED)


class TreatmentSessionViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsClinicMember]
    queryset = TreatmentSession.objects.select_related(
        "treatment_block__treatment_plan__prescription__consultation__patient",
    )

    def get_queryset(self):
        clinic = getattr(self.request, "clinic", None)
        if clinic is None:
            return self.queryset.none()
        return self.queryset.filter(treatment_block__treatment_plan__clinic=clinic)

    @action(detail=True, methods=["post"], url_path="feedback")
    def feedback(self, request, pk=None):
        if request.user.role != "therapist":
            raise PermissionDenied("Only therapists can submit session feedback.")

        session = self.get_object()
        serializer = SessionFeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        feedback = serializer.create_feedback(session, request.user)

        return Response(
            {
                "id": feedback.id,
                "treatment_session": session.id,
                "completion_status": feedback.completion_status,
                "response_score": feedback.response_score,
                "notes": feedback.notes,
                "review_requested": feedback.review_requested,
                "created_at": feedback.created_at,
            },
            status=status.HTTP_201_CREATED,
        )
