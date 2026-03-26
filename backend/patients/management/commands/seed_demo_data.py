"""
Seed realistic demo data for the Ruthva dashboard.

Creates:
- Demo user: demo@ruthva.com (Dr. Kavitha Rajan)
- Clinic: Vaidya Wellness Ayurveda
- 25 patients across 7 risk scenarios
- Full event timelines per journey

Usage:
    python manage.py seed_demo_data
    python manage.py seed_demo_data --flush   # wipe & recreate
"""

import uuid
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from clinics.models import Clinic
from consultations.models import Consultation
from integrations.models import JourneyEvent, RuthvaJourneyRef
from patients.models import Patient
from prescriptions.models import Medication, Prescription
from users.models import EmailOTP
from users.otp import hash_otp

User = get_user_model()

DEMO_EMAIL = "demo@ruthva.com"
DEMO_OTP = "123456"

TODAY = date.today()


def _d(days_ago):
    """Return a date `days_ago` days before today."""
    return TODAY - timedelta(days=days_ago)


def _jid():
    """Generate a unique Ruthva journey ID."""
    return f"rj_{uuid.uuid4().hex[:12]}"


def _pid():
    """Generate a unique Ruthva patient ID."""
    return f"rp_{uuid.uuid4().hex[:8]}"


# ── Patient definitions ──────────────────────────────────────────────────────

STABLE_PATIENTS = [
    {"name": "Ananya Sharma", "age": 34, "gender": "female", "phone": "9845012301",
     "address": "12, MG Road, Koramangala, Bengaluru", "blood_group": "B+",
     "occupation": "Software Engineer", "food_habits": "vegetarian",
     "followup_interval": 7, "duration": 60, "started_ago": 42},
    {"name": "Vikram Patel", "age": 48, "gender": "male", "phone": "9845012302",
     "address": "45, Jubilee Hills, Hyderabad", "blood_group": "O+",
     "occupation": "Bank Manager", "food_habits": "non_vegetarian",
     "followup_interval": 14, "duration": 90, "started_ago": 56},
    {"name": "Priya Nair", "age": 29, "gender": "female", "phone": "9845012303",
     "address": "78, Panampilly Nagar, Kochi", "blood_group": "A+",
     "occupation": "Teacher", "food_habits": "vegetarian",
     "followup_interval": 7, "duration": 45, "started_ago": 28},
    {"name": "Suresh Reddy", "age": 56, "gender": "male", "phone": "9845012304",
     "address": "23, Banjara Hills, Hyderabad", "blood_group": "AB+",
     "occupation": "Retired Government Officer", "food_habits": "vegetarian",
     "followup_interval": 14, "duration": 90, "started_ago": 70},
    {"name": "Deepa Iyer", "age": 42, "gender": "female", "phone": "9845012305",
     "address": "56, Mylapore, Chennai", "blood_group": "B-",
     "occupation": "Accountant", "food_habits": "vegetarian",
     "followup_interval": 7, "duration": 60, "started_ago": 35},
    {"name": "Arjun Menon", "age": 37, "gender": "male", "phone": "9845012306",
     "address": "89, Vyttila, Kochi", "blood_group": "O+",
     "occupation": "Architect", "food_habits": "non_vegetarian",
     "followup_interval": 14, "duration": 60, "started_ago": 42},
    {"name": "Lakshmi Krishnan", "age": 61, "gender": "female", "phone": "9845012307",
     "address": "34, T. Nagar, Chennai", "blood_group": "A-",
     "occupation": "Homemaker", "food_habits": "vegetarian",
     "followup_interval": 7, "duration": 90, "started_ago": 49},
    {"name": "Ravi Shankar", "age": 45, "gender": "male", "phone": "9845012308",
     "address": "67, Jayanagar, Bengaluru", "blood_group": "B+",
     "occupation": "Business Owner", "food_habits": "non_vegetarian",
     "followup_interval": 14, "duration": 60, "started_ago": 28},
    {"name": "Meera Joshi", "age": 33, "gender": "female", "phone": "9845012309",
     "address": "12, Aundh, Pune", "blood_group": "O-",
     "occupation": "Graphic Designer", "food_habits": "vegetarian",
     "followup_interval": 7, "duration": 30, "started_ago": 21},
    {"name": "Karthik Bhat", "age": 52, "gender": "male", "phone": "9845012310",
     "address": "45, Indiranagar, Bengaluru", "blood_group": "AB+",
     "occupation": "Professor", "food_habits": "vegetarian",
     "followup_interval": 14, "duration": 90, "started_ago": 56},
]

