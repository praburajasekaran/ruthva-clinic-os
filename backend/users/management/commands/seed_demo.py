import datetime

from django.core.management.base import BaseCommand

from clinics.models import Clinic
from consultations.models import Consultation
from patients.models import FamilyHistory, MedicalHistory, Patient
from prescriptions.models import Medication, Prescription
from users.demo import DEMO_CLINICS, ensure_demo_setup

today = datetime.date.today()


class Command(BaseCommand):
    help = "Seed or reset demo clinics with discipline-specific sample data"

    def handle(self, *args, **options):
        user, clinics = ensure_demo_setup()

        for clinic_data in DEMO_CLINICS:
            clinic = clinics[clinic_data["subdomain"]]

            # Clear existing domain data (cascades to consultations, prescriptions)
            Patient.objects.filter(clinic=clinic).delete()

            # Seed discipline-appropriate data
            seeder = {
                "ayurveda": _seed_ayurveda,
                "siddha": _seed_siddha,
                "homeopathy": _seed_homeopathy,
            }.get(clinic.discipline)
            if seeder:
                seeder(clinic, user)

            self.stdout.write(
                self.style.SUCCESS(f"  Seeded {clinic.name} ({clinic.discipline})")
            )

        self.stdout.write(self.style.SUCCESS(f"Done. Demo user: {user.email}"))


def _create_patients(clinic, patients_raw):
    """Create patients with medical/family history. Returns list of Patient objects."""
    patients = []
    for raw in patients_raw:
        med = raw.pop("_med", [])
        fam = raw.pop("_fam", [])
        p = Patient.objects.create(clinic=clinic, **raw)
        for m in med:
            MedicalHistory.objects.create(patient=p, **m)
        for f in fam:
            FamilyHistory.objects.create(patient=p, **f)
        patients.append(p)
    return patients


