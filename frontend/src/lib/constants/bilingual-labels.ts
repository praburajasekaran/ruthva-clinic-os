// Section headers used across consultation, prescription, and print views
export const SECTION_LABELS = {
  vitals: { en: "Vitals", ta: "\u0B89\u0B9F\u0BB2\u0BCD \u0B85\u0BB3\u0BB5\u0BC1\u0B95\u0BB3\u0BCD" },
  generalAssessment: { en: "General Assessment", ta: "\u0BAA\u0BCA\u0BA4\u0BC1 \u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC0\u0B9F\u0BC1" },
  envagaiThervu: { en: "Envagai Thervu", ta: "\u0B8E\u0BA3\u0BCD\u0BB5\u0B95\u0BC8\u0BA4\u0BCD \u0BA4\u0BC7\u0BB0\u0BCD\u0BB5\u0BC1" },
  chiefComplaints: { en: "Chief Complaints", ta: "\u0BAE\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BAF \u0B95\u0BC1\u0BB1\u0BC8\u0B95\u0BB3\u0BCD" },
  diagnosis: { en: "Diagnosis", ta: "\u0BA8\u0BCB\u0BAF\u0BCD \u0B95\u0BA3\u0BCD\u0B9F\u0BB1\u0BBF\u0BA4\u0BB2\u0BCD" },
  medications: { en: "Medications", ta: "\u0BAE\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BC1\u0B95\u0BB3\u0BCD" },
  procedures: { en: "Procedures", ta: "\u0B9A\u0BBF\u0B95\u0BBF\u0B9A\u0BCD\u0B9A\u0BC8\u0B95\u0BB3\u0BCD" },
  advice: { en: "Advice", ta: "\u0B85\u0BB1\u0BBF\u0BB5\u0BC1\u0BB0\u0BC8" },
  followUp: { en: "Follow-up", ta: "\u0BAE\u0BB1\u0BC1 \u0B86\u0BAF\u0BCD\u0BB5\u0BC1" },
  patientDetails: { en: "Patient Details", ta: "\u0BA8\u0BCB\u0BAF\u0BBE\u0BB3\u0BBF \u0BB5\u0BBF\u0BB5\u0BB0\u0B99\u0BCD\u0B95\u0BB3\u0BCD" },
} as const;

// Vitals field labels
export const VITALS_LABELS = {
  weight: { en: "Weight", ta: "\u0B8E\u0B9F\u0BC8" },
  height: { en: "Height", ta: "\u0B89\u0BAF\u0BB0\u0BAE\u0BCD" },
  pulseRate: { en: "Pulse Rate", ta: "\u0BA8\u0BBE\u0B9F\u0BBF \u0BB5\u0BBF\u0B95\u0BBF\u0BA4\u0BAE\u0BCD" },
  temperature: { en: "Temperature", ta: "\u0BB5\u0BC6\u0BAA\u0BCD\u0BAA\u0BA8\u0BBF\u0BB2\u0BC8" },
  bpSystolic: { en: "BP Systolic", ta: "\u0B87\u0BB0\u0BA4\u0BCD\u0BA4 \u0B85\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BAE\u0BCD (\u0BAE\u0BC7\u0BB2\u0BCD)" },
  bpDiastolic: { en: "BP Diastolic", ta: "\u0B87\u0BB0\u0BA4\u0BCD\u0BA4 \u0B85\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BAE\u0BCD (\u0B95\u0BC0\u0BB4\u0BCD)" },
} as const;

// General assessment labels
export const ASSESSMENT_LABELS = {
  appetite: { en: "Appetite", ta: "\u0BAA\u0B9A\u0BBF" },
  bowel: { en: "Bowel", ta: "\u0BAE\u0BB2\u0BAE\u0BCD" },
  micturition: { en: "Micturition", ta: "\u0B9A\u0BBF\u0BB1\u0BC1\u0BA8\u0BC0\u0BB0\u0BCD" },
  sleep: { en: "Sleep", ta: "\u0BA4\u0BC2\u0B95\u0BCD\u0B95\u0BAE\u0BCD" },
} as const;

// Medication field labels
export const MEDICATION_LABELS = {
  drugName: { en: "Drug Name", ta: "\u0BAE\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BBF\u0BA9\u0BCD \u0BAA\u0BC6\u0BAF\u0BB0\u0BCD" },
  dosage: { en: "Dosage", ta: "\u0B85\u0BB3\u0BB5\u0BC1" },
  frequency: { en: "Frequency", ta: "\u0B8E\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0BB5\u0BC7\u0BB3\u0BC8" },
  timing: { en: "Timing", ta: "\u0BA8\u0BC7\u0BB0\u0BAE\u0BCD" },
  duration: { en: "Duration", ta: "\u0B95\u0BBE\u0BB2\u0BAE\u0BCD" },
  instructions: { en: "Instructions", ta: "\u0BB5\u0BB4\u0BBF\u0BAE\u0BC1\u0BB1\u0BC8\u0B95\u0BB3\u0BCD" },
} as const;

// Advice section labels
export const ADVICE_LABELS = {
  diet: { en: "Diet", ta: "\u0B89\u0BA3\u0BB5\u0BC1\u0B95\u0BCD \u0B95\u0B9F\u0BCD\u0B9F\u0BC1\u0BAA\u0BCD\u0BAA\u0BBE\u0B9F\u0BC1" },
  lifestyle: { en: "Lifestyle", ta: "\u0BB5\u0BBE\u0BB4\u0BCD\u0B95\u0BCD\u0B95\u0BC8\u0BAE\u0BC1\u0BB1\u0BC8" },
  exercise: { en: "Exercise", ta: "\u0B89\u0B9F\u0BB1\u0BCD\u0BAA\u0BAF\u0BBF\u0BB1\u0BCD\u0B9A\u0BBF" },
} as const;

// Print-specific headers (uppercase English for formal print output)
export const PRINT_LABELS = {
  rxMedications: { en: "Rx MEDICATIONS", ta: "\u0BAE\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BC1\u0B95\u0BB3\u0BCD" },
  diagnosis: { en: "DIAGNOSIS", ta: "\u0BA8\u0BCB\u0BAF\u0BCD \u0B95\u0BA3\u0BCD\u0B9F\u0BB1\u0BBF\u0BA4\u0BB2\u0BCD" },
  procedures: { en: "PROCEDURES", ta: "\u0B9A\u0BBF\u0B95\u0BBF\u0B9A\u0BCD\u0B9A\u0BC8\u0B95\u0BB3\u0BCD" },
  advice: { en: "ADVICE", ta: "\u0B85\u0BB1\u0BBF\u0BB5\u0BC1\u0BB0\u0BC8" },
  followUp: { en: "FOLLOW-UP", ta: "\u0BAE\u0BB1\u0BC1 \u0B86\u0BAF\u0BCD\u0BB5\u0BC1" },
  patientDetails: { en: "PATIENT DETAILS", ta: "\u0BA8\u0BCB\u0BAF\u0BBE\u0BB3\u0BBF \u0BB5\u0BBF\u0BB5\u0BB0\u0B99\u0BCD\u0B95\u0BB3\u0BCD" },
} as const;