WATCH_PATIENTS = [
    {"name": "Sanjay Gupta", "age": 44, "gender": "male", "phone": "9845012311",
     "address": "78, Dwarka, New Delhi", "blood_group": "A+",
     "occupation": "Sales Manager", "food_habits": "non_vegetarian",
     "followup_interval": 7, "duration": 60, "started_ago": 28,
     "risk_reason": "No response to last 2 adherence checks sent 5 and 3 days ago"},
    {"name": "Nithya Raman", "age": 38, "gender": "female", "phone": "9845012312",
     "address": "23, Anna Nagar, Chennai", "blood_group": "B+",
     "occupation": "Journalist", "food_habits": "vegetarian",
     "followup_interval": 14, "duration": 45, "started_ago": 35,
     "risk_reason": "Slow response pattern — last adherence reply took 4 days"},
    {"name": "Balaji Sundaram", "age": 59, "gender": "male", "phone": "9845012313",
     "address": "56, RS Puram, Coimbatore", "blood_group": "O+",
     "occupation": "Textile Merchant", "food_habits": "vegetarian",
     "followup_interval": 7, "duration": 90, "started_ago": 42,
     "risk_reason": "No response to adherence check sent 2 days ago; previous check also delayed"},
]

AT_RISK_PATIENTS = [
    {"name": "Kavitha Murugan", "age": 47, "gender": "female", "phone": "9845012314",
     "address": "89, Velachery, Chennai", "blood_group": "A-",
     "occupation": "Nurse", "food_habits": "non_vegetarian",
     "followup_interval": 7, "duration": 60, "started_ago": 42,
     "missed": 1, "recovery_attempts": 1,
     "risk_reason": "Missed visit on day 28; recovery message sent, awaiting response"},
    {"name": "Ramesh Babu", "age": 63, "gender": "male", "phone": "9845012315",
     "address": "34, Gandhinagar, Bengaluru", "blood_group": "B+",
     "occupation": "Retired Teacher", "food_habits": "vegetarian",
     "followup_interval": 14, "duration": 90, "started_ago": 56,
     "missed": 2, "recovery_attempts": 2,
     "risk_reason": "Missed 2 consecutive visits; recovery messages sent but no confirmation yet"},
    {"name": "Pooja Srinivasan", "age": 31, "gender": "female", "phone": "9845012316",
     "address": "67, Adyar, Chennai", "blood_group": "O+",
     "occupation": "Marketing Executive", "food_habits": "vegetarian",
     "followup_interval": 7, "duration": 45, "started_ago": 28,
     "missed": 1, "recovery_attempts": 1,
     "risk_reason": "Missed last scheduled visit; cited work travel — recovery message sent"},
    {"name": "Ganesh Pillai", "age": 55, "gender": "male", "phone": "9845012317",
     "address": "12, Kakkanad, Kochi", "blood_group": "AB-",
     "occupation": "Contractor", "food_habits": "non_vegetarian",
     "followup_interval": 14, "duration": 60, "started_ago": 42,
     "missed": 2, "recovery_attempts": 1,
     "risk_reason": "2 missed visits in last month; phone unreachable on first attempt"},
]

