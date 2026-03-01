from collections import defaultdict
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework import serializers

from .models import (
    DoctorActionTask,
    SessionFeedback,
    TreatmentBlock,
    TreatmentPlan,
    TreatmentSession,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Read serializers
# ---------------------------------------------------------------------------

class TreatmentSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentSession
        fields = [
            "id",
            "day_number",
            "sequence_number",
            "session_date",
            "procedure_name",
            "medium_type",
            "medium_name",
            "instructions",
            "execution_status",
        ]


class TreatmentBlockSerializer(serializers.ModelSerializer):
    sessions = TreatmentSessionSerializer(many=True, read_only=True)

    class Meta:
        model = TreatmentBlock
        fields = [
            "id",
            "block_number",
            "start_day_number",
            "end_day_number",
            "start_date",
            "end_date",
            "status",
            "replan_required",
            "completed_at",
            "sessions",
        ]


class TreatmentPlanDetailSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="prescription.consultation.patient.name", read_only=True)
    patient_record_id = serializers.CharField(source="prescription.consultation.patient.record_id", read_only=True)
    patient_id = serializers.IntegerField(source="prescription.consultation.patient.id", read_only=True)
    blocks = TreatmentBlockSerializer(many=True, read_only=True)

    class Meta:
        model = TreatmentPlan
        fields = [
            "id",
            "prescription",
            "total_days",
            "status",
            "patient_name",
            "patient_record_id",
            "patient_id",
            "blocks",
            "created_at",
            "updated_at",
        ]


class TreatmentPlanListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="prescription.consultation.patient.name", read_only=True)
    patient_record_id = serializers.CharField(source="prescription.consultation.patient.record_id", read_only=True)
    patient_id = serializers.IntegerField(source="prescription.consultation.patient.id", read_only=True)
    block_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = TreatmentPlan
        fields = [
            "id",
            "prescription",
            "total_days",
            "status",
            "patient_name",
            "patient_record_id",
            "patient_id",
            "block_count",
            "created_at",
        ]


# ---------------------------------------------------------------------------
# Write serializers — block creation
# ---------------------------------------------------------------------------

class SessionPlanEntrySerializer(serializers.Serializer):
    entry_type = serializers.ChoiceField(choices=["single_day", "day_range"])
    day_number = serializers.IntegerField(required=False, min_value=1)
    start_day_number = serializers.IntegerField(required=False, min_value=1)
    end_day_number = serializers.IntegerField(required=False, min_value=1)
    procedure_name = serializers.CharField(max_length=255)
    medium_type = serializers.ChoiceField(choices=TreatmentSession.MEDIUM_CHOICES)
    medium_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    instructions = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        entry_type = attrs["entry_type"]
        if entry_type == "single_day":
            if attrs.get("day_number") is None:
                raise serializers.ValidationError({"day_number": "Required for single_day entry."})
        else:
            start_day = attrs.get("start_day_number")
            end_day = attrs.get("end_day_number")
            if start_day is None or end_day is None:
                raise serializers.ValidationError(
                    {"start_day_number": "Required for day_range entry.", "end_day_number": "Required for day_range entry."}
                )
            if start_day > end_day:
                raise serializers.ValidationError("start_day_number cannot be greater than end_day_number.")
        return attrs


