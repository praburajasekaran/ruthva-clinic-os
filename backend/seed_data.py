import datetime

from django.contrib.auth import get_user_model

from clinics.models import Clinic
from consultations.models import Consultation
from patients.models import FamilyHistory, MedicalHistory, Patient
from prescriptions.models import Medication, Prescription

User = get_user_model()
today = datetime.date.today()

# --- Clinic ---
clinic = Clinic.objects.create(
    name="Sivanethram Siddha Clinic",
    subdomain="sivanethram",
    discipline="siddha",
    address="12, Kamaraj Street, Madurai - 625001",
    phone="04522345678",
    email="info@sivanethram.com",
    tagline="Traditional Siddha Medicine",
    primary_color="#2c5f2d",
    paper_size="A5",
)
print(f"  Clinic: {clinic.name} ({clinic.subdomain})")

# --- Users ---
owner = User.objects.create_user(
    username="doctor",
    email="doctor@sivanethram.com",
    password="doctor123",
    first_name="Dr. Subashini",
    last_name="M",
    clinic=clinic,
    role="doctor",
    is_clinic_owner=True,
)
therapist = User.objects.create_user(
    username="therapist1",
    email="therapist1@sivanethram.com",
    password="therapist123",
    first_name="Ravi",
    last_name="K",
    clinic=clinic,
    role="therapist",
)
print(f"  Users: {owner.get_full_name()}, {therapist.get_full_name()}")

# --- Patients ---
patients_raw = [
    dict(name="Murugesan Rajan", age=52, gender="male", phone="9876543210",
         email="murugesan.r@email.com",
         address="12, Kamaraj Street, Madurai - 625001", blood_group="B+",
         occupation="Farmer", marital_status="married",
         food_habits="non_vegetarian", activity_level="active",
         allergies="Penicillin",
         _med=[dict(disease="Type 2 Diabetes", duration="8 years",
                    medication="Metformin 500mg"),
               dict(disease="Hypertension", duration="5 years",
                    medication="Amlodipine 5mg")],
         _fam=[dict(relation="Father", disease="Diabetes", duration="20 years",
                    remarks="Deceased"),
               dict(relation="Mother", disease="Hypertension",
                    duration="15 years", remarks="")]),
    dict(name="Lakshmi Devi", age=38, gender="female", phone="9845612378",
         email="lakshmi.devi@gmail.com",
         address="34, Anna Nagar, Chennai - 600040", blood_group="O+",
         occupation="Teacher", marital_status="married",
         food_habits="vegetarian", activity_level="moderate",
         menstrual_history="Regular 28-day cycle, mild dysmenorrhea",
         number_of_children=2,
         _med=[dict(disease="PCOD", duration="3 years", medication=""),
               dict(disease="Iron Deficiency Anemia", duration="2 years",
                    medication="Iron supplements")],
         _fam=[dict(relation="Mother", disease="PCOD", duration="10 years",
                    remarks="")]),
    dict(name="Karthik Selvam", age=28, gender="male", phone="8765432109",
         email="karthik.s@outlook.com",
         address="7, Gandhi Road, Coimbatore - 641001", blood_group="A+",
         occupation="Software Engineer", marital_status="single",
         food_habits="non_vegetarian", activity_level="sedentary",
         _med=[],
         _fam=[dict(relation="Father", disease="Hypertension",
                    duration="10 years", remarks="Controlled")]),
    dict(name="Saraswathi Natarajan", age=65, gender="female",
         phone="9123456780",
         address="56, Meenakshi Amman Street, Thanjavur - 613001",
         blood_group="AB+", occupation="Retired", marital_status="widowed",
         food_habits="vegetarian", activity_level="sedentary",
         menstrual_history="Post-menopausal", number_of_children=3,
         allergies="Sulfa drugs",
         _med=[dict(disease="Osteoarthritis", duration="10 years",
                    medication="Diclofenac topical"),
               dict(disease="Hypothyroidism", duration="12 years",
                    medication="Levothyroxine 50mcg"),
               dict(disease="Type 2 Diabetes", duration="7 years",
                    medication="Glipizide 5mg")],
         _fam=[dict(relation="Sister", disease="Hypothyroidism",
                    duration="15 years", remarks="")]),
    dict(name="Dinesh Kumar", age=44, gender="male", phone="7654321098",
         email="dinesh.kumar44@yahoo.com",
         address="23, Nehru Street, Trichy - 620001", blood_group="O-",
         occupation="Business Owner", marital_status="married",
         food_habits="non_vegetarian", activity_level="moderate",
         referred_by="Dr. Anbu Siddha Clinic",
         _med=[dict(disease="Psoriasis", duration="6 years", medication=""),
               dict(disease="Stress / Anxiety", duration="3 years",
                    medication="")],
         _fam=[]),
]

pp = []
for raw in patients_raw:
    med, fam = raw.pop("_med"), raw.pop("_fam")
    p = Patient.objects.create(clinic=clinic, **raw)
    for m in med:
        MedicalHistory.objects.create(patient=p, **m)
    for f in fam:
        FamilyHistory.objects.create(patient=p, **f)
    pp.append(p)
    print(f"  Patient {p.record_id}: {p.name}")

# --- Consultations ---
cc = []
consult_data = [
    dict(patient=pp[0], conducted_by=owner,
         consultation_date=today - datetime.timedelta(days=45),
         weight="72.5", height="168.0", pulse_rate=82, temperature="98.6",
         bp_systolic=145, bp_diastolic=92,
         appetite="normal", bowel="abnormal",
         bowel_notes="Constipation, 2-day intervals",
         micturition="normal", sleep_quality="abnormal",
         sleep_notes="Disturbed sleep, wakes at 2am",
         diagnostic_data={"envagai_thervu": {
             "nadi": "Vatha Pitha predominant",
             "naa": "Coated tongue, white coating",
             "niram": "Slightly yellowish",
         }},
         chief_complaints="Fatigue, excessive thirst, frequent urination",
         history_of_present_illness="Worsening diabetic symptoms. FBS 210.",
         diagnosis="Madhumegam (Prameham) - Vatha-Pitha type."),
    dict(patient=pp[0], conducted_by=owner,
         consultation_date=today - datetime.timedelta(days=7),
         weight="71.8", height="168.0", pulse_rate=76, temperature="98.4",
         bp_systolic=138, bp_diastolic=88,
         appetite="normal", bowel="normal", micturition="normal",
         sleep_quality="normal",
         diagnostic_data={"envagai_thervu": {
             "nadi": "Vatha Pitha - improving",
             "naa": "Tongue less coated",
         }},
         chief_complaints="Follow-up - improved energy, reduced thirst",
         history_of_present_illness="Good improvement. FBS 165 mg/dL.",
         diagnosis="Madhumegam responding to treatment."),
    dict(patient=pp[1], conducted_by=owner,
         consultation_date=today - datetime.timedelta(days=20),
         weight="58.0", height="157.0", pulse_rate=78, temperature="98.2",
         bp_systolic=110, bp_diastolic=72,
         appetite="abnormal",
         appetite_notes="Reduced before menstrual cycle",
         bowel="normal", micturition="normal", sleep_quality="abnormal",
         sleep_notes="Insomnia 1 week before cycle",
         diagnostic_data={"envagai_thervu": {
             "nadi": "Pitha Vatha type",
             "vizhi": "Slight pallor in conjunctiva",
         }},
         chief_complaints="Irregular periods, dysmenorrhea, fatigue",
         history_of_present_illness="PCOD. Cycle delayed 2-3 weeks.",
         diagnosis="Vatha-Pitha imbalance causing irregular cycles."),
    dict(patient=pp[2], conducted_by=therapist,
         consultation_date=today - datetime.timedelta(days=3),
         weight="82.0", height="174.0", pulse_rate=88, temperature="98.6",
         bp_systolic=125, bp_diastolic=82,
         appetite="normal", bowel="abnormal",
         bowel_notes="Irregular, IBS tendency",
         micturition="normal", sleep_quality="abnormal",
         sleep_notes="Sleeping 2am-9am, poor quality",
         diagnostic_data={"envagai_thervu": {
             "nadi": "Pitha dominant",
         }},
         chief_complaints="Lower back pain, neck stiffness, headaches",
         history_of_present_illness="IT professional, 10+ hrs desk.",
         diagnosis="Vatha disorder - sedentary. Pitha excess from stress."),
    dict(patient=pp[3], conducted_by=owner,
         consultation_date=today - datetime.timedelta(days=14),
         weight="65.5", height="152.0", pulse_rate=72, temperature="97.8",
         bp_systolic=132, bp_diastolic=84,
         appetite="normal", bowel="abnormal",
         bowel_notes="Constipation, hard stools",
         micturition="normal", sleep_quality="abnormal",
         sleep_notes="Wakes due to joint pain",
         diagnostic_data={"envagai_thervu": {
             "nadi": "Vatha Kapha type",
             "mei": "Cold to touch in joints",
         }},
         chief_complaints="Bilateral knee pain, morning stiffness",
         history_of_present_illness="Worsening bilateral knee OA.",
         diagnosis="Vatha predominant Osteoarthritis."),
]

