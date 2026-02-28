from datetime import timedelta

from django.db.models import Count, Q
from django.http import HttpResponse
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from rest_framework.response import Response

from clinics.export_service import DataExportService
from clinics.models import DataExportAudit
from clinics.permissions import IsClinicOwner
from consultations.models import Consultation
from patients.models import Patient
from prescriptions.models import ProcedureEntry, Prescription
from treatments.models import DoctorActionTask, TreatmentSession


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok", "app": "ayush-clinic-platform"})


@api_view(["GET"])
def dashboard_stats(request):
    clinic = getattr(request, "clinic", None)
    if not clinic:
        return Response({"detail": "No clinic context."}, status=403)

    today = timezone.now().date()
    week_start = today - timedelta(days=today.weekday())

    # Consolidated aggregation
    consult_stats = (
        Consultation.objects.filter(clinic=clinic)
        .aggregate(
            today_patients=Count(
                "patient", filter=Q(consultation_date=today), distinct=True
            ),
            week_patients=Count(
                "patient", filter=Q(consultation_date__gte=week_start), distinct=True
            ),
            pending_prescriptions=Count(
                "id", filter=Q(consultation_date=today, prescription__isnull=True)
            ),
        )
    )

    follow_ups = (
        Prescription.objects.filter(clinic=clinic, follow_up_date__lte=today).count()
        + ProcedureEntry.objects.filter(
            prescription__clinic=clinic, follow_up_date__lte=today
        ).count()
        + TreatmentSession.objects.filter(
            treatment_block__treatment_plan__clinic=clinic,
            execution_status=TreatmentSession.EXECUTION_PLANNED,
            session_date__lte=today,
        ).count()
        + DoctorActionTask.objects.filter(
            clinic=clinic,
            status=DoctorActionTask.STATUS_OPEN,
        ).count()
    )

    return Response({
        **consult_stats,
        "follow_ups_due": follow_ups,
        "total_patients": Patient.objects.filter(clinic=clinic).count(),
    })


@api_view(["GET"])
def follow_ups_list(request):
    clinic = getattr(request, "clinic", None)
    if not clinic:
        return Response({"detail": "No clinic context."}, status=403)

    today = timezone.now().date()
    date_from = today - timedelta(days=30)
    date_to = today + timedelta(days=90)

    tab = request.query_params.get("tab", "all")
    if tab not in {"all", "therapist", "doctor"}:
        return Response({"detail": "Invalid tab. Use therapist|doctor|all."}, status=400)

    doctor_status = request.query_params.get("status", DoctorActionTask.STATUS_OPEN)
    if doctor_status not in {DoctorActionTask.STATUS_OPEN, DoctorActionTask.STATUS_RESOLVED}:
        return Response({"detail": "Invalid status. Use open|resolved."}, status=400)

    include_legacy = tab in {"all", "therapist"}
    include_therapist = tab in {"all", "therapist"}
    include_doctor = tab in {"all", "doctor"}
    role = getattr(request.user, "role", "")

    if role == "therapist":
        include_doctor = False
    elif role == "doctor":
        include_legacy = False
        include_therapist = False
    elif role != "admin":
        return Response({"detail": "Unsupported role for follow-ups."}, status=403)

    rx_follow_ups = (
        Prescription.objects.filter(
            clinic=clinic,
            follow_up_date__gte=date_from,
            follow_up_date__lte=date_to,
        )
        .select_related("consultation__patient")
        .order_by("follow_up_date")
    )

    proc_follow_ups = (
        ProcedureEntry.objects.filter(
            prescription__clinic=clinic,
            follow_up_date__gte=date_from,
            follow_up_date__lte=date_to,
        )
        .select_related("prescription__consultation__patient")
        .order_by("follow_up_date")
    )

    therapist_sessions = (
        TreatmentSession.objects.filter(
            treatment_block__treatment_plan__clinic=clinic,
            session_date__gte=date_from,
            session_date__lte=date_to,
            execution_status=TreatmentSession.EXECUTION_PLANNED,
        )
        .select_related("treatment_block__treatment_plan__prescription__consultation__patient")
        .prefetch_related("treatment_block__sessions")
        .order_by("session_date", "day_number")
    )

    doctor_tasks = (
        DoctorActionTask.objects.filter(
            clinic=clinic,
            status=doctor_status,
        )
        .select_related("treatment_plan__prescription__consultation__patient", "treatment_block")
        .prefetch_related("treatment_block__sessions")
        .order_by("due_date", "-created_at")
    )

    results = []
    if include_legacy:
        for rx in rx_follow_ups:
            results.append({
                "queue_type": "legacy",
                "legacy_type": "prescription",
                "follow_up_date": rx.follow_up_date,
                "patient_name": rx.consultation.patient.name,
                "patient_record_id": rx.consultation.patient.record_id,
                "patient_id": rx.consultation.patient.id,
                "notes": rx.follow_up_notes,
            })
        for proc in proc_follow_ups:
            results.append({
                "queue_type": "legacy",
                "legacy_type": "procedure",
                "follow_up_date": proc.follow_up_date,
                "patient_name": proc.prescription.consultation.patient.name,
                "patient_record_id": proc.prescription.consultation.patient.record_id,
                "patient_id": proc.prescription.consultation.patient.id,
                "notes": proc.name,
            })

    if include_therapist:
        for session in therapist_sessions:
            patient = session.treatment_block.treatment_plan.prescription.consultation.patient
            completed_days = session.treatment_block.sessions.exclude(
                execution_status=TreatmentSession.EXECUTION_PLANNED
            ).count()
            pending_days = session.treatment_block.sessions.filter(
                execution_status=TreatmentSession.EXECUTION_PLANNED
            ).count()
            results.append({
                "queue_type": "therapist",
                "follow_up_date": session.session_date,
                "patient_name": patient.name,
                "patient_record_id": patient.record_id,
                "patient_id": patient.id,
                "treatment_session_id": session.id,
                "treatment_plan_id": session.treatment_block.treatment_plan_id,
                "treatment_block_id": session.treatment_block_id,
                "day_number": session.day_number,
                "block_number": session.treatment_block.block_number,
                "block_start_day": session.treatment_block.start_day_number,
                "block_end_day": session.treatment_block.end_day_number,
                "completed_days": completed_days,
                "pending_days": pending_days,
                "procedure_name": session.procedure_name,
                "medium_type": session.medium_type,
                "medium_name": session.medium_name,
                "instructions": session.instructions,
            })

    if include_doctor:
        for task in doctor_tasks:
            patient = task.treatment_plan.prescription.consultation.patient
            completed_days = task.treatment_block.sessions.exclude(
                execution_status=TreatmentSession.EXECUTION_PLANNED
            ).count()
            pending_days = task.treatment_block.sessions.filter(
                execution_status=TreatmentSession.EXECUTION_PLANNED
            ).count()
            results.append({
                "queue_type": "doctor",
                "follow_up_date": task.due_date,
                "patient_name": patient.name,
                "patient_record_id": patient.record_id,
                "patient_id": patient.id,
                "doctor_action_task_id": task.id,
                "treatment_plan_id": task.treatment_plan_id,
                "treatment_block_id": task.treatment_block_id,
                "block_number": task.treatment_block.block_number,
                "block_start_day": task.treatment_block.start_day_number,
                "block_end_day": task.treatment_block.end_day_number,
                "completed_days": completed_days,
                "pending_days": pending_days,
                "task_type": task.task_type,
                "task_status": task.status,
                "replan_required": task.treatment_block.replan_required,
            })

    results.sort(
        key=lambda item: (
            item.get("follow_up_date") is None,
            item.get("follow_up_date"),
            item.get("patient_name", ""),
        )
    )
    return Response(
        {
            "items": results,
            "meta": {
                "tab": tab,
                "status": doctor_status,
                "counts": {
                    "legacy": len([item for item in results if item["queue_type"] == "legacy"]),
                    "therapist": len([item for item in results if item["queue_type"] == "therapist"]),
                    "doctor": len([item for item in results if item["queue_type"] == "doctor"]),
                    "total": len(results),
                },
            },
        }
    )


