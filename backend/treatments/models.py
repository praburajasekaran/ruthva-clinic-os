from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q


class TreatmentPlan(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_ACTIVE = "active"
    STATUS_COMPLETED = "completed"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_COMPLETED, "Completed"),
    ]

    clinic = models.ForeignKey(
        "clinics.Clinic",
        on_delete=models.CASCADE,
        related_name="treatment_plans",
    )
    prescription = models.ForeignKey(
        "prescriptions.Prescription",
        on_delete=models.CASCADE,
        related_name="treatment_plans",
    )
    total_days = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["clinic", "status"], name="tplan_clinic_status"),
            models.Index(fields=["clinic", "prescription"], name="tplan_clinic_rx"),
        ]

    def __str__(self):
        return f"Plan #{self.pk} for RX {self.prescription_id}"


class TreatmentBlock(models.Model):
    STATUS_PLANNED = "planned"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_CHOICES = [
        (STATUS_PLANNED, "Planned"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_COMPLETED, "Completed"),
    ]

    treatment_plan = models.ForeignKey(
        TreatmentPlan,
        on_delete=models.CASCADE,
        related_name="blocks",
    )
    block_number = models.PositiveSmallIntegerField()
    start_day_number = models.PositiveSmallIntegerField()
    end_day_number = models.PositiveSmallIntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PLANNED)
    replan_required = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["block_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["treatment_plan", "block_number"],
                name="uniq_tblock_plan_number",
            ),
        ]
        indexes = [
            models.Index(fields=["treatment_plan", "status"], name="tblock_plan_status"),
            models.Index(fields=["start_date", "end_date"], name="tblock_date_window"),
        ]

    def __str__(self):
        return f"Block {self.block_number} (Plan {self.treatment_plan_id})"


class TreatmentSession(models.Model):
    MEDIUM_OIL = "oil"
    MEDIUM_POWDER = "powder"
    MEDIUM_OTHER = "other"
    MEDIUM_CHOICES = [
        (MEDIUM_OIL, "Oil"),
        (MEDIUM_POWDER, "Powder"),
        (MEDIUM_OTHER, "Other"),
    ]

    EXECUTION_PLANNED = "planned"
    EXECUTION_DONE = "done"
    EXECUTION_NOT_DONE = "not_done"
    EXECUTION_CHOICES = [
        (EXECUTION_PLANNED, "Planned"),
        (EXECUTION_DONE, "Done"),
        (EXECUTION_NOT_DONE, "Not Done"),
    ]

    treatment_block = models.ForeignKey(
        TreatmentBlock,
        on_delete=models.CASCADE,
        related_name="sessions",
    )
    day_number = models.PositiveSmallIntegerField()
    session_date = models.DateField()
    procedure_name = models.CharField(max_length=255)
    medium_type = models.CharField(max_length=20, choices=MEDIUM_CHOICES, default=MEDIUM_OTHER)
    medium_name = models.CharField(max_length=255, blank=True, default="")
    instructions = models.TextField(blank=True, default="")
    execution_status = models.CharField(
        max_length=20,
        choices=EXECUTION_CHOICES,
        default=EXECUTION_PLANNED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["day_number", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["treatment_block", "day_number"],
                name="uniq_tsession_block_day",
            ),
        ]
        indexes = [
            models.Index(fields=["treatment_block", "execution_status"], name="tsession_block_exec"),
            models.Index(fields=["session_date"], name="tsession_date_idx"),
        ]

    def __str__(self):
        return f"Session D{self.day_number} for block {self.treatment_block_id}"


class SessionFeedback(models.Model):
    STATUS_DONE = "done"
    STATUS_NOT_DONE = "not_done"
    STATUS_CHOICES = [
        (STATUS_DONE, "Done"),
        (STATUS_NOT_DONE, "Not Done"),
    ]

    treatment_session = models.OneToOneField(
        TreatmentSession,
        on_delete=models.CASCADE,
        related_name="feedback",
    )
    therapist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="session_feedbacks",
    )
    completion_status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    response_score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    notes = models.TextField(blank=True, default="")
    review_requested = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["therapist", "-created_at"], name="sfeedback_therapist_created"),
        ]

    def __str__(self):
        return f"Feedback for session {self.treatment_session_id}"


class DoctorActionTask(models.Model):
    TYPE_BLOCK_COMPLETED = "block_completed"
    TYPE_REVIEW_REQUESTED = "review_requested"
    TYPE_CHOICES = [
        (TYPE_BLOCK_COMPLETED, "Block Completed"),
        (TYPE_REVIEW_REQUESTED, "Review Requested"),
    ]

    STATUS_OPEN = "open"
    STATUS_RESOLVED = "resolved"
    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_RESOLVED, "Resolved"),
    ]

    clinic = models.ForeignKey(
        "clinics.Clinic",
        on_delete=models.CASCADE,
        related_name="doctor_action_tasks",
    )
    treatment_plan = models.ForeignKey(
        TreatmentPlan,
        on_delete=models.CASCADE,
        related_name="doctor_tasks",
    )
    treatment_block = models.ForeignKey(
        TreatmentBlock,
        on_delete=models.CASCADE,
        related_name="doctor_tasks",
    )
    assigned_doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_doctor_tasks",
    )
    task_type = models.CharField(max_length=32, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    due_date = models.DateField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["treatment_block", "task_type"],
                condition=Q(status="open"),
                name="uniq_open_doctor_task_per_block_type",
            ),
        ]
        indexes = [
            models.Index(fields=["clinic", "status", "task_type"], name="dtask_clinic_status_type"),
            models.Index(fields=["assigned_doctor", "status"], name="dtask_doctor_status"),
        ]

    def __str__(self):
        return f"{self.task_type} for block {self.treatment_block_id}"