class TreatmentBlockCreateSerializer(serializers.Serializer):
    start_day_number = serializers.IntegerField(min_value=1)
    end_day_number = serializers.IntegerField(min_value=1)
    start_date = serializers.DateField()
    entries = SessionPlanEntrySerializer(many=True)

    def validate_entries(self, value):
        if not value:
            raise serializers.ValidationError("At least one session entry is required.")
        return value

    def validate(self, attrs):
        if attrs["start_day_number"] > attrs["end_day_number"]:
            raise serializers.ValidationError("start_day_number cannot be greater than end_day_number.")

        block_span = attrs["end_day_number"] - attrs["start_day_number"] + 1
        if block_span > 30:
            raise serializers.ValidationError("Block cannot span more than 30 days.")

        for entry in attrs["entries"]:
            if entry["entry_type"] == "single_day":
                expanded = {entry["day_number"]}
            else:
                expanded = set(range(entry["start_day_number"], entry["end_day_number"] + 1))

            if min(expanded) < attrs["start_day_number"] or max(expanded) > attrs["end_day_number"]:
                raise serializers.ValidationError("Entry day numbers must stay within block range.")

        return attrs

    def _expand_entries(self, validated_data):
        """Expand entries into (day_number, payload) tuples, supporting multiple per day."""
        entries = []
        for entry in validated_data["entries"]:
            payload = {
                "procedure_name": entry["procedure_name"],
                "medium_type": entry["medium_type"],
                "medium_name": entry.get("medium_name", ""),
                "instructions": entry.get("instructions", ""),
            }
            if entry["entry_type"] == "single_day":
                entries.append((entry["day_number"], payload))
                continue
            for day_number in range(entry["start_day_number"], entry["end_day_number"] + 1):
                entries.append((day_number, payload))

        return sorted(entries, key=lambda item: item[0])

    def _assign_sequence_numbers(self, expanded_entries):
        """Assign sequence_number per day (1-based), allowing multiple procedures per day."""
        day_counters = defaultdict(int)
        result = []
        for day_number, payload in expanded_entries:
            day_counters[day_number] += 1
            result.append((day_number, day_counters[day_number], payload))
        return result

    def create_block(self, plan):
        expanded_entries = self._expand_entries(self.validated_data)
        sequenced_entries = self._assign_sequence_numbers(expanded_entries)

        block_number = (plan.blocks.aggregate(max_number=Max("block_number"))["max_number"] or 0) + 1
        start_day = self.validated_data["start_day_number"]
        end_day = self.validated_data["end_day_number"]
        start_date = self.validated_data["start_date"]
        if end_day > plan.total_days:
            raise serializers.ValidationError("Block cannot exceed total plan days.")

        with transaction.atomic():
            block = TreatmentBlock.objects.create(
                treatment_plan=plan,
                block_number=block_number,
                start_day_number=start_day,
                end_day_number=end_day,
                start_date=start_date,
                end_date=start_date + timedelta(days=(end_day - start_day)),
                status=TreatmentBlock.STATUS_PLANNED,
            )

            sessions = []
            for day_number, seq, payload in sequenced_entries:
                offset = day_number - start_day
                sessions.append(
                    TreatmentSession(
                        treatment_block=block,
                        day_number=day_number,
                        sequence_number=seq,
                        session_date=start_date + timedelta(days=offset),
                        **payload,
                    )
                )
            TreatmentSession.objects.bulk_create(sessions)

            block_completed_tasks = DoctorActionTask.objects.filter(
                treatment_plan=plan,
                task_type=DoctorActionTask.TYPE_BLOCK_COMPLETED,
                status=DoctorActionTask.STATUS_OPEN,
            )
            block_completed_tasks.update(
                status=DoctorActionTask.STATUS_RESOLVED,
                resolved_at=timezone.now(),
            )

            if plan.status != TreatmentPlan.STATUS_ACTIVE:
                plan.status = TreatmentPlan.STATUS_ACTIVE
                plan.save(update_fields=["status", "updated_at"])

        return block


class TreatmentPlanCreateSerializer(serializers.Serializer):
    prescription = serializers.IntegerField()
    total_days = serializers.IntegerField(min_value=1)
    block = TreatmentBlockCreateSerializer()

    def validate_prescription(self, value):
        clinic = self.context["request"].clinic
        from prescriptions.models import Prescription

        prescription = Prescription.objects.filter(clinic=clinic, pk=value).first()
        if not prescription:
            raise serializers.ValidationError("Prescription not found.")
        # Check no active plan already exists
        if TreatmentPlan.objects.filter(prescription=prescription, status=TreatmentPlan.STATUS_ACTIVE).exists():
            raise serializers.ValidationError("An active treatment plan already exists for this prescription.")
        return prescription

    def validate(self, attrs):
        block = attrs["block"]
        if block["end_day_number"] > attrs["total_days"]:
            raise serializers.ValidationError("Initial block cannot exceed total plan days.")
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        clinic = request.clinic
        prescription = validated_data["prescription"]

        with transaction.atomic():
            plan = TreatmentPlan.objects.create(
                clinic=clinic,
                prescription=prescription,
                total_days=validated_data["total_days"],
                status=TreatmentPlan.STATUS_ACTIVE,
            )
            block_serializer = TreatmentBlockCreateSerializer(data=validated_data["block"], context=self.context)
            block_serializer.is_valid(raise_exception=True)
            block_serializer.create_block(plan)

        return plan


# ---------------------------------------------------------------------------
# Write serializers — plan update
# ---------------------------------------------------------------------------

class TreatmentPlanUpdateSerializer(serializers.Serializer):
    total_days = serializers.IntegerField(min_value=1, required=False)
    status = serializers.ChoiceField(
        choices=[TreatmentPlan.STATUS_CANCELLED],
        required=False,
    )

    def validate_total_days(self, value):
        plan = self.context["plan"]
        max_end_day = plan.blocks.aggregate(m=Max("end_day_number"))["m"] or 0
        if value < max_end_day:
            raise serializers.ValidationError(
                f"total_days ({value}) cannot be less than the highest block end day ({max_end_day})."
            )
        return value

    def validate_status(self, value):
        plan = self.context["plan"]
        if value == TreatmentPlan.STATUS_CANCELLED and plan.status != TreatmentPlan.STATUS_ACTIVE:
            raise serializers.ValidationError("Only active plans can be cancelled.")
        return value

    def update(self, plan):
        data = self.validated_data
        update_fields = ["updated_at"]
        if "total_days" in data:
            plan.total_days = data["total_days"]
            update_fields.append("total_days")
        if "status" in data:
            plan.status = data["status"]
            update_fields.append("status")
        plan.save(update_fields=update_fields)
        return plan


