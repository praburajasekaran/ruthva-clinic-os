// ── Auth ──
export type UserRole = "doctor" | "therapist" | "admin";

export type User = {
  readonly id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_clinic_owner: boolean;
  clinic: ClinicInfo | null;
};

export type ClinicInfo = {
  readonly id: number;
  name: string;
  subdomain: string;
  discipline: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string;
  paper_size: string;
  primary_color: string;
  tagline: string;
  is_active: boolean;
};

export type AuthTokens = {
  access: string;
  refresh: string;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type SignupRequest = {
  clinic_name: string;
  subdomain: string;
  discipline: string;
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
};

export type SignupResponse = AuthTokens & {
  user: User;
};

// ── Domain unions ──
export type Gender = "male" | "female" | "other";
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type FoodHabit = "vegetarian" | "non_vegetarian" | "vegan";
export type ActivityLevel = "sedentary" | "moderate" | "active";
export type MaritalStatus = "single" | "married" | "divorced" | "widowed";
export type MedicationFrequency = "OD" | "BD" | "TDS" | "QID" | "SOS" | "HS";
export type AssessmentValue = "normal" | "abnormal" | "";

// ── API envelope ──
export type PaginatedResponse<T> = {
  readonly count: number;
  readonly next: string | null;
  readonly previous: string | null;
  readonly results: T[];
};

export type ApiError = {
  readonly detail?: string;
  readonly non_field_errors?: string[];
  readonly [field: string]: string[] | string | undefined;
};

// ── Patient ──
export type Patient = {
  readonly id: number;
  readonly record_id: string;
  name: string;
  age: number;
  date_of_birth: string | null;
  readonly calculated_age: number;
  gender: Gender;
  phone: string;
  whatsapp_number: string;
  email: string;
  address: string;
  blood_group: BloodGroup | "";
  occupation: string;
  marital_status: MaritalStatus | "";
  referred_by: string;
  allergies: string;
  food_habits: FoodHabit | "";
  activity_level: ActivityLevel | "";
  menstrual_history: string;
  number_of_children: number | null;
  vaccination_records: string;
  medical_history: MedicalHistory[];
  family_history: FamilyHistory[];
  readonly created_at: string;
  readonly updated_at: string;
};

export type PatientListItem = {
  readonly id: number;
  readonly record_id: string;
  name: string;
  age: number;
  date_of_birth: string | null;
  readonly calculated_age: number;
  gender: Gender;
  phone: string;
  consultation_count: number;
  last_visit: string | null;
  readonly created_at: string;
};

export type MedicalHistory = {
  readonly id: number;
  disease: string;
  duration: string;
  medication: string;
};

export type FamilyHistory = {
  readonly id: number;
  relation: string;
  disease: string;
  duration: string;
  remarks: string;
};

export type PatientFormState = {
  name: string;
  age: string;
  date_of_birth: string;
  gender: Gender | "";
  phone: string;
  whatsapp_number: string;
  email: string;
  address: string;
  blood_group: BloodGroup | "";
  occupation: string;
  marital_status: MaritalStatus | "";
  referred_by: string;
  allergies: string;
  food_habits: FoodHabit | "";
  activity_level: ActivityLevel | "";
  menstrual_history: string;
  number_of_children: string;
  vaccination_records: string;
  medical_history: Omit<MedicalHistory, "id">[];
  family_history: Omit<FamilyHistory, "id">[];
};

// ── Consultation ──
export type Consultation = {
  readonly id: number;
  patient: number;
  patient_name?: string;
  // Vitals
  weight: string | null;
  height: string | null;
  pulse_rate: number | null;
  temperature: string | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  // General assessment
  appetite: AssessmentValue;
  appetite_notes: string;
  bowel: AssessmentValue;
  bowel_notes: string;
  micturition: AssessmentValue;
  micturition_notes: string;
  sleep_quality: AssessmentValue;
  sleep_notes: string;
  // Envagai Thervu
  naa: string;
  niram: string;
  mozhi: string;
  vizhi: string;
  nadi: string;
  mei: string;
  muthiram: string;
  varmam: string;
  mental_state: string;
  // Diagnosis
  chief_complaints: string;
  history_of_present_illness: string;
  diagnosis: string;
  icd_code: string;
  consultation_date: string;
  readonly created_at: string;
  readonly updated_at: string;
};

// ── Prescription ──
export type Prescription = {
  readonly id: number;
  consultation: number;
  medications: Medication[];
  procedures: ProcedureEntry[];
  diet_advice: string;
  diet_advice_ta: string;
  lifestyle_advice: string;
  lifestyle_advice_ta: string;
  exercise_advice: string;
  exercise_advice_ta: string;
  follow_up_date: string | null;
  follow_up_notes: string;
  follow_up_notes_ta: string;
  readonly created_at: string;
  readonly updated_at: string;
};

export type Medication = {
  readonly id: number;
  drug_name: string;
  dosage: string;
  frequency: MedicationFrequency;
  frequency_tamil: string;
  duration: string;
  instructions: string;
  instructions_ta: string;
  sort_order: number;
};

export type ProcedureEntry = {
  readonly id: number;
  name: string;
  details: string;
  duration: string;
};

// ── Dashboard ──
export type RecentPatient = {
  id: number;
  name: string;
  record_id: string;
  age: number;
  date_of_birth: string | null;
  last_visit: string;
  latest_complaint: string | null;
};

export type DashboardStats = {
  today_patients: number;
  week_patients: number;
  pending_prescriptions: number;
  follow_ups_due: number;
  total_patients: number;
  recent_patients: RecentPatient[];
};