CRITICAL_PATIENTS = [
    {"name": "Venkatesh Rao", "age": 67, "gender": "male", "phone": "9845012318",
     "address": "45, Basavanagudi, Bengaluru", "blood_group": "A+",
     "occupation": "Retired", "food_habits": "vegetarian",
     "followup_interval": 7, "duration": 90, "started_ago": 63,
     "missed": 4, "recovery_attempts": 3,
     "risk_reason": "4 missed visits over 28 days; 3 recovery attempts failed — phone switched off repeatedly"},
    {"name": "Saraswathi Devi", "age": 58, "gender": "female", "phone": "9845012319",
     "address": "78, Thiruvanmiyur, Chennai", "blood_group": "B-",
     "occupation": "Homemaker", "food_habits": "vegetarian",
     "followup_interval": 14, "duration": 90, "started_ago": 70,
     "missed": 3, "recovery_attempts": 3,
     "risk_reason": "3 missed visits; family reported health issues preventing travel — all recovery messages acknowledged but no visit"},
]

RECOVERED_PATIENTS = [
    {"name": "Arun Kumar", "age": 41, "gender": "male", "phone": "9845012320",
     "address": "23, Guindy, Chennai", "blood_group": "O+",
     "occupation": "IT Consultant", "food_habits": "non_vegetarian",
     "followup_interval": 7, "duration": 60, "started_ago": 42,
     "missed": 2, "recovery_attempts": 2,
     "returned_ago": 5,
     "risk_reason": "Was at-risk with 2 missed visits; returned after recovery outreach"},
    {"name": "Divya Narayanan", "age": 36, "gender": "female", "phone": "9845012321",
     "address": "56, Alwarpet, Chennai", "blood_group": "A+",
     "occupation": "Physiotherapist", "food_habits": "vegetarian",
     "followup_interval": 14, "duration": 45, "started_ago": 35,
     "missed": 1, "recovery_attempts": 1,
     "returned_ago": 8,
     "risk_reason": "Missed 1 visit due to family emergency; returned after follow-up call"},
    {"name": "Manoj Tiwari", "age": 50, "gender": "male", "phone": "9845012322",
     "address": "89, Koregaon Park, Pune", "blood_group": "B+",
     "occupation": "Restaurant Owner", "food_habits": "non_vegetarian",
     "followup_interval": 7, "duration": 60, "started_ago": 35,
     "missed": 1, "recovery_attempts": 1,
     "returned_ago": 3,
     "risk_reason": "Was at-risk after missing visit; returned voluntarily after WhatsApp reminder"},
]

COMPLETED_PATIENTS = [
    {"name": "Radha Mohan", "age": 45, "gender": "female", "phone": "9845012323",
     "address": "34, Besant Nagar, Chennai", "blood_group": "O-",
     "occupation": "School Principal", "food_habits": "vegetarian",
     "followup_interval": 7, "duration": 45, "started_ago": 50},
    {"name": "Prasad Varma", "age": 53, "gender": "male", "phone": "9845012324",
     "address": "67, Jubilee Hills, Hyderabad", "blood_group": "AB+",
     "occupation": "Chartered Accountant", "food_habits": "vegetarian",
     "followup_interval": 14, "duration": 60, "started_ago": 65},
]

DROPPED_PATIENTS = [
    {"name": "Jayalakshmi Pillai", "age": 62, "gender": "female", "phone": "9845012325",
     "address": "12, Tripunithura, Kochi", "blood_group": "A+",
     "occupation": "Retired Nurse", "food_habits": "vegetarian",
     "followup_interval": 7, "duration": 90, "started_ago": 56,
     "missed": 4, "recovery_attempts": 4,
     "risk_reason": "4 missed visits; no response to any recovery attempts — marked dropped after 28 days of no contact"},
]


DIAGNOSES = [
    "Vatha-Kapha imbalance — chronic joint stiffness",
    "Pitha aggravation — acid reflux and skin rash",
    "Kapha-Vatha disorder — respiratory congestion",
    "Vatha disorder — lower back pain and sciatica",
    "Pitha-Kapha imbalance — sluggish digestion",
    "Vatha-Pitha disorder — migraine and insomnia",
    "Kapha disorder — obesity with fluid retention",
    "Vatha aggravation — cervical spondylosis",
    "Pitha disorder — hyperacidity and ulcers",
    "Tri-dosha imbalance — general debility",
]


def _build_stable_events(journey, interval, started_ago):
    """Build event timeline for a stable patient with confirmed visits."""
    events = []
    start = _d(started_ago)
    events.append(("journey_started", start, {"note": "Patient consented and journey initiated"}))

    visit_day = interval
    while visit_day <= started_ago:
        visit_date = start + timedelta(days=visit_day)
        events.append(("visit_expected", visit_date, {}))
        events.append(("reminder_sent", visit_date - timedelta(days=1), {"channel": "whatsapp"}))
        events.append(("visit_confirmed", visit_date, {"confirmed_by": "patient"}))
        visit_day += interval

    # Adherence checks (every 2 intervals)
    check_day = interval * 2
    while check_day <= started_ago:
        check_date = start + timedelta(days=check_day)
        events.append(("adherence_check_sent", check_date, {"channel": "whatsapp"}))
        events.append(("adherence_response", check_date + timedelta(days=1),
                        {"response": "feeling better", "sentiment": "positive"}))
        check_day += interval * 2

    return events


