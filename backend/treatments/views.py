from django.db.models import Count, Prefetch
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from clinics.permissions import IsClinicMember, IsDoctorOrReadOnly

from .models import DoctorActionTask, TreatmentPlan, TreatmentSession
from .serializers import (
    DoctorActionTaskResolveSerializer,
    SessionFeedbackSerializer,
    TreatmentBlockCreateSerializer,
    TreatmentPlanCreateSerializer,
    TreatmentPlanDetailSerializer,
    TreatmentPlanListSerializer,
    TreatmentPlanUpdateSerializer,
    TreatmentSessionSerializer,
    TreatmentSessionUpdateSerializer,
    TreatmentSessionWithFeedbackSerializer,
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

    @extend_schema(responses={200: TreatmentPlanListSerializer(many=True)})
    def list(self, request):
        qs = self.get_queryset().annotate(block_count=Count("blocks"))
        plan_status = request.query_params.get("status")
        if plan_status:
            qs = qs.filter(status=plan_status)
        patient_id = request.query_params.get("patient_id")
        if patient_id:
            qs = qs.filter(prescription__consultation__patient_id=patient_id)
        return Response(TreatmentPlanListSerializer(qs, many=True).data)

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

    @extend_schema(request=TreatmentPlanUpdateSerializer, responses={200: TreatmentPlanDetailSerializer})
    def partial_update(self, request, pk=None):
        plan = self.get_object()
        serializer = TreatmentPlanUpdateSerializer(data=request.data, context={"request": request, "plan": plan})
        serializer.is_valid(raise_exception=True)
        plan = serializer.update(plan)
        return Response(TreatmentPlanDetailSerializer(plan).data)

    @action(detail=True, methods=["post"], url_path="blocks")
    def add_block(self, request, pk=None):
        plan = self.get_object()
        if plan.status != TreatmentPlan.STATUS_ACTIVE:
            return Response(
                {"detail": "Can only add blocks to active plans."},
                status=status.HTTP_400_BAD_REQUEST,
            )
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

    @extend_schema(responses={200: TreatmentSessionWithFeedbackSerializer(many=True)})
    def list(self, request):
        qs = self.get_queryset().select_related("feedback")
        block_id = request.query_params.get("block_id")
        if block_id:
            qs = qs.filter(treatment_block_id=block_id)
        else:
            return Response(
                {"detail": "block_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = qs.order_by("day_number", "sequence_number")
        return Response(TreatmentSessionWithFeedbackSerializer(qs, many=True).data)

    @extend_schema(request=TreatmentSessionUpdateSerializer, responses={200: TreatmentSessionSerializer})
    def partial_update(self, request, pk=None):
        if request.user.role not in ("doctor", "admin"):
            raise PermissionDenied("Only doctors can edit sessions.")
        session = self.get_object()
        if session.execution_status != TreatmentSession.EXECUTION_PLANNED:
            return Response(
                {"detail": "Only planned sessions can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = TreatmentSessionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session = serializer.update(session)
        return Response(TreatmentSessionSerializer(session).data)

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


class DoctorActionTaskViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsClinicMember, IsDoctorOrReadOnly]
    queryset = DoctorActionTask.objects.select_related(
        "treatment_plan",
        "treatment_block",
        "assigned_doctor",
    )

    def get_queryset(self):
        clinic = getattr(self.request, "clinic", None)
        if clinic is None:
            return self.queryset.none()
        return self.queryset.filter(clinic=clinic)

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        task = self.get_object()
        if task.status == DoctorActionTask.STATUS_RESOLVED:
            return Response(
                {"detail": "Task is already resolved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = DoctorActionTaskResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task = serializer.resolve(task)
        return Response(
            {
                "id": task.id,
                "status": task.status,
                "notes": task.notes,
                "resolved_at": task.resolved_at,
            }
        )