def _seed_ayurveda(clinic, user):
    """Seed Ayurveda clinic with Prakriti-based diagnostics (English only)."""
    patients = _create_patients(clinic, [
        dict(name="Arjun Sharma", age=45, gender="male", phone="9876543210",
             address="15, MG Road, Jaipur - 302001", blood_group="B+",
             occupation="Business Owner", marital_status="married",
             food_habits="vegetarian", activity_level="moderate",
             _med=[dict(disease="Type 2 Diabetes", duration="5 years", medication="Metformin 500mg")],
             _fam=[dict(relation="Father", disease="Diabetes", duration="15 years", remarks="")]),
        dict(name="Priya Nair", age=32, gender="female", phone="9845612378",
             address="22, Anna Salai, Kochi - 682001", blood_group="O+",
             occupation="Yoga Instructor", marital_status="married",
             food_habits="vegetarian", activity_level="active",
             menstrual_history="Regular 30-day cycle",
             _med=[dict(disease="Migraine", duration="3 years", medication="")],
             _fam=[]),
        dict(name="Vikram Patel", age=58, gender="male", phone="8765432109",
             address="8, Ashram Road, Ahmedabad - 380001", blood_group="A+",
             occupation="Retired Professor", marital_status="married",
             food_habits="vegetarian", activity_level="sedentary",
             _med=[dict(disease="Hypertension", duration="10 years", medication="Amlodipine 5mg"),
                   dict(disease="Osteoarthritis", duration="4 years", medication="")],
             _fam=[dict(relation="Mother", disease="Arthritis", duration="20 years", remarks="")]),
        dict(name="Meera Joshi", age=28, gender="female", phone="7654321098",
             address="45, FC Road, Pune - 411004", blood_group="AB+",
             occupation="Software Engineer", marital_status="single",
             food_habits="vegetarian", activity_level="sedentary",
             _med=[dict(disease="Anxiety", duration="2 years", medication="")],
             _fam=[]),
        dict(name="Ramesh Iyer", age=62, gender="male", phone="9123456780",
             address="12, Mylapore, Chennai - 600004", blood_group="O-",
             occupation="Retired", marital_status="married",
             food_habits="vegetarian", activity_level="moderate",
             allergies="Sulfa drugs",
             _med=[dict(disease="Chronic Back Pain", duration="8 years", medication=""),
                   dict(disease="Insomnia", duration="3 years", medication="")],
             _fam=[dict(relation="Father", disease="Heart Disease", duration="10 years", remarks="Deceased")]),
    ])

    consultations = []
    consult_data = [
        dict(patient=patients[0], conducted_by=user,
             consultation_date=today - datetime.timedelta(days=30),
             weight="78.0", height="172.0", pulse_rate=80, temperature="98.4",
             bp_systolic=140, bp_diastolic=88,
             appetite="normal", bowel="normal", micturition="normal", sleep_quality="abnormal",
             sleep_notes="Wakes at 3am, difficulty falling back asleep",
             diagnostic_data={"prakriti": {
                 "dosha_type": "vata_pitta",
                 "body_frame": "medium",
                 "skin_type": "warm_oily",
                 "digestion": "tikshna",
                 "mental_tendency": "focused_intense",
                 "notes": "Pitta aggravation due to irregular eating. Vata imbalance from stress.",
             }},
             chief_complaints="Excessive thirst, fatigue, frequent urination",
             history_of_present_illness="Worsening diabetic symptoms over 6 months. FBS 195 mg/dL.",
             diagnosis="Prameha (Madhumeha) — Pitta-Vata type diabetes"),
        dict(patient=patients[1], conducted_by=user,
             consultation_date=today - datetime.timedelta(days=14),
             weight="55.0", height="160.0", pulse_rate=74, temperature="98.2",
             bp_systolic=110, bp_diastolic=70,
             appetite="normal", bowel="normal", micturition="normal", sleep_quality="abnormal",
             sleep_notes="Light sleep, vivid dreams",
             diagnostic_data={"prakriti": {
                 "dosha_type": "vata",
                 "body_frame": "thin_light",
                 "skin_type": "dry_rough",
                 "digestion": "vishama",
                 "mental_tendency": "anxious_creative",
                 "notes": "Vata aggravation causing migraines. Triggered by irregular sleep and fasting.",
             }},
             chief_complaints="Recurring migraine, 3-4 episodes per month",
             history_of_present_illness="Migraines worse in cold weather. Aura with visual disturbance.",
             diagnosis="Ardhavabhedaka (Migraine) — Vata type"),
        dict(patient=patients[2], conducted_by=user,
             consultation_date=today - datetime.timedelta(days=7),
             weight="82.0", height="175.0", pulse_rate=72, temperature="97.8",
             bp_systolic=148, bp_diastolic=92,
             appetite="normal", bowel="abnormal", bowel_notes="Constipation, hard stools",
             micturition="normal", sleep_quality="abnormal",
             sleep_notes="Joint pain disturbs sleep",
             diagnostic_data={"prakriti": {
                 "dosha_type": "kapha_vata",
                 "body_frame": "large_heavy",
                 "skin_type": "thick_cool",
                 "digestion": "manda",
                 "mental_tendency": "calm_steady",
                 "notes": "Kapha predominance with Vata aggravation in joints. Ama accumulation evident.",
             }},
             chief_complaints="Bilateral knee pain, morning stiffness, swelling",
             history_of_present_illness="Progressive knee OA. Worse in monsoon. X-ray shows Grade 2 OA.",
             diagnosis="Sandhivata (Osteoarthritis) — Kapha-Vata type"),
        dict(patient=patients[3], conducted_by=user,
             consultation_date=today - datetime.timedelta(days=3),
             weight="52.0", height="158.0", pulse_rate=88, temperature="98.6",
             bp_systolic=108, bp_diastolic=68,
             appetite="abnormal", appetite_notes="Reduced, skips meals when anxious",
             bowel="abnormal", bowel_notes="IBS tendency, alternating pattern",
             micturition="normal", sleep_quality="abnormal",
             sleep_notes="Difficulty falling asleep, racing thoughts",
             diagnostic_data={"prakriti": {
                 "dosha_type": "vata",
                 "body_frame": "thin_light",
                 "skin_type": "dry_rough",
                 "digestion": "vishama",
                 "mental_tendency": "anxious_creative",
                 "notes": "Pure Vata aggravation from sedentary lifestyle and screen time. Prana Vata disturbed.",
             }},
             chief_complaints="Anxiety, palpitations, insomnia, IBS symptoms",
             history_of_present_illness="Anxiety worsening over 2 years. Work-related stress. No prior treatment.",
             diagnosis="Chittodvega (Anxiety) — Vata Prakopa"),
        dict(patient=patients[4], conducted_by=user,
             consultation_date=today - datetime.timedelta(days=10),
             weight="70.0", height="165.0", pulse_rate=68, temperature="97.6",
             bp_systolic=130, bp_diastolic=82,
             appetite="normal", bowel="abnormal", bowel_notes="Constipation",
             micturition="normal", sleep_quality="abnormal",
             sleep_notes="Cannot sleep due to back pain",
             diagnostic_data={"prakriti": {
                 "dosha_type": "vata_kapha",
                 "body_frame": "medium",
                 "skin_type": "dry_rough",
                 "digestion": "manda",
                 "mental_tendency": "calm_steady",
                 "notes": "Chronic Vata aggravation in Asthi dhatu. Kapha secondary involvement.",
             }},
             chief_complaints="Chronic lower back pain, radiating to left leg",
             history_of_present_illness="L4-L5 disc bulge. Pain 7/10. Worse sitting. MRI 6 months ago.",
             diagnosis="Gridhrasi (Sciatica) — Vata type"),
    ]

    for cdata in consult_data:
        c = Consultation.objects.create(clinic=clinic, **cdata)
        consultations.append(c)

    # Prescriptions (English only for Ayurveda)
    rx_data = [
        dict(consultation=consultations[0],
             diet_advice="Avoid sugar, refined carbs, and fried foods. Include bitter gourd, fenugreek, and turmeric. Eat warm, freshly cooked meals.",
             lifestyle_advice="Walk 30 minutes morning and evening. Practice Pranayama (Nadi Shodhana) daily.",
             follow_up_date=today + datetime.timedelta(days=30),
             _meds=[
                 dict(drug_name="Nisha Amalaki Churna", dosage="3g", frequency="BD",
                      duration="45 days", instructions="With warm water before food", sort_order=1),
                 dict(drug_name="Chandraprabha Vati", dosage="2 tablets", frequency="BD",
                      duration="45 days", instructions="After food with warm water", sort_order=2),
                 dict(drug_name="Triphala Churna", dosage="5g", frequency="HS",
                      duration="45 days", instructions="At bedtime with warm water", sort_order=3),
             ]),
        dict(consultation=consultations[1],
             diet_advice="Avoid cold, dry, and raw foods. Favor warm, moist, and grounding foods. Include ghee and sesame oil.",
             lifestyle_advice="Regular sleep schedule. Abhyanga (oil massage) with sesame oil before bath. Avoid fasting.",
             follow_up_date=today + datetime.timedelta(days=21),
             _meds=[
                 dict(drug_name="Pathyadi Kwath", dosage="15ml", frequency="BD",
                      duration="30 days", instructions="With equal warm water, before food", sort_order=1),
                 dict(drug_name="Shirashooladi Vajra Rasa", dosage="1 tablet", frequency="BD",
                      duration="30 days", instructions="With honey after food", sort_order=2),
             ]),
        dict(consultation=consultations[2],
             diet_advice="Avoid cold and heavy foods. Include ginger, turmeric, and warm soups. Reduce dairy intake.",
             lifestyle_advice="Gentle knee exercises. Warm sesame oil massage on knees. Avoid prolonged standing.",
             exercise_advice="Gentle yoga: Virabhadrasana (modified), Utkatasana with support.",
             follow_up_date=today + datetime.timedelta(days=21),
             _meds=[
                 dict(drug_name="Yogaraja Guggulu", dosage="2 tablets", frequency="BD",
                      duration="45 days", instructions="After food with warm water", sort_order=1),
                 dict(drug_name="Mahanarayan Tailam", dosage="10ml", frequency="BD",
                      duration="45 days", instructions="Warm and apply on knees, gentle massage", sort_order=2),
                 dict(drug_name="Dashamoola Kashayam", dosage="15ml", frequency="BD",
                      duration="30 days", instructions="With equal warm water before food", sort_order=3),
             ]),
        dict(consultation=consultations[3],
             diet_advice="Warm, nourishing meals at regular times. Include almonds, warm milk with ashwagandha. Avoid caffeine after 2pm.",
             lifestyle_advice="Digital detox 1 hour before bed. Shirodhara therapy recommended weekly. Abhyanga with Brahmi oil.",
             follow_up_date=today + datetime.timedelta(days=14),
             _meds=[
                 dict(drug_name="Ashwagandha Churna", dosage="3g", frequency="BD",
                      duration="60 days", instructions="With warm milk", sort_order=1),
                 dict(drug_name="Brahmi Vati", dosage="2 tablets", frequency="BD",
                      duration="60 days", instructions="After food", sort_order=2),
                 dict(drug_name="Saraswatarishta", dosage="20ml", frequency="BD",
                      duration="60 days", instructions="With equal water after food", sort_order=3),
             ]),
    ]

    for rxd in rx_data:
        meds = rxd.pop("_meds")
        rx = Prescription.objects.create(clinic=clinic, **rxd)
        for m in meds:
            Medication.objects.create(prescription=rx, **m)


