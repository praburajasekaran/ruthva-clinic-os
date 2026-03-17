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
  discipline: Discipline;
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

export type RequestOTPRequest = {
  email: string;
};

export type VerifyOTPRequest = {
  email: string;
  code: string;
};

export type SignupRequest = {
  clinic_name: string;
  subdomain: string;
  discipline: Discipline;
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
  is_active: boolean;
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
  is_active: boolean;
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

// ── Discipline ──
export type Discipline =
  | "siddha"
  | "ayurveda"
  | "yoga_naturopathy"
  | "unani"
  | "homeopathy";

// ── Consultation ──
export type DiagnosticData = Record<string, unknown>;

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
  mental_state: string;
  // Discipline-specific diagnostics
  diagnostic_data: DiagnosticData;
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
  medicine?: number | null;
  medicine_id?: number | null;
  medicine_name?: string;
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

// ── Team ──
export type TeamMember = {
  readonly id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_clinic_owner: boolean;
  date_joined: string;
};

export type Invitation = {
  readonly id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  invited_by_name: string;
};

export type InviteMemberRequest = {
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
};

export type InviteDetails = {
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  clinic_name: string;
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

export type LegacyFollowUpItem = {
  queue_type: "legacy";
  legacy_type: "prescription" | "procedure";
  follow_up_date: string | null;
  patient_name: string;
  patient_record_id: string;
  patient_id: number;
  notes: string;
};

export type TherapistWorklistItem = {
  queue_type: "therapist";
  follow_up_date: string | null;
  patient_name: string;
  patient_record_id: string;
  patient_id: number;
  treatment_session_id: number;
  treatment_plan_id: number;
  treatment_block_id: number;
  block_number: number;
  block_start_day: number;
  block_end_day: number;
  day_number: number;
  sequence_number: number;
  completed_days: number;
  pending_days: number;
  procedure_name: string;
  medium_type: "oil" | "powder" | "other";
  medium_name: string;
  instructions: string;
};

export type DoctorActionItem = {
  queue_type: "doctor";
  follow_up_date: string | null;
  patient_name: string;
  patient_record_id: string;
  patient_id: number;
  doctor_action_task_id: number;
  treatment_plan_id: number;
  treatment_block_id: number;
  block_number: number;
  block_start_day: number;
  block_end_day: number;
  completed_days: number;
  pending_days: number;
  task_type: "block_completed" | "review_requested" | "plan_completed";
  task_status: "open" | "resolved";
  total_days: number;
  plan_status: "draft" | "active" | "completed" | "cancelled";
  replan_required: boolean;
};

export type FollowUpQueueItem =
  | LegacyFollowUpItem
  | TherapistWorklistItem
  | DoctorActionItem;

export type FollowUpsResponse = {
  items: FollowUpQueueItem[];
  meta: {
    tab: "all" | "therapist" | "doctor";
    status: "open" | "resolved";
    counts: {
      legacy: number;
      therapist: number;
      doctor: number;
      total: number;
    };
  };
};

// ── Data Portability ──
export type ImportPreviewRow = {
  line: number;
  errors: string[];
  raw?: Record<string, string>;
  [key: string]: unknown;
};

export type ImportPreviewResult = {
  valid: boolean;
  total_rows?: number;
  error_count?: number;
  preview?: ImportPreviewRow[];
  errors?: ImportPreviewRow[];
  error?: string;
};

export type ImportConfirmResult = {
  created: number;
  skipped: number;
  errors: ImportPreviewRow[];
};

// ── Treatment Plans ──
export type MediumType = "oil" | "powder" | "other";

export type SessionFeedbackRead = {
  readonly id: number;
  completion_status: "done" | "not_done";
  response_score: number;
  notes: string;
  review_requested: boolean;
  created_at: string;
};

export type TreatmentSession = {
  readonly id: number;
  day_number: number;
  sequence_number: number;
  session_date: string;
  procedure_name: string;
  medium_type: MediumType;
  medium_name: string;
  instructions: string;
  execution_status: "planned" | "done" | "not_done";
};

export type TreatmentSessionWithFeedback = TreatmentSession & {
  feedback: SessionFeedbackRead | null;
};

export type TreatmentBlock = {
  readonly id: number;
  block_number: number;
  start_day_number: number;
  end_day_number: number;
  start_date: string;
  end_date: string;
  status: "planned" | "in_progress" | "completed";
  replan_required: boolean;
  completed_at: string | null;
  sessions: TreatmentSession[];
};

export type TreatmentPlanStatus = "draft" | "active" | "completed" | "cancelled";

export type TreatmentPlan = {
  readonly id: number;
  prescription: number;
  total_days: number;
  status: TreatmentPlanStatus;
  patient_name: string;
  patient_record_id: string;
  patient_id: number;
  blocks: TreatmentBlock[];
  readonly created_at: string;
  readonly updated_at: string;
};

export type TreatmentPlanListItem = {
  readonly id: number;
  prescription: number;
  total_days: number;
  status: TreatmentPlanStatus;
  patient_name: string;
  patient_record_id: string;
  patient_id: number;
  block_count: number;
  readonly created_at: string;
};

export type SessionPlanEntry = {
  entry_type: "single_day" | "day_range";
  day_number?: number;
  start_day_number?: number;
  end_day_number?: number;
  procedure_name: string;
  medium_type: MediumType;
  medium_name: string;
  instructions: string;
};

export type TreatmentPlanCreatePayload = {
  prescription: number;
  total_days: number;
  block: {
    start_day_number: number;
    end_day_number: number;
    start_date: string;
    entries: SessionPlanEntry[];
  };
};

// ── Pharmacy ──
export type MedicineCategory =
  | "kashayam" | "choornam" | "lehyam" | "tailam"
  | "arishtam" | "asavam" | "gulika" | "parpam"
  | "chenduram" | "nei" | "tablet" | "capsule"
  | "syrup" | "external" | "other";

export type DosageForm =
  | "ml" | "g" | "tablets" | "capsules"
  | "drops" | "pinch" | "spoon" | "other";

export type Medicine = {
  readonly id: number;
  name: string;
  name_ta: string;
  category: MedicineCategory;
  dosage_form: DosageForm;
  unit_price: string;
  current_stock: number;
  reorder_level: number;
  is_active: boolean;
  is_low_stock: boolean;
  readonly created_at?: string;
  readonly updated_at?: string;
  recent_stock_entries?: StockEntry[];
};

export type StockEntry = {
  readonly id: number;
  entry_type: "purchase" | "adjustment" | "dispense";
  quantity_change: number;
  balance_after: number;
  notes: string;
  actor_name: string;
  readonly created_at: string;
};

export type DispensingItem = {
  readonly id: number;
  medicine: number;
  drug_name_snapshot: string;
  quantity_dispensed: number;
  unit_price_snapshot: string;
};

export type DispensingRecord = {
  readonly id: number;
  prescription: number;
  dispensed_by_name: string;
  notes: string;
  items: DispensingItem[];
  readonly created_at: string;
};

export type UsageDashboard = {
  active_patients: number;
  patient_limit: number;
  usage_percentage: number;
  medicines_count: number;
  low_stock_count: number;

};