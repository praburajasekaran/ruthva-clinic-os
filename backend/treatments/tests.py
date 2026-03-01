from datetime import date

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from clinics.models import Clinic
from consultations.models import Consultation
from patients.models import Patient
from prescriptions.models import Prescription
from treatments.models import DoctorActionTask, TreatmentBlock, TreatmentPlan, TreatmentSession

User = get_user_model()


class TreatmentWorkflowAPITest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.clinic = Clinic.objects.create(
            name="Treatment Clinic",
            subdomain="treatment-clinic",
            discipline="siddha",
        )
        self.other_clinic = Clinic.objects.create(
            name="Other Clinic",
            subdomain="other-treatment-clinic",
            discipline="siddha",
        )

        self.doctor = User.objects.create_user(
            username="doctor",
            password="testpass123",
            clinic=self.clinic,
            role="doctor",
            is_clinic_owner=True,
        )
        self.therapist = User.objects.create_user(
            username="therapist",
            password="testpass123",
            clinic=self.clinic,
            role="therapist",
        )
        self.other_doctor = User.objects.create_user(
            username="otherdoc",
            password="testpass123",
            clinic=self.other_clinic,
            role="doctor",
        )

        self.patient = Patient.objects.create(
            clinic=self.clinic,
            name="Followup Patient",
            age=42,
            gender="female",
            phone="9000000001",
        )
        self.consultation = Consultation.objects.create(
            clinic=self.clinic,
            patient=self.patient,
            conducted_by=self.doctor,
            consultation_date=date(2026, 2, 28),
        )
        self.prescription = Prescription.objects.create(
            clinic=self.clinic,
            consultation=self.consultation,
            follow_up_date=date(2026, 3, 5),
            follow_up_notes="Review response",
        )

    def _auth(self, user, clinic=None):
        self.client.force_authenticate(user=user)
        self.client.credentials(
            HTTP_X_CLINIC_SLUG=(clinic or self.clinic).subdomain,
            HTTP_HOST="localhost",
        )

    def _create_plan(self):
        self._auth(self.doctor)
        payload = {
            "prescription": self.prescription.id,
            "total_days": 10,
            "block": {
                "start_day_number": 1,
                "end_day_number": 3,
                "start_date": "2026-03-01",
                "entries": [
                    {
                        "entry_type": "day_range",
                        "start_day_number": 1,
                        "end_day_number": 2,
                        "procedure_name": "Thokkanam",
                        "medium_type": "oil",
                        "medium_name": "Vatha Thailam",
                        "instructions": "Apply gently",
                    },
                    {
                        "entry_type": "single_day",
                        "day_number": 3,
                        "procedure_name": "Podi Kizhi",
                        "medium_type": "powder",
                        "medium_name": "Herbal mix",
                        "instructions": "Warm compress",
                    },
                ],
            },
        }
        response = self.client.post("/api/v1/treatments/plans/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return TreatmentPlan.objects.get(pk=response.data["id"])

    def test_doctor_can_create_treatment_plan_with_hybrid_entries(self):
        plan = self._create_plan()
        self.assertEqual(plan.blocks.count(), 1)
        block = plan.blocks.get(block_number=1)
        self.assertEqual(block.start_day_number, 1)
        self.assertEqual(block.end_day_number, 3)
        self.assertEqual(block.sessions.count(), 3)

    def test_non_doctor_cannot_create_plan(self):
        self._auth(self.therapist)
        response = self.client.post(
            "/api/v1/treatments/plans/",
            {
                "prescription": self.prescription.id,
                "total_days": 7,
                "block": {
                    "start_day_number": 1,
                    "end_day_number": 1,
                    "start_date": "2026-03-01",
                    "entries": [
                        {
                            "entry_type": "single_day",
                            "day_number": 1,
                            "procedure_name": "Thokkanam",
                            "medium_type": "oil",
                        }
                    ],
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_therapist_feedback_creates_review_task(self):
        plan = self._create_plan()
        session = plan.blocks.first().sessions.order_by("day_number").first()

        self._auth(self.therapist)
        response = self.client.post(
            f"/api/v1/treatments/sessions/{session.id}/feedback/",
            {
                "completion_status": "done",
                "response_score": 4,
                "notes": "Patient improved",
                "review_requested": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        session.refresh_from_db()
        self.assertEqual(session.execution_status, TreatmentSession.EXECUTION_DONE)
        self.assertTrue(
            DoctorActionTask.objects.filter(
                treatment_block=session.treatment_block,
                task_type=DoctorActionTask.TYPE_REVIEW_REQUESTED,
                status=DoctorActionTask.STATUS_OPEN,
            ).exists()
        )

    def test_final_session_feedback_completes_block_and_opens_block_completed_task_once(self):
        plan = self._create_plan()
        sessions = list(plan.blocks.first().sessions.order_by("day_number"))

        self._auth(self.therapist)
        for session in sessions:
            response = self.client.post(
                f"/api/v1/treatments/sessions/{session.id}/feedback/",
                {
                    "completion_status": "done",
                    "response_score": 5,
                    "notes": "Completed",
                    "review_requested": False,
                },
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        block = plan.blocks.first()
        block.refresh_from_db()
        self.assertEqual(block.status, TreatmentBlock.STATUS_COMPLETED)
        self.assertTrue(block.replan_required)
        self.assertEqual(
            DoctorActionTask.objects.filter(
                treatment_block=block,
                task_type=DoctorActionTask.TYPE_BLOCK_COMPLETED,
                status=DoctorActionTask.STATUS_OPEN,
            ).count(),
            1,
        )

    def test_adding_next_block_resolves_open_block_completed_task(self):
        plan = self._create_plan()
        sessions = list(plan.blocks.first().sessions.order_by("day_number"))

        self._auth(self.therapist)
        for session in sessions:
            self.client.post(
                f"/api/v1/treatments/sessions/{session.id}/feedback/",
                {
                    "completion_status": "done",
                    "response_score": 5,
                    "notes": "Completed",
                    "review_requested": False,
                },
                format="json",
            )

        self._auth(self.doctor)
        response = self.client.post(
            f"/api/v1/treatments/plans/{plan.id}/blocks/",
            {
                "start_day_number": 4,
                "end_day_number": 6,
                "start_date": "2026-03-04",
                "entries": [
                    {
                        "entry_type": "day_range",
                        "start_day_number": 4,
                        "end_day_number": 6,
                        "procedure_name": "Steam",
                        "medium_type": "other",
                        "medium_name": "Herbal steam",
                        "instructions": "15 mins",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertFalse(
            DoctorActionTask.objects.filter(
                treatment_plan=plan,
                task_type=DoctorActionTask.TYPE_BLOCK_COMPLETED,
                status=DoctorActionTask.STATUS_OPEN,
            ).exists()
        )
        self.assertTrue(
            DoctorActionTask.objects.filter(
                treatment_plan=plan,
                task_type=DoctorActionTask.TYPE_BLOCK_COMPLETED,
                status=DoctorActionTask.STATUS_RESOLVED,
            ).exists()
        )

    def test_followups_endpoint_returns_role_tabs_and_respects_status_filter(self):
        plan = self._create_plan()
        first_session = plan.blocks.first().sessions.order_by("day_number").first()

        self._auth(self.therapist)
        self.client.post(
            f"/api/v1/treatments/sessions/{first_session.id}/feedback/",
            {
                "completion_status": "done",
                "response_score": 4,
                "notes": "Needs review",
                "review_requested": True,
            },
            format="json",
        )

        self._auth(self.doctor)
        doctor_response = self.client.get("/api/v1/dashboard/follow-ups/?tab=doctor&status=open")
        self.assertEqual(doctor_response.status_code, status.HTTP_200_OK)
        self.assertEqual(doctor_response.data["meta"]["tab"], "doctor")
        self.assertGreaterEqual(doctor_response.data["meta"]["counts"]["doctor"], 1)
        self.assertTrue(all(item["queue_type"] == "doctor" for item in doctor_response.data["items"]))

        self._auth(self.therapist)
        therapist_response = self.client.get("/api/v1/dashboard/follow-ups/?tab=therapist")
        self.assertEqual(therapist_response.status_code, status.HTTP_200_OK)
        queue_types = {item["queue_type"] for item in therapist_response.data["items"]}
        self.assertIn("therapist", queue_types)

    def test_therapist_cannot_fetch_doctor_queue_items(self):
        plan = self._create_plan()
        first_session = plan.blocks.first().sessions.order_by("day_number").first()

        self._auth(self.therapist)
        self.client.post(
            f"/api/v1/treatments/sessions/{first_session.id}/feedback/",
            {
                "completion_status": "done",
                "response_score": 4,
                "notes": "Needs review",
                "review_requested": True,
            },
            format="json",
        )

        response = self.client.get("/api/v1/dashboard/follow-ups/?tab=doctor&status=open")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["meta"]["counts"]["doctor"], 0)
        self.assertTrue(all(item["queue_type"] != "doctor" for item in response.data["items"]))

    def test_cross_tenant_session_feedback_denied(self):
        plan = self._create_plan()
        session = plan.blocks.first().sessions.first()

        self._auth(self.other_doctor, clinic=self.other_clinic)
        response = self.client.post(
            f"/api/v1/treatments/sessions/{session.id}/feedback/",
            {
                "completion_status": "done",
                "response_score": 3,
                "notes": "x",
                "review_requested": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Phase G: Hardening tests ---

    def test_multiple_sessions_per_day_with_sequence_numbers(self):
        """G3: Multiple entries on the same day get distinct sequence_numbers."""
        self._auth(self.doctor)
        payload = {
            "prescription": self.prescription.id,
            "total_days": 5,
            "block": {
                "start_day_number": 1,
                "end_day_number": 3,
                "start_date": "2026-03-01",
                "entries": [
                    {
                        "entry_type": "day_range",
                        "start_day_number": 1,
                        "end_day_number": 3,
                        "procedure_name": "Abhyanga",
                        "medium_type": "oil",
                        "medium_name": "Sesame",
                    },
                    {
                        "entry_type": "day_range",
                        "start_day_number": 1,
                        "end_day_number": 3,
                        "procedure_name": "Swedana",
                        "medium_type": "other",
                        "medium_name": "Steam",
                    },
                    {
                        "entry_type": "single_day",
                        "day_number": 2,
                        "procedure_name": "Vasti",
                        "medium_type": "oil",
                        "medium_name": "Ksheerabala",
                    },
                ],
            },
        }
        response = self.client.post("/api/v1/treatments/plans/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        plan = TreatmentPlan.objects.get(pk=response.data["id"])
        block = plan.blocks.first()
        # 3 days x 2 range entries = 6, plus 1 single_day on day 2 = 7
        self.assertEqual(block.sessions.count(), 7)

        day2_sessions = list(block.sessions.filter(day_number=2).order_by("sequence_number"))
        self.assertEqual(len(day2_sessions), 3)
        self.assertEqual(day2_sessions[0].procedure_name, "Abhyanga")
        self.assertEqual(day2_sessions[0].sequence_number, 1)
        self.assertEqual(day2_sessions[1].procedure_name, "Swedana")
        self.assertEqual(day2_sessions[1].sequence_number, 2)
        self.assertEqual(day2_sessions[2].procedure_name, "Vasti")
        self.assertEqual(day2_sessions[2].sequence_number, 3)

    def test_feedback_rejection_on_completed_block(self):
        """G3: Cannot submit feedback for sessions in a completed block."""
        plan = self._create_plan()
        sessions = list(plan.blocks.first().sessions.order_by("day_number"))

        self._auth(self.therapist)
        for session in sessions:
            self.client.post(
                f"/api/v1/treatments/sessions/{session.id}/feedback/",
                {"completion_status": "done", "response_score": 5, "notes": "OK", "review_requested": False},
                format="json",
            )

        block = plan.blocks.first()
        block.refresh_from_db()
        self.assertEqual(block.status, TreatmentBlock.STATUS_COMPLETED)

        # Re-submitting on the same session should fail
        response = self.client.post(
            f"/api/v1/treatments/sessions/{sessions[0].id}/feedback/",
            {"completion_status": "done", "response_score": 5, "notes": "Again", "review_requested": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_plan_auto_completion_on_final_block(self):
        """G3: When final block covers total_days, plan auto-completes."""
        self._auth(self.doctor)
        payload = {
            "prescription": self.prescription.id,
            "total_days": 3,
            "block": {
                "start_day_number": 1,
                "end_day_number": 3,
                "start_date": "2026-03-01",
                "entries": [
                    {
                        "entry_type": "day_range",
                        "start_day_number": 1,
                        "end_day_number": 3,
                        "procedure_name": "Treatment",
                        "medium_type": "oil",
                    }
                ],
            },
        }
        response = self.client.post("/api/v1/treatments/plans/", payload, format="json")
        plan = TreatmentPlan.objects.get(pk=response.data["id"])

        self._auth(self.therapist)
        for session in plan.blocks.first().sessions.order_by("day_number"):
            self.client.post(
                f"/api/v1/treatments/sessions/{session.id}/feedback/",
                {"completion_status": "done", "response_score": 4, "notes": "", "review_requested": False},
                format="json",
            )

        plan.refresh_from_db()
        self.assertEqual(plan.status, TreatmentPlan.STATUS_COMPLETED)
        self.assertTrue(
            DoctorActionTask.objects.filter(
                treatment_plan=plan,
                task_type=DoctorActionTask.TYPE_PLAN_COMPLETED,
            ).exists()
        )
        # Should NOT have a block_completed task since plan completed
        self.assertFalse(
            DoctorActionTask.objects.filter(
                treatment_plan=plan,
                task_type=DoctorActionTask.TYPE_BLOCK_COMPLETED,
            ).exists()
        )

    def test_doctor_task_resolve_and_already_resolved(self):
        """G3: Doctor can resolve task; re-resolving returns 400."""
        plan = self._create_plan()
        first_session = plan.blocks.first().sessions.order_by("day_number").first()

        self._auth(self.therapist)
        self.client.post(
            f"/api/v1/treatments/sessions/{first_session.id}/feedback/",
            {"completion_status": "done", "response_score": 4, "notes": "Review me", "review_requested": True},
            format="json",
        )

        task = DoctorActionTask.objects.get(
            treatment_plan=plan, task_type=DoctorActionTask.TYPE_REVIEW_REQUESTED
        )

        self._auth(self.doctor)
        response = self.client.post(
            f"/api/v1/treatments/doctor-tasks/{task.id}/resolve/",
            {"notes": "Looks good"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "resolved")

        # Already resolved
        response = self.client.post(
            f"/api/v1/treatments/doctor-tasks/{task.id}/resolve/",
            {"notes": "Again"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_therapist_cannot_resolve_doctor_task(self):
        """G3: Therapist should not be able to resolve doctor tasks."""
        plan = self._create_plan()
        first_session = plan.blocks.first().sessions.order_by("day_number").first()

        self._auth(self.therapist)
        self.client.post(
            f"/api/v1/treatments/sessions/{first_session.id}/feedback/",
            {"completion_status": "done", "response_score": 4, "notes": "Review me", "review_requested": True},
            format="json",
        )

        task = DoctorActionTask.objects.get(
            treatment_plan=plan, task_type=DoctorActionTask.TYPE_REVIEW_REQUESTED
        )

        # Therapist tries to resolve
        response = self.client.post(
            f"/api/v1/treatments/doctor-tasks/{task.id}/resolve/",
            {"notes": "I resolved it"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_session_edit_planned_ok_done_rejected(self):
        """G3: Doctor can edit planned sessions, but not executed ones."""
        plan = self._create_plan()
        sessions = list(plan.blocks.first().sessions.order_by("day_number"))
        planned_session = sessions[0]
        done_session = sessions[1]

        # Mark one session as done
        self._auth(self.therapist)
        self.client.post(
            f"/api/v1/treatments/sessions/{done_session.id}/feedback/",
            {"completion_status": "done", "response_score": 5, "notes": "", "review_requested": False},
            format="json",
        )

        self._auth(self.doctor)

        # Edit planned session — should succeed
        response = self.client.patch(
            f"/api/v1/treatments/sessions/{planned_session.id}/",
            {"procedure_name": "Updated Procedure", "medium_type": "powder"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["procedure_name"], "Updated Procedure")

        # Edit done session — should fail
        response = self.client.patch(
            f"/api/v1/treatments/sessions/{done_session.id}/",
            {"procedure_name": "Should Fail"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_plan_update_extend_total_days_and_cancel(self):
        """G3: Doctor can extend total_days and cancel a plan."""
        plan = self._create_plan()
        self._auth(self.doctor)

        # Extend total_days
        response = self.client.patch(
            f"/api/v1/treatments/plans/{plan.id}/",
            {"total_days": 20},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        plan.refresh_from_db()
        self.assertEqual(plan.total_days, 20)

        # Cancel plan
        response = self.client.patch(
            f"/api/v1/treatments/plans/{plan.id}/",
            {"status": "cancelled"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        plan.refresh_from_db()
        self.assertEqual(plan.status, "cancelled")

    def test_cascade_protection_on_prescription_delete(self):
        """G3: Deleting prescription with treatment plan raises ProtectedError."""
        from django.db.models import ProtectedError

        self._create_plan()
        with self.assertRaises(ProtectedError):
            self.prescription.delete()

    def test_duplicate_active_plan_prevention(self):
        """G3: Cannot create two active plans for the same prescription."""
        self._create_plan()
        self._auth(self.doctor)
        response = self.client.post(
            "/api/v1/treatments/plans/",
            {
                "prescription": self.prescription.id,
                "total_days": 5,
                "block": {
                    "start_day_number": 1,
                    "end_day_number": 2,
                    "start_date": "2026-03-10",
                    "entries": [
                        {
                            "entry_type": "day_range",
                            "start_day_number": 1,
                            "end_day_number": 2,
                            "procedure_name": "Duplicate",
                            "medium_type": "oil",
                        }
                    ],
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