def _build_watch_events(journey, interval, started_ago):
    """Build timeline for a watch patient — adherence checks with no/slow response."""
    events = []
    start = _d(started_ago)
    events.append(("journey_started", start, {}))

    # Some confirmed visits early on
    visit_day = interval
    confirmed_visits = (started_ago // interval) - 1  # miss the latest check cycle
    count = 0
    while visit_day <= started_ago and count < confirmed_visits:
        visit_date = start + timedelta(days=visit_day)
        events.append(("visit_expected", visit_date, {}))
        events.append(("reminder_sent", visit_date - timedelta(days=1), {"channel": "whatsapp"}))
        events.append(("visit_confirmed", visit_date, {}))
        visit_day += interval
        count += 1

    # Recent adherence checks with no response
    events.append(("adherence_check_sent", _d(5), {"channel": "whatsapp"}))
    events.append(("adherence_check_sent", _d(3), {"channel": "whatsapp"}))

    return events


def _build_at_risk_events(journey, interval, started_ago, missed, recovery_attempts):
    """Build timeline for an at-risk patient with 1-2 missed visits."""
    events = []
    start = _d(started_ago)
    events.append(("journey_started", start, {}))

    total_expected = started_ago // interval
    confirmed_count = total_expected - missed

    visit_day = interval
    count = 0
    while count < confirmed_count:
        visit_date = start + timedelta(days=visit_day)
        events.append(("visit_expected", visit_date, {}))
        events.append(("reminder_sent", visit_date - timedelta(days=1), {"channel": "whatsapp"}))
        events.append(("visit_confirmed", visit_date, {}))
        visit_day += interval
        count += 1

    # Missed visits
    for m in range(missed):
        visit_date = start + timedelta(days=visit_day)
        events.append(("visit_expected", visit_date, {}))
        events.append(("reminder_sent", visit_date - timedelta(days=1), {"channel": "whatsapp"}))
        events.append(("visit_missed", visit_date + timedelta(days=1), {}))
        if m < recovery_attempts:
            events.append(("recovery_message_sent", visit_date + timedelta(days=2),
                            {"channel": "whatsapp", "attempt": m + 1}))
        visit_day += interval

    return events


def _build_critical_events(journey, interval, started_ago, missed, recovery_attempts):
    """Build timeline for a critical patient with 3+ missed visits."""
    events = []
    start = _d(started_ago)
    events.append(("journey_started", start, {}))

    total_expected = started_ago // interval
    confirmed_count = max(total_expected - missed, 1)

    visit_day = interval
    count = 0
    while count < confirmed_count:
        visit_date = start + timedelta(days=visit_day)
        events.append(("visit_expected", visit_date, {}))
        events.append(("visit_confirmed", visit_date, {}))
        visit_day += interval
        count += 1

    for m in range(missed):
        visit_date = start + timedelta(days=visit_day)
        events.append(("visit_expected", visit_date, {}))
        events.append(("reminder_sent", visit_date - timedelta(days=1), {"channel": "whatsapp"}))
        events.append(("visit_missed", visit_date + timedelta(days=1), {}))
        if m < recovery_attempts:
            events.append(("recovery_message_sent", visit_date + timedelta(days=2),
                            {"channel": "whatsapp", "attempt": m + 1,
                             "outcome": "no_response" if m < recovery_attempts - 1 else "pending"}))
        visit_day += interval

    return events


def _build_recovered_events(journey, interval, started_ago, missed, recovery_attempts, returned_ago):
    """Build timeline for a recovered patient — was at-risk but came back."""
    events = _build_at_risk_events(journey, interval, started_ago, missed, recovery_attempts)

    # Add patient_returned event within the current month
    returned_date = _d(returned_ago)
    events.append(("patient_returned", returned_date,
                    {"note": "Patient returned after recovery outreach"}))
    events.append(("visit_confirmed", returned_date, {"confirmed_by": "walk_in"}))

    return events


def _build_completed_events(journey, interval, duration, started_ago):
    """Build timeline for a completed patient — all visits confirmed."""
    events = []
    start = _d(started_ago)
    events.append(("journey_started", start, {}))

    visit_day = interval
    while visit_day <= duration:
        visit_date = start + timedelta(days=visit_day)
        events.append(("visit_expected", visit_date, {}))
        events.append(("reminder_sent", visit_date - timedelta(days=1), {"channel": "whatsapp"}))
        events.append(("visit_confirmed", visit_date, {}))
        visit_day += interval

    # Adherence checks
    check_day = interval * 3
    while check_day <= duration:
        check_date = start + timedelta(days=check_day)
        events.append(("adherence_check_sent", check_date, {}))
        events.append(("adherence_response", check_date, {"response": "good", "sentiment": "positive"}))
        check_day += interval * 3

    return events


def _build_dropped_events(journey, interval, started_ago, missed, recovery_attempts):
    """Build timeline for a dropped patient — 4 missed, gave up."""
    events = _build_critical_events(journey, interval, started_ago, missed, recovery_attempts)
    return events


class Command(BaseCommand):
    help = "Seed demo data for the Ruthva dashboard (25 patients, event timelines, demo login)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete existing demo data before re-seeding",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self._flush()

        # Idempotency check
        if User.objects.filter(email=DEMO_EMAIL).exists():
            self.stdout.write(self.style.WARNING(
                "Demo data already exists (demo@ruthva.com found). Use --flush to recreate."
            ))
            return

        clinic = self._create_clinic_and_user()
        self._seed_patients(clinic)
        self._seed_demo_otp()

        self.stdout.write(self.style.SUCCESS(
            "\nDemo data seeded successfully!"
            f"\n  Login: {DEMO_EMAIL}"
            f"\n  OTP:   {DEMO_OTP}"
            f"\n  Clinic: Vaidya Wellness Ayurveda"
            "\n  Patients: 25 across all risk scenarios"
        ))

    def _flush(self):
        """Remove all demo data."""
        user = User.objects.filter(email=DEMO_EMAIL).first()
        if user and user.clinic:
            clinic = user.clinic
            # Cascade deletes patients, consultations, journeys, events
            Patient.objects.filter(clinic=clinic).delete()
            Consultation.objects.filter(clinic=clinic).delete()
            RuthvaJourneyRef.objects.filter(clinic=clinic).delete()
            clinic.delete()
        if user:
            user.delete()
        EmailOTP.objects.filter(email=DEMO_EMAIL).delete()
        self.stdout.write(self.style.WARNING("Flushed existing demo data."))

    def _create_clinic_and_user(self):
        """Create the demo clinic and doctor user."""
        clinic = Clinic.objects.create(
            name="Vaidya Wellness Ayurveda",
            subdomain="vaidya-wellness",
            discipline="ayurveda",
            address="42, 3rd Cross, Jayanagar 4th Block\nBengaluru, Karnataka 560011",
            phone="9845000001",
            email="clinic@vaidyawellness.in",
            tagline="Traditional Ayurveda for modern wellness",
            registration_number="KA-AYU-2024-1042",
            plan="pro",
        )

        user = User.objects.create(
            username="demo_kavitha",
            email=DEMO_EMAIL,
            first_name="Kavitha",
            last_name="Rajan",
            clinic=clinic,
            role="doctor",
            is_clinic_owner=True,
        )
        user.set_unusable_password()
        user.save(update_fields=["password"])

        self.stdout.write(f"  Created clinic: {clinic.name}")
        self.stdout.write(f"  Created user: Dr. {user.first_name} {user.last_name} ({DEMO_EMAIL})")
        return clinic

    def _create_patient(self, clinic, data):
        """Create a patient and initial consultation."""
        patient = Patient.objects.create(
            clinic=clinic,
            name=data["name"],
            age=data["age"],
            gender=data["gender"],
            phone=data["phone"],
            address=data.get("address", ""),
            blood_group=data.get("blood_group", ""),
            occupation=data.get("occupation", ""),
            food_habits=data.get("food_habits", ""),
            activity_level="moderate",
            marital_status="married",
        )
        return patient

    def _create_consultation(self, clinic, patient, user, consult_date, diagnosis):
        """Create a consultation for the patient."""
        consultation = Consultation.objects.create(
            clinic=clinic,
            patient=patient,
            conducted_by=user,
            weight=55 + (patient.age % 20),
            height=155 + (patient.age % 15),
            pulse_rate=72 + (patient.age % 8),
            temperature=98.6,
            bp_systolic=120 + (patient.age % 10),
            bp_diastolic=80 + (patient.age % 5),
            appetite="normal",
            bowel="normal",
            micturition="normal",
            sleep_quality="normal",
            chief_complaints=diagnosis.split(" — ")[1] if " — " in diagnosis else diagnosis,
            diagnosis=diagnosis,
            consultation_date=consult_date,
        )
        return consultation

    def _create_prescription(self, clinic, consultation, follow_up_date):
        """Create a basic Ayurvedic prescription."""
        prescription = Prescription.objects.create(
            clinic=clinic,
            consultation=consultation,
            diet_advice="Follow warm, easily digestible diet. Avoid cold and raw foods.",
            lifestyle_advice="Maintain regular sleep schedule. Practice pranayama daily.",
            exercise_advice="Gentle yoga for 20 minutes, morning walk.",
            follow_up_date=follow_up_date,
            follow_up_notes="Review progress and adjust treatment",
        )
        Medication.objects.create(
            prescription=prescription,
            drug_name="Ashwagandha Churna",
            dosage="3g",
            frequency="BD",
            duration="30 days",
            instructions="Mix with warm milk, take after food",
            sort_order=1,
        )
        Medication.objects.create(
            prescription=prescription,
            drug_name="Triphala Guggulu",
            dosage="2 tablets",
            frequency="BD",
            duration="30 days",
            instructions="Take with warm water before food",
            sort_order=2,
        )
        return prescription

    def _create_journey_with_events(self, clinic, patient, consultation, data, risk_level, status,
                                     events_list, risk_reason=""):
        """Create a RuthvaJourneyRef and its events."""
        start = _d(data["started_ago"])
        interval = data["followup_interval"]

        # Calculate last_visit_date from confirmed events
        confirmed_dates = [e[1] for e in events_list if e[0] == "visit_confirmed"]
        last_visit = max(confirmed_dates) if confirmed_dates else start

        # Calculate next_visit_date
        if status == "active":
            next_visit = last_visit + timedelta(days=interval)
            if next_visit < TODAY:
                next_visit = TODAY + timedelta(days=max(1, interval - (TODAY - last_visit).days % interval))
        elif status == "completed":
            next_visit = None
        else:
            next_visit = None

        journey = RuthvaJourneyRef.objects.create(
            clinic=clinic,
            patient=patient,
            consultation=consultation,
            ruthva_journey_id=_jid(),
            ruthva_patient_id=_pid(),
            status=status,
            risk_level=risk_level,
            risk_reason=risk_reason,
            start_date=start,
            next_visit_date=next_visit,
            last_visit_date=last_visit,
            missed_visits=data.get("missed", 0),
            recovery_attempts=data.get("recovery_attempts", 0),
            duration_days=data["duration"],
            followup_interval_days=interval,
            consent_given_at=timezone.now() - timedelta(days=data["started_ago"]),
            last_synced_at=timezone.now(),
        )

        # Create events — deduplicate by (journey, event_type, event_date)
        seen = set()
        for event_type, event_date, metadata in events_list:
            key = (event_type, event_date)
            if key in seen:
                continue
            seen.add(key)
            JourneyEvent.objects.create(
                journey=journey,
                event_type=event_type,
                event_date=event_date,
                metadata=metadata,
            )

        return journey

    def _seed_patients(self, clinic):
        """Create all 25 patients with journeys and events."""
        user = User.objects.get(email=DEMO_EMAIL)
        idx = 0

        # ── Stable (10) ──
        for data in STABLE_PATIENTS:
            patient = self._create_patient(clinic, data)
            start = _d(data["started_ago"])
            diagnosis = DIAGNOSES[idx % len(DIAGNOSES)]
            consultation = self._create_consultation(clinic, patient, user, start, diagnosis)
            self._create_prescription(clinic, consultation, start + timedelta(days=data["followup_interval"]))
            events = _build_stable_events(None, data["followup_interval"], data["started_ago"])
            self._create_journey_with_events(
                clinic, patient, consultation, data,
                risk_level="stable", status="active", events_list=events,
            )
            self.stdout.write(f"  [Stable]    {patient.name}")
            idx += 1

        # ── Watch (3) ──
        for data in WATCH_PATIENTS:
            patient = self._create_patient(clinic, data)
            start = _d(data["started_ago"])
            diagnosis = DIAGNOSES[idx % len(DIAGNOSES)]
            consultation = self._create_consultation(clinic, patient, user, start, diagnosis)
            self._create_prescription(clinic, consultation, start + timedelta(days=data["followup_interval"]))
            events = _build_watch_events(None, data["followup_interval"], data["started_ago"])
            self._create_journey_with_events(
                clinic, patient, consultation, data,
                risk_level="watch", status="active", events_list=events,
                risk_reason=data["risk_reason"],
            )
            self.stdout.write(f"  [Watch]     {patient.name}")
            idx += 1

        # ── At Risk (4) ──
        for data in AT_RISK_PATIENTS:
            patient = self._create_patient(clinic, data)
            start = _d(data["started_ago"])
            diagnosis = DIAGNOSES[idx % len(DIAGNOSES)]
            consultation = self._create_consultation(clinic, patient, user, start, diagnosis)
            self._create_prescription(clinic, consultation, start + timedelta(days=data["followup_interval"]))
            events = _build_at_risk_events(
                None, data["followup_interval"], data["started_ago"],
                data["missed"], data["recovery_attempts"],
            )
            self._create_journey_with_events(
                clinic, patient, consultation, data,
                risk_level="at_risk", status="active", events_list=events,
                risk_reason=data["risk_reason"],
            )
            self.stdout.write(f"  [At Risk]   {patient.name}")
            idx += 1

        # ── Critical (2) ──
        for data in CRITICAL_PATIENTS:
            patient = self._create_patient(clinic, data)
            start = _d(data["started_ago"])
            diagnosis = DIAGNOSES[idx % len(DIAGNOSES)]
            consultation = self._create_consultation(clinic, patient, user, start, diagnosis)
            self._create_prescription(clinic, consultation, start + timedelta(days=data["followup_interval"]))
            events = _build_critical_events(
                None, data["followup_interval"], data["started_ago"],
                data["missed"], data["recovery_attempts"],
            )
            self._create_journey_with_events(
                clinic, patient, consultation, data,
                risk_level="critical", status="active", events_list=events,
                risk_reason=data["risk_reason"],
            )
            self.stdout.write(f"  [Critical]  {patient.name}")
            idx += 1

        # ── Recovered (3) ──
        for data in RECOVERED_PATIENTS:
            patient = self._create_patient(clinic, data)
            start = _d(data["started_ago"])
            diagnosis = DIAGNOSES[idx % len(DIAGNOSES)]
            consultation = self._create_consultation(clinic, patient, user, start, diagnosis)
            self._create_prescription(clinic, consultation, start + timedelta(days=data["followup_interval"]))
            events = _build_recovered_events(
                None, data["followup_interval"], data["started_ago"],
                data["missed"], data["recovery_attempts"], data["returned_ago"],
            )
            self._create_journey_with_events(
                clinic, patient, consultation, data,
                risk_level="stable", status="active", events_list=events,
                risk_reason=data["risk_reason"],
            )
            self.stdout.write(f"  [Recovered] {patient.name}")
            idx += 1

        # ── Completed (2) ──
        for data in COMPLETED_PATIENTS:
            patient = self._create_patient(clinic, data)
            start = _d(data["started_ago"])
            diagnosis = DIAGNOSES[idx % len(DIAGNOSES)]
            consultation = self._create_consultation(clinic, patient, user, start, diagnosis)
            self._create_prescription(clinic, consultation, start + timedelta(days=data["followup_interval"]))
            events = _build_completed_events(
                None, data["followup_interval"], data["duration"], data["started_ago"],
            )
            self._create_journey_with_events(
                clinic, patient, consultation, data,
                risk_level="stable", status="completed", events_list=events,
            )
            self.stdout.write(f"  [Completed] {patient.name}")
            idx += 1

        # ── Dropped (1) ──
        for data in DROPPED_PATIENTS:
            patient = self._create_patient(clinic, data)
            start = _d(data["started_ago"])
            diagnosis = DIAGNOSES[idx % len(DIAGNOSES)]
            consultation = self._create_consultation(clinic, patient, user, start, diagnosis)
            self._create_prescription(clinic, consultation, start + timedelta(days=data["followup_interval"]))
            events = _build_dropped_events(
                None, data["followup_interval"], data["started_ago"],
                data["missed"], data["recovery_attempts"],
            )
            self._create_journey_with_events(
                clinic, patient, consultation, data,
                risk_level="critical", status="dropped", events_list=events,
                risk_reason=data["risk_reason"],
            )
            self.stdout.write(f"  [Dropped]   {patient.name}")
            idx += 1

        self.stdout.write(self.style.SUCCESS(f"\n  Created {idx} patients with journeys and events"))

    def _seed_demo_otp(self):
        """Pre-seed a fixed OTP so demo@ruthva.com can log in with code 123456."""
        EmailOTP.objects.filter(email=DEMO_EMAIL).delete()
        EmailOTP.objects.create(
            email=DEMO_EMAIL,
            code_hash=hash_otp(DEMO_OTP),
        )
        self.stdout.write(f"  Seeded demo OTP: {DEMO_OTP} for {DEMO_EMAIL}")