def _record_export_audit(*, request, endpoint, row_count):
    clinic = getattr(request, "clinic", None)
    if clinic is None:
        return
    DataExportAudit.objects.create(
        clinic=clinic,
        actor=request.user,
        endpoint=endpoint,
        row_count=row_count,
    )


@extend_schema(responses={200: {"type": "string", "format": "binary"}})
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsClinicOwner])
@throttle_classes([UserRateThrottle])
def export_patients_csv(request):
    clinic = getattr(request, "clinic", None)
    if clinic is None:
        return Response({"detail": "No clinic context."}, status=403)
    content, row_count = DataExportService.export_patients_csv(clinic)
    _record_export_audit(
        request=request,
        endpoint="/api/v1/export/patients/",
        row_count=row_count,
    )
    response = HttpResponse(content, content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="patients.csv"'
    return response


@extend_schema(responses={200: {"type": "string", "format": "binary"}})
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsClinicOwner])
@throttle_classes([UserRateThrottle])
def export_consultations_csv(request):
    clinic = getattr(request, "clinic", None)
    if clinic is None:
        return Response({"detail": "No clinic context."}, status=403)
    content, row_count = DataExportService.export_consultations_csv(clinic)
    _record_export_audit(
        request=request,
        endpoint="/api/v1/export/consultations/",
        row_count=row_count,
    )
    response = HttpResponse(content, content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="consultations.csv"'
    return response


@extend_schema(responses={200: {"type": "string", "format": "binary"}})
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsClinicOwner])
@throttle_classes([UserRateThrottle])
def export_prescriptions_csv(request):
    clinic = getattr(request, "clinic", None)
    if clinic is None:
        return Response({"detail": "No clinic context."}, status=403)
    content, row_count = DataExportService.export_prescriptions_csv(clinic)
    _record_export_audit(
        request=request,
        endpoint="/api/v1/export/prescriptions/",
        row_count=row_count,
    )
    response = HttpResponse(content, content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="prescriptions.csv"'
    return response


@extend_schema(responses={200: {"type": "string", "format": "binary"}})
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsClinicOwner])
@throttle_classes([UserRateThrottle])
def export_all_zip(request):
    clinic = getattr(request, "clinic", None)
    if clinic is None:
        return Response({"detail": "No clinic context."}, status=403)
    content, counts = DataExportService.export_all_zip(clinic)
    _record_export_audit(
        request=request,
        endpoint="/api/v1/export/all/",
        row_count=counts["total"],
    )
    response = HttpResponse(content, content_type="application/zip")
    response["Content-Disposition"] = 'attachment; filename="clinic-export.zip"'
    return response