# ---------------------------------------------------------------------------
# Write serializers — session update (doctor edits planned sessions)
# ---------------------------------------------------------------------------

class TreatmentSessionUpdateSerializer(serializers.Serializer):
    procedure_name = serializers.CharField(max_length=255, required=False)
    medium_type = serializers.ChoiceField(choices=TreatmentSession.MEDIUM_CHOICES, required=False)
    medium_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    instructions = serializers.CharField(required=False, allow_blank=True)

    def update(self, session):
        data = self.validated_data
        update_fields = ["updated_at"]
        for field in ("procedure_name", "medium_type", "medium_name", "instructions"):
            if field in data:
                setattr(session, field, data[field])
                update_fields.append(field)
        session.save(update_fields=update_fields)
        return session


# ---------------------------------------------------------------------------
# Write serializers — doctor action task resolve
# ---------------------------------------------------------------------------

class DoctorActionTaskResolveSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def resolve(self, task):
        task.status = DoctorActionTask.STATUS_RESOLVED
        task.resolved_at = timezone.now()
        task.notes = self.validated_data.get("notes", "")
        task.save(update_fields=["status", "resolved_at", "notes", "updated_at"])
        return task


# ---------------------------------------------------------------------------
# Write serializers — session feedback
# ---------------------------------------------------------------------------

class SessionFeedbackSerializer(serializers.Serializer):
    completion_status = serializers.ChoiceField(choices=SessionFeedback.STATUS_CHOICES)
    response_score = serializers.IntegerField(min_value=1, max_value=5)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    review_requested = serializers.BooleanField(default=False)

    def _select_assigned_doctor(self, session):
        plan = session.treatment_block.treatment_plan
        candidate = plan.prescription.consultation.conducted_by
        if candidate and candidate.role == "doctor" and candidate.clinic_id == plan.clinic_id:
            return candidate
        return User.objects.filter(clinic_id=plan.clinic_id, role="doctor").order_by("id").first()

    def create_feedback(self, session, therapist):
        data = self.validated_data
        now = timezone.now()
        block = session.treatment_block
        plan = block.treatment_plan

        # Guard: reject feedback on completed blocks
        if block.status == TreatmentBlock.STATUS_COMPLETED:
            raise serializers.ValidationError("Cannot submit feedback for a completed block.")

        with transaction.atomic():
            feedback, _ = SessionFeedback.objects.update_or_create(
                treatment_session=session,
                defaults={
                    "therapist": therapist,
                    "completion_status": data["completion_status"],
                    "response_score": data["response_score"],
                    "notes": data.get("notes", ""),
                    "review_requested": data.get("review_requested", False),
                },
            )

            session.execution_status = data["completion_status"]
            session.save(update_fields=["execution_status", "updated_at"])

            if block.status == TreatmentBlock.STATUS_PLANNED:
                block.status = TreatmentBlock.STATUS_IN_PROGRESS
                block.save(update_fields=["status", "updated_at"])

            assigned_doctor = self._select_assigned_doctor(session)

            if data.get("review_requested"):
                DoctorActionTask.objects.get_or_create(
                    clinic=plan.clinic,
                    treatment_plan=plan,
                    treatment_block=block,
                    task_type=DoctorActionTask.TYPE_REVIEW_REQUESTED,
                    status=DoctorActionTask.STATUS_OPEN,
                    defaults={
                        "assigned_doctor": assigned_doctor,
                        "due_date": timezone.localdate(),
                    },
                )

            pending_exists = block.sessions.filter(execution_status=TreatmentSession.EXECUTION_PLANNED).exists()
            if not pending_exists:
                block.status = TreatmentBlock.STATUS_COMPLETED
                block.replan_required = True
                block.completed_at = now
                block.save(update_fields=["status", "replan_required", "completed_at", "updated_at"])

                # Auto-complete plan if final block covers total_days
                if block.end_day_number >= plan.total_days:
                    plan.status = TreatmentPlan.STATUS_COMPLETED
                    plan.save(update_fields=["status", "updated_at"])

                    DoctorActionTask.objects.get_or_create(
                        clinic=plan.clinic,
                        treatment_plan=plan,
                        treatment_block=block,
                        task_type=DoctorActionTask.TYPE_PLAN_COMPLETED,
                        status=DoctorActionTask.STATUS_OPEN,
                        defaults={
                            "assigned_doctor": assigned_doctor,
                            "due_date": timezone.localdate(),
                        },
                    )
                else:
                    DoctorActionTask.objects.get_or_create(
                        clinic=plan.clinic,
                        treatment_plan=plan,
                        treatment_block=block,
                        task_type=DoctorActionTask.TYPE_BLOCK_COMPLETED,
                        status=DoctorActionTask.STATUS_OPEN,
                        defaults={
                            "assigned_doctor": assigned_doctor,
                            "due_date": timezone.localdate(),
                        },
                    )

        return feedback