for cdata in consult_data:
    c = Consultation.objects.create(clinic=clinic, **cdata)
    cc.append(c)
    print(f"  Consultation: {c.patient.name} ({c.consultation_date})")

# --- Prescriptions ---
rx_data = [
    dict(consultation=cc[0],
         diet_advice="Avoid sugar, white rice. Include bitter gourd.",
         diet_advice_ta="சர்க்கரை, வெள்ளை அரிசி தவிர்க்கவும்.",
         lifestyle_advice="Walk 30 mins morning. Avoid stress.",
         lifestyle_advice_ta="காலையில் 30 நிமிடம் நடக்கவும்.",
         follow_up_date=today + datetime.timedelta(days=30),
         _meds=[
             dict(drug_name="Siddha Chooranam No. 14", dosage="5g",
                  frequency="BD", frequency_tamil="காலை-மாலை",
                  duration="45 days",
                  instructions="Mix with warm water and honey",
                  instructions_ta="வெது நீர் மற்றும் தேனில் கலந்து",
                  sort_order=1),
             dict(drug_name="Aavarai Pattai Kashayam", dosage="60ml",
                  frequency="BD", frequency_tamil="காலை-மாலை",
                  duration="45 days", instructions="Before food",
                  instructions_ta="சாப்பிடுவதற்கு முன்பு", sort_order=2),
         ]),
    dict(consultation=cc[2],
         diet_advice="Avoid cold foods. Include spinach, dates.",
         diet_advice_ta="குளிர்ந்த உணவு தவிர்க்கவும்.",
         lifestyle_advice="Daily yoga. Regular sleep schedule.",
         lifestyle_advice_ta="தினமும் யோகா.",
         follow_up_date=today + datetime.timedelta(days=45),
         _meds=[
             dict(drug_name="Ashoka Arishtam", dosage="20ml",
                  frequency="BD", frequency_tamil="காலை-மாலை",
                  duration="60 days",
                  instructions="After food with equal water",
                  instructions_ta="சாப்பிட்ட பின் சம அளவு நீர்",
                  sort_order=1),
         ]),
    dict(consultation=cc[4],
         diet_advice="Warm foods only. Turmeric milk at night.",
         diet_advice_ta="வெது உணவு மட்டும். இரவு மஞ்சள் பால்.",
         lifestyle_advice="Warm sesame oil knee massage daily.",
         lifestyle_advice_ta="தினமும் வெது நல்லெண்ணெய் மசாஜ்.",
         follow_up_date=today + datetime.timedelta(days=21),
         _meds=[
             dict(drug_name="Nirgundi Tailam", dosage="10ml",
                  frequency="BD", frequency_tamil="காலை-மாலை",
                  duration="30 days",
                  instructions="Warm and apply on knees",
                  instructions_ta="வெது செய்து முழங்காலில் தடவவும்",
                  sort_order=1),
             dict(drug_name="Vatari Guggulu", dosage="2 tablets",
                  frequency="BD", frequency_tamil="காலை-மாலை",
                  duration="45 days",
                  instructions="After food with warm water",
                  instructions_ta="சாப்பிட்ட பின் வெது நீரில்",
                  sort_order=2),
         ]),
]

for rxd in rx_data:
    meds = rxd.pop("_meds")
    rx = Prescription.objects.create(clinic=clinic, **rxd)
    for m in meds:
        Medication.objects.create(prescription=rx, **m)
    print(f"  Prescription: {rx.consultation.patient.name} ({len(meds)} meds)")

print(f"\nDone: {Clinic.objects.count()} clinic, "
      f"{User.objects.count()} users, "
      f"{Patient.objects.count()} patients, "
      f"{Consultation.objects.count()} consultations, "
      f"{Prescription.objects.count()} prescriptions, "
      f"{Medication.objects.count()} medications")
print(f"\nLogin: username=doctor password=doctor123")
print(f"Clinic slug: sivanethram (use X-Clinic-Slug header in dev)")