def _seed_siddha(clinic, user):
    """Seed Siddha clinic with Envagai Thervu + Tamil translations."""
    patients = _create_patients(clinic, [
        dict(name="Murugesan Rajan", age=52, gender="male", phone="9876543210",
             address="12, Kamaraj Street, Madurai - 625001", blood_group="B+",
             occupation="Farmer", marital_status="married",
             food_habits="non_vegetarian", activity_level="active",
             allergies="Penicillin",
             _med=[dict(disease="Type 2 Diabetes", duration="8 years", medication="Metformin 500mg"),
                   dict(disease="Hypertension", duration="5 years", medication="Amlodipine 5mg")],
             _fam=[dict(relation="Father", disease="Diabetes", duration="20 years", remarks="Deceased")]),
        dict(name="Lakshmi Devi", age=38, gender="female", phone="9845612378",
             address="34, Anna Nagar, Chennai - 600040", blood_group="O+",
             occupation="Teacher", marital_status="married",
             food_habits="vegetarian", activity_level="moderate",
             menstrual_history="Regular 28-day cycle, mild dysmenorrhea",
             number_of_children=2,
             _med=[dict(disease="PCOD", duration="3 years", medication="")],
             _fam=[dict(relation="Mother", disease="PCOD", duration="10 years", remarks="")]),
        dict(name="Karthik Selvam", age=28, gender="male", phone="8765432109",
             address="7, Gandhi Road, Coimbatore - 641001", blood_group="A+",
             occupation="Software Engineer", marital_status="single",
             food_habits="non_vegetarian", activity_level="sedentary",
             _med=[], _fam=[]),
        dict(name="Saraswathi Natarajan", age=65, gender="female", phone="9123456780",
             address="56, Meenakshi Street, Thanjavur - 613001", blood_group="AB+",
             occupation="Retired", marital_status="widowed",
             food_habits="vegetarian", activity_level="sedentary",
             menstrual_history="Post-menopausal", number_of_children=3,
             allergies="Sulfa drugs",
             _med=[dict(disease="Osteoarthritis", duration="10 years", medication="Diclofenac topical"),
                   dict(disease="Hypothyroidism", duration="12 years", medication="Levothyroxine 50mcg")],
             _fam=[dict(relation="Sister", disease="Hypothyroidism", duration="15 years", remarks="")]),
        dict(name="Dinesh Kumar", age=44, gender="male", phone="7654321098",
             address="23, Nehru Street, Trichy - 620001", blood_group="O-",
             occupation="Business Owner", marital_status="married",
             food_habits="non_vegetarian", activity_level="moderate",
             _med=[dict(disease="Psoriasis", duration="6 years", medication="")],
             _fam=[]),
    ])

    consultations = []
    consult_data = [
        dict(patient=patients[0], conducted_by=user,
             consultation_date=today - datetime.timedelta(days=45),
             weight="72.5", height="168.0", pulse_rate=82, temperature="98.6",
             bp_systolic=145, bp_diastolic=92,
             appetite="normal", bowel="abnormal", bowel_notes="Constipation, 2-day intervals",
             micturition="normal", sleep_quality="abnormal", sleep_notes="Disturbed sleep, wakes at 2am",
             diagnostic_data={"envagai_thervu": {
                 "nadi": "Vatha Pitha predominant",
                 "naa": "Coated tongue, white coating",
                 "niram": "Slightly yellowish",
                 "mozhi": "Normal clarity",
                 "vizhi": "Mild pallor",
             }},
             chief_complaints="Fatigue, excessive thirst, frequent urination",
             history_of_present_illness="Worsening diabetic symptoms. FBS 210 mg/dL.",
             diagnosis="Madhumegam (Prameham) - Vatha-Pitha type"),
        dict(patient=patients[1], conducted_by=user,
             consultation_date=today - datetime.timedelta(days=20),
             weight="58.0", height="157.0", pulse_rate=78, temperature="98.2",
             bp_systolic=110, bp_diastolic=72,
             appetite="abnormal", appetite_notes="Reduced before menstrual cycle",
             bowel="normal", micturition="normal", sleep_quality="abnormal",
             sleep_notes="Insomnia 1 week before cycle",
             diagnostic_data={"envagai_thervu": {
                 "nadi": "Pitha Vatha type",
                 "vizhi": "Slight pallor in conjunctiva",
                 "naa": "Mild redness at edges",
                 "niram": "Normal",
             }},
             chief_complaints="Irregular periods, dysmenorrhea, fatigue",
             history_of_present_illness="PCOD diagnosed 3 years ago. Cycle delayed 2-3 weeks.",
             diagnosis="Vatha-Pitha imbalance causing irregular cycles"),
        dict(patient=patients[2], conducted_by=user,
             consultation_date=today - datetime.timedelta(days=3),
             weight="82.0", height="174.0", pulse_rate=88, temperature="98.6",
             bp_systolic=125, bp_diastolic=82,
             appetite="normal", bowel="abnormal", bowel_notes="Irregular, IBS tendency",
             micturition="normal", sleep_quality="abnormal", sleep_notes="Sleeping 2am-9am, poor quality",
             diagnostic_data={"envagai_thervu": {
                 "nadi": "Pitha dominant, rapid",
                 "naa": "Coated, yellowish tinge",
                 "mei": "Warm to touch, mild sweating",
             }},
             chief_complaints="Lower back pain, neck stiffness, headaches",
             history_of_present_illness="IT professional, 10+ hrs desk work daily.",
             diagnosis="Vatha disorder - sedentary lifestyle. Pitha excess from stress."),
        dict(patient=patients[3], conducted_by=user,
             consultation_date=today - datetime.timedelta(days=14),
             weight="65.5", height="152.0", pulse_rate=72, temperature="97.8",
             bp_systolic=132, bp_diastolic=84,
             appetite="normal", bowel="abnormal", bowel_notes="Constipation, hard stools",
             micturition="normal", sleep_quality="abnormal", sleep_notes="Wakes due to joint pain",
             diagnostic_data={"envagai_thervu": {
                 "nadi": "Vatha Kapha type",
                 "mei": "Cold to touch in joints",
                 "muthiram": "Slightly turbid",
                 "vizhi": "Mild dryness",
             }},
             chief_complaints="Bilateral knee pain, morning stiffness > 30 minutes",
             history_of_present_illness="Worsening bilateral knee OA over 10 years.",
             diagnosis="Vatha predominant Osteoarthritis (Vatha Suronitham)"),
        dict(patient=patients[4], conducted_by=user,
             consultation_date=today - datetime.timedelta(days=5),
             weight="75.0", height="170.0", pulse_rate=76, temperature="98.4",
             bp_systolic=120, bp_diastolic=78,
             appetite="normal", bowel="normal", micturition="normal", sleep_quality="normal",
             diagnostic_data={"envagai_thervu": {
                 "nadi": "Pitha Kapha type",
                 "niram": "Dry, scaly patches on elbows and knees",
                 "mei": "Rough texture at lesion sites",
                 "naa": "Normal",
             }},
             chief_complaints="Scaly patches on elbows and knees, itching",
             history_of_present_illness="Psoriasis for 6 years. Flares with stress. No prior Siddha treatment.",
             diagnosis="Kalanjaga Padai (Psoriasis) - Pitha-Kapha type"),
    ]

    for cdata in consult_data:
        c = Consultation.objects.create(clinic=clinic, **cdata)
        consultations.append(c)

    rx_data = [
        dict(consultation=consultations[0],
             diet_advice="Avoid sugar, white rice. Include bitter gourd, drumstick.",
             diet_advice_ta="சர்க்கரை, வெள்ளை அரிசி தவிர்க்கவும். பாகற்காய், முருங்கை சேர்க்கவும்.",
             lifestyle_advice="Walk 30 mins morning. Avoid stress.",
             lifestyle_advice_ta="காலையில் 30 நிமிடம் நடக்கவும். மன அழுத்தம் தவிர்க்கவும்.",
             follow_up_date=today + datetime.timedelta(days=30),
             _meds=[
                 dict(drug_name="Siddha Chooranam No. 14", dosage="5g", frequency="BD",
                      frequency_tamil="காலை-மாலை", duration="45 days",
                      instructions="Mix with warm water and honey",
                      instructions_ta="வெது நீர் மற்றும் தேனில் கலந்து சாப்பிடவும்", sort_order=1),
                 dict(drug_name="Aavarai Pattai Kashayam", dosage="60ml", frequency="BD",
                      frequency_tamil="காலை-மாலை", duration="45 days",
                      instructions="Before food",
                      instructions_ta="சாப்பிடுவதற்கு முன்பு", sort_order=2),
             ]),
        dict(consultation=consultations[1],
             diet_advice="Avoid cold foods. Include spinach, dates, jaggery.",
             diet_advice_ta="குளிர்ந்த உணவு தவிர்க்கவும். கீரை, பேரீச்சை, வெல்லம் சேர்க்கவும்.",
             lifestyle_advice="Daily yoga. Regular sleep schedule. Warm oil massage.",
             lifestyle_advice_ta="தினமும் யோகா. ஒழுங்கான தூக்கம். வெது எண்ணெய் மசாஜ்.",
             follow_up_date=today + datetime.timedelta(days=45),
             _meds=[
                 dict(drug_name="Ashoka Arishtam", dosage="20ml", frequency="BD",
                      frequency_tamil="காலை-மாலை", duration="60 days",
                      instructions="After food with equal water",
                      instructions_ta="சாப்பிட்ட பின் சம அளவு நீரில்", sort_order=1),
             ]),
        dict(consultation=consultations[3],
             diet_advice="Warm foods only. Turmeric milk at night. Avoid sour foods.",
             diet_advice_ta="வெது உணவு மட்டும். இரவு மஞ்சள் பால். புளிப்பு தவிர்க்கவும்.",
             lifestyle_advice="Warm sesame oil knee massage daily. Avoid cold exposure.",
             lifestyle_advice_ta="தினமும் வெது நல்லெண்ணெய் முழங்கால் மசாஜ்.",
             follow_up_date=today + datetime.timedelta(days=21),
             _meds=[
                 dict(drug_name="Nirgundi Tailam", dosage="10ml", frequency="BD",
                      frequency_tamil="காலை-மாலை", duration="30 days",
                      instructions="Warm and apply on knees",
                      instructions_ta="வெது செய்து முழங்காலில் தடவவும்", sort_order=1),
                 dict(drug_name="Vatari Guggulu", dosage="2 tablets", frequency="BD",
                      frequency_tamil="காலை-மாலை", duration="45 days",
                      instructions="After food with warm water",
                      instructions_ta="சாப்பிட்ட பின் வெது நீரில்", sort_order=2),
             ]),
        dict(consultation=consultations[4],
             diet_advice="Avoid spicy, fermented, and sour foods. Include neem, turmeric in diet.",
             diet_advice_ta="காரம், புளிப்பு, நொதித்த உணவு தவிர்க்கவும். வேம்பு, மஞ்சள் சேர்க்கவும்.",
             lifestyle_advice="Apply coconut oil mixed with neem before bath. Reduce stress.",
             lifestyle_advice_ta="குளிக்கும் முன் தேங்காய் எண்ணெய் வேம்பு கலந்து தடவவும்.",
             follow_up_date=today + datetime.timedelta(days=30),
             _meds=[
                 dict(drug_name="Arakku Thailam", dosage="External", frequency="BD",
                      frequency_tamil="காலை-மாலை", duration="30 days",
                      instructions="Apply on affected areas after bath",
                      instructions_ta="குளித்த பின் பாதிக்கப்பட்ட இடங்களில் தடவவும்", sort_order=1),
                 dict(drug_name="Manjal Karisalai Chooranam", dosage="3g", frequency="BD",
                      frequency_tamil="காலை-மாலை", duration="45 days",
                      instructions="With warm water before food",
                      instructions_ta="வெது நீரில் சாப்பிடுவதற்கு முன்பு", sort_order=2),
             ]),
    ]

    for rxd in rx_data:
        meds = rxd.pop("_meds")
        rx = Prescription.objects.create(clinic=clinic, **rxd)
        for m in meds:
            Medication.objects.create(prescription=rx, **m)


def _seed_homeopathy(clinic, user):
    """Seed Homeopathy clinic with case-taking + potency fields."""
    patients = _create_patients(clinic, [
        dict(name="Anil Mehta", age=42, gender="male", phone="9876543210",
             address="33, Park Street, Kolkata - 700016", blood_group="B+",
             occupation="Accountant", marital_status="married",
             food_habits="non_vegetarian", activity_level="sedentary",
             _med=[dict(disease="Acid Reflux (GERD)", duration="4 years", medication="Omeprazole 20mg")],
             _fam=[dict(relation="Father", disease="Peptic Ulcer", duration="10 years", remarks="")]),
        dict(name="Sneha Reddy", age=35, gender="female", phone="9845612378",
             address="12, Banjara Hills, Hyderabad - 500034", blood_group="A+",
             occupation="School Teacher", marital_status="married",
             food_habits="vegetarian", activity_level="moderate",
             menstrual_history="Regular, heavy flow", number_of_children=1,
             _med=[dict(disease="Chronic Sinusitis", duration="5 years", medication="")],
             _fam=[]),
        dict(name="Rajiv Gupta", age=8, gender="male", phone="8765432109",
             address="45, Dwarka, New Delhi - 110075", blood_group="O+",
             occupation="Student", marital_status="single",
             food_habits="vegetarian", activity_level="active",
             _med=[dict(disease="Recurrent Tonsillitis", duration="3 years", medication="Multiple antibiotics")],
             _fam=[dict(relation="Mother", disease="Allergic Rhinitis", duration="10 years", remarks="")]),
        dict(name="Kavitha Bose", age=55, gender="female", phone="9123456780",
             address="78, Salt Lake, Kolkata - 700064", blood_group="AB+",
             occupation="Homemaker", marital_status="married",
             food_habits="non_vegetarian", activity_level="sedentary",
             menstrual_history="Post-menopausal", number_of_children=2,
             allergies="Dust",
             _med=[dict(disease="Chronic Eczema", duration="8 years", medication="Topical steroids"),
                   dict(disease="Insomnia", duration="3 years", medication="")],
             _fam=[dict(relation="Mother", disease="Eczema", duration="20 years", remarks="")]),
        dict(name="Siddharth Jain", age=30, gender="male", phone="7654321098",
             address="22, Koramangala, Bangalore - 560034", blood_group="O-",
             occupation="Startup Founder", marital_status="single",
             food_habits="non_vegetarian", activity_level="sedentary",
             _med=[dict(disease="IBS", duration="2 years", medication="")],
             _fam=[]),
    ])

    consultations = []
    consult_data = [
        dict(patient=patients[0], conducted_by=user,
             consultation_date=today - datetime.timedelta(days=21),
             weight="85.0", height="170.0", pulse_rate=78, temperature="98.4",
             bp_systolic=130, bp_diastolic=84,
             appetite="normal", bowel="abnormal", bowel_notes="Burning sensation after meals",
             micturition="normal", sleep_quality="abnormal", sleep_notes="Wakes with acid reflux",
             diagnostic_data={"homeopathy_case": {
                 "chief_complaints": [
                     {"complaint": "Burning in stomach", "duration": "4 years",
                      "modalities_worse": "After spicy food, lying down, 2-3 AM",
                      "modalities_better": "Cold drinks (temporarily), sitting up"},
                 ],
                 "mental_generals": {"mood": "Irritable when hungry", "fears": "Health anxiety",
                                     "notes": "Fastidious, critical of others"},
                 "physical_generals": {"thermals": "Warm-blooded, desires open air",
                                       "thirst": "Frequent sips of cold water",
                                       "perspiration": "Offensive sweat",
                                       "notes": "Craves spicy food despite aggravation"},
                 "miasmatic_classification": "psoric",
                 "notes": "Classic Nux Vomica picture - overwork, stimulants, digestive issues",
             }},
             chief_complaints="Burning epigastric pain, acid reflux, nausea after meals",
             history_of_present_illness="GERD for 4 years. On PPI. Wants alternative treatment.",
             diagnosis="Chronic GERD — Psoric miasm"),
        dict(patient=patients[1], conducted_by=user,
             consultation_date=today - datetime.timedelta(days=14),
             weight="60.0", height="162.0", pulse_rate=72, temperature="98.2",
             bp_systolic=112, bp_diastolic=70,
             appetite="normal", bowel="normal", micturition="normal",
             sleep_quality="normal",
             diagnostic_data={"homeopathy_case": {
                 "chief_complaints": [
                     {"complaint": "Nasal congestion and headache", "duration": "5 years",
                      "modalities_worse": "Morning, damp weather, bending forward",
                      "modalities_better": "Open air, warm applications"},
                     {"complaint": "Post-nasal drip", "duration": "3 years",
                      "modalities_worse": "Night, lying down",
                      "modalities_better": "Warm drinks"},
                 ],
                 "mental_generals": {"mood": "Weepy, needs consolation",
                                     "fears": "Darkness, being alone",
                                     "notes": "Yielding disposition, indecisive"},
                 "physical_generals": {"thermals": "Warm-blooded, intolerant of heat",
                                       "thirst": "Thirstless",
                                       "notes": "Craves creamy food, averse to fatty food"},
                 "miasmatic_classification": "sycotic",
                 "notes": "Pulsatilla constitution - mild, yielding, warm-blooded, thirstless",
             }},
             chief_complaints="Chronic sinusitis with nasal congestion, frontal headache",
             history_of_present_illness="Sinusitis 5 years. Multiple antibiotic courses. No lasting relief.",
             diagnosis="Chronic Sinusitis — Sycotic miasm"),
        dict(patient=patients[2], conducted_by=user,
             consultation_date=today - datetime.timedelta(days=7),
             weight="25.0", height="128.0", pulse_rate=92, temperature="99.0",
             bp_systolic=100, bp_diastolic=65,
             appetite="abnormal", appetite_notes="Decreased during fever",
             bowel="normal", micturition="normal",
             sleep_quality="abnormal", sleep_notes="Restless, wants parents nearby",
             diagnostic_data={"homeopathy_case": {
                 "chief_complaints": [
                     {"complaint": "Recurrent tonsillitis", "duration": "3 years",
                      "modalities_worse": "Cold drinks, winter, night",
                      "modalities_better": "Warm drinks, rest"},
                 ],
                 "mental_generals": {"mood": "Obstinate when sick, otherwise cheerful",
                                     "fears": "Dogs, thunderstorms",
                                     "notes": "Bright child, curious, talks a lot"},
                 "physical_generals": {"thermals": "Chilly, sensitive to cold drafts",
                                       "thirst": "Desires cold water despite being chilly",
                                       "perspiration": "Head sweats during sleep",
                                       "notes": "Craves eggs and ice cream"},
                 "miasmatic_classification": "tubercular",
                 "notes": "Tuberculinum/Calc Carb layer. Recurrent infections, head sweat.",
             }},
             chief_complaints="Swollen tonsils, difficulty swallowing, low-grade fever",
             history_of_present_illness="6th episode this year. Previous antibiotic courses gave temporary relief.",
             diagnosis="Recurrent Tonsillitis — Tubercular miasm"),
        dict(patient=patients[3], conducted_by=user,
             consultation_date=today - datetime.timedelta(days=10),
             weight="68.0", height="155.0", pulse_rate=70, temperature="98.0",
             bp_systolic=128, bp_diastolic=80,
             appetite="normal", bowel="normal", micturition="normal",
             sleep_quality="abnormal", sleep_notes="Cannot sleep due to itching",
             diagnostic_data={"homeopathy_case": {
                 "chief_complaints": [
                     {"complaint": "Itchy eczema on hands and feet", "duration": "8 years",
                      "modalities_worse": "Night, warmth of bed, washing",
                      "modalities_better": "Cold applications, open air"},
                     {"complaint": "Insomnia from itching", "duration": "3 years",
                      "modalities_worse": "After midnight, warmth",
                      "modalities_better": "Cool room"},
                 ],
                 "mental_generals": {"mood": "Anxious about health",
                                     "fears": "Disease, being alone",
                                     "notes": "Restless, changes position frequently"},
                 "physical_generals": {"thermals": "Chilly but desires open air",
                                       "thirst": "Sips frequently",
                                       "perspiration": "Scanty",
                                       "notes": "Burning sensation relieved by warmth"},
                 "miasmatic_classification": "psoric",
                 "notes": "Arsenicum Album picture - restless, anxious, fastidious, burning pains relieved by warmth",
             }},
             chief_complaints="Chronic eczema with intense itching, worse at night",
             history_of_present_illness="Eczema for 8 years. Steroid creams provided temporary relief. Rebound worsening.",
             diagnosis="Chronic Eczema — Psoric miasm with suppression history"),
        dict(patient=patients[4], conducted_by=user,
             consultation_date=today - datetime.timedelta(days=3),
             weight="72.0", height="175.0", pulse_rate=82, temperature="98.6",
             bp_systolic=118, bp_diastolic=76,
             appetite="abnormal", appetite_notes="Variable, stress-related eating",
             bowel="abnormal", bowel_notes="Alternating diarrhea and constipation",
             micturition="normal", sleep_quality="abnormal", sleep_notes="Difficulty winding down",
             diagnostic_data={"homeopathy_case": {
                 "chief_complaints": [
                     {"complaint": "Abdominal cramps and bloating", "duration": "2 years",
                      "modalities_worse": "Morning, after eating, stress",
                      "modalities_better": "Bending double, warm applications, passing gas"},
                 ],
                 "mental_generals": {"mood": "Irritable, impatient",
                                     "notes": "Highly ambitious, competitive, anger from contradiction"},
                 "physical_generals": {"thermals": "Chilly",
                                       "thirst": "Normal",
                                       "notes": "Craves stimulants (coffee), spicy food. Sedentary lifestyle."},
                 "miasmatic_classification": "psoric",
                 "notes": "Nux Vomica type - overwork, stimulants, sedentary, GI complaints",
             }},
             chief_complaints="IBS — abdominal cramps, bloating, alternating bowel habits",
             history_of_present_illness="IBS for 2 years. Stress-related. No previous homeopathic treatment.",
             diagnosis="IBS — Psoric miasm, Nux Vomica constitution"),
    ]

    for cdata in consult_data:
        c = Consultation.objects.create(clinic=clinic, **cdata)
        consultations.append(c)

    rx_data = [
        dict(consultation=consultations[0],
             diet_advice="Avoid spicy food, coffee, alcohol. Eat small, frequent meals. No eating 2 hours before bed.",
             lifestyle_advice="Regular meal times. Short walk after meals. Stress management techniques.",
             follow_up_date=today + datetime.timedelta(days=28),
             _meds=[
                 dict(drug_name="Nux Vomica", dosage="4 pellets", frequency="BD",
                      duration="28 days", instructions="Dissolve under tongue, away from food",
                      potency="30C", dilution_scale="C", pellet_count=4, sort_order=1),
                 dict(drug_name="Robinia", dosage="4 pellets", frequency="TDS",
                      duration="14 days", instructions="For acute acidity episodes",
                      potency="6C", dilution_scale="C", pellet_count=4, sort_order=2),
             ]),
        dict(consultation=consultations[1],
             diet_advice="Avoid heavy, fatty foods. Light warm meals preferred. Drink warm water.",
             lifestyle_advice="Steam inhalation with plain water. Nasal irrigation with saline.",
             follow_up_date=today + datetime.timedelta(days=21),
             _meds=[
                 dict(drug_name="Pulsatilla", dosage="4 pellets", frequency="OD",
                      duration="30 days", instructions="Morning, on empty stomach",
                      potency="200C", dilution_scale="C", pellet_count=4, sort_order=1),
                 dict(drug_name="Kali Bichromicum", dosage="4 pellets", frequency="TDS",
                      duration="14 days", instructions="For acute congestion episodes",
                      potency="30C", dilution_scale="C", pellet_count=4, sort_order=2),
             ]),
        dict(consultation=consultations[2],
             diet_advice="Warm, nourishing foods. Avoid ice cream and cold drinks. Include warm soups.",
             lifestyle_advice="Adequate rest. Keep warm. Gargle with warm salt water.",
             follow_up_date=today + datetime.timedelta(days=14),
             _meds=[
                 dict(drug_name="Calcarea Carbonica", dosage="4 pellets", frequency="OD",
                      duration="7 days", instructions="Single dose weekly for 4 weeks",
                      potency="200C", dilution_scale="C", pellet_count=4, sort_order=1),
                 dict(drug_name="Baryta Carbonica", dosage="4 pellets", frequency="BD",
                      duration="21 days", instructions="Dissolve under tongue",
                      potency="30C", dilution_scale="C", pellet_count=4, sort_order=2),
             ]),
        dict(consultation=consultations[3],
             diet_advice="Avoid shellfish, fermented foods. Include fresh fruits and vegetables.",
             lifestyle_advice="Cotton clothing. Keep skin moisturized with natural oils. Cool sleeping environment.",
             follow_up_date=today + datetime.timedelta(days=28),
             _meds=[
                 dict(drug_name="Arsenicum Album", dosage="4 pellets", frequency="BD",
                      duration="30 days", instructions="Dissolve under tongue, 30 min before food",
                      potency="30C", dilution_scale="C", pellet_count=4, sort_order=1),
                 dict(drug_name="Graphites", dosage="4 pellets", frequency="OD",
                      duration="30 days", instructions="At bedtime",
                      potency="200C", dilution_scale="C", pellet_count=4, sort_order=2),
             ]),
    ]

    for rxd in rx_data:
        meds = rxd.pop("_meds")
        rx = Prescription.objects.create(clinic=clinic, **rxd)
        for m in meds:
            Medication.objects.create(prescription=rx, **m)
