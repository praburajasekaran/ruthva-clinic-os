export const ENVAGAI_OPTIONS = {
  naa: {
    label: "Naa",
    labelTamil: "\u0BA8\u0BBE",
    translation: "Tongue",
    fields: {
      color: ["Pink", "Pale", "Red", "Yellow-coated", "White-coated", "Bluish"],
      coating: ["None", "Thin white", "Thick white", "Yellow", "Brown"],
      texture: ["Smooth", "Rough", "Fissured", "Ulcerated"],
      moisture: ["Normal", "Dry", "Excessive"],
    },
  },
  niram: {
    label: "Niram",
    labelTamil: "\u0BA8\u0BBF\u0BB1\u0BAE\u0BCD",
    translation: "Complexion",
    fields: {
      skin_color: ["Normal", "Pale", "Yellowish", "Darkened", "Flushed"],
      pallor: ["Absent", "Present"],
      jaundice: ["Absent", "Present"],
    },
  },
  mozhi: {
    label: "Mozhi",
    labelTamil: "\u0BAE\u0BCA\u0BB4\u0BBF",
    translation: "Speech",
    fields: {
      clarity: ["Clear", "Slurred", "Hoarse", "Nasal", "Weak"],
      tone: ["Normal", "High-pitched", "Low-pitched"],
      speed: ["Normal", "Fast", "Slow"],
    },
  },
  vizhi: {
    label: "Vizhi",
    labelTamil: "\u0BB5\u0BBF\u0BB4\u0BBF",
    translation: "Eyes",
    fields: {
      color: ["Normal", "Pale", "Yellowish", "Reddish", "Bluish"],
      moisture: ["Normal", "Dry", "Watery", "Excessive tearing"],
      pupil: ["Normal", "Dilated", "Constricted"],
    },
  },
  nadi: {
    label: "Nadi",
    labelTamil: "\u0BA8\u0BBE\u0B9F\u0BBF",
    translation: "Pulse",
    fields: {
      type: ["Vatham", "Pitham", "Kapham", "Thondham"],
      rate: ["Normal", "Fast", "Slow", "Irregular"],
      strength: ["Strong", "Moderate", "Weak", "Thready"],
    },
  },
  mei: {
    label: "Mei",
    labelTamil: "\u0BAE\u0BC6\u0BAF\u0BCD",
    translation: "Touch/Body",
    fields: {
      temperature: ["Normal", "Hot", "Cold", "Varying"],
      texture: ["Normal", "Dry", "Moist", "Rough", "Oily"],
      tenderness: ["None", "Localized", "Generalized"],
    },
  },
  muthiram: {
    label: "Muthiram",
    labelTamil: "\u0BAE\u0BC2\u0BA4\u0BCD\u0BA4\u0BBF\u0BB0\u0BAE\u0BCD",
    translation: "Urine",
    fields: {
      color: ["Pale yellow", "Dark yellow", "Reddish", "Brownish", "Clear"],
      odor: ["Normal", "Strong", "Foul", "Sweet"],
      neikuri: ["Spreads like snake (Vatham)", "Spreads like ring (Pitham)", "Stays as pearl (Kapham)"],
    },
  },
  varmam: {
    label: "Varmam",
    labelTamil: "\u0BB5\u0BB0\u0BCD\u0BAE\u0BAE\u0BCD",
    translation: "Vital Points",
    fields: {
      sensitivity: ["Normal", "Tender", "Painful", "Numb"],
      energy_flow: ["Normal", "Blocked", "Excessive", "Deficient"],
    },
  },
} as const;

export type EnvagaiTool = keyof typeof ENVAGAI_OPTIONS;

export const FREQUENCY_OPTIONS = [
  { value: "OD" as const, label: "OD \u2014 Once daily", tamil: "\u0B92\u0BB0\u0BC1 \u0BB5\u0BC7\u0BB3\u0BC8" },
  { value: "BD" as const, label: "BD \u2014 Twice daily", tamil: "\u0B87\u0BB0\u0BC1 \u0BB5\u0BC7\u0BB3\u0BC8 (\u0B95\u0BBE\u0BB2\u0BC8/\u0BAE\u0BBE\u0BB2\u0BC8)" },
  { value: "TDS" as const, label: "TDS \u2014 Thrice daily", tamil: "\u0BAE\u0BC2\u0BA9\u0BCD\u0BB1\u0BC1 \u0BB5\u0BC7\u0BB3\u0BC8" },
  { value: "QID" as const, label: "QID \u2014 Four times", tamil: "\u0BA8\u0BBE\u0BA9\u0BCD\u0B95\u0BC1 \u0BB5\u0BC7\u0BB3\u0BC8" },
  { value: "SOS" as const, label: "SOS \u2014 As needed", tamil: "\u0BA4\u0BC7\u0BB5\u0BC8\u0BAA\u0BCD\u0BAA\u0B9F\u0BC1\u0BAE\u0BCD\u0BAA\u0BCB\u0BA4\u0BC1" },
  { value: "HS" as const, label: "HS \u2014 At bedtime", tamil: "\u0BAA\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BC1\u0BAE\u0BCD \u0BAE\u0BC1\u0BA9\u0BCD" },
] as const;

export const TIMING_OPTIONS = [
  { value: "before_food" as const, label: "Before food", tamil: "\u0B89\u0BA3\u0BB5\u0BC1\u0B95\u0BCD\u0B95\u0BC1 \u0BAE\u0BC1\u0BA9\u0BCD" },
  { value: "after_food" as const, label: "After food", tamil: "\u0B89\u0BA3\u0BB5\u0BC1\u0B95\u0BCD\u0B95\u0BC1\u0BAA\u0BCD \u0BAA\u0BBF\u0BA9\u0BCD" },
  { value: "with_food" as const, label: "With food", tamil: "\u0B89\u0BA3\u0BB5\u0BC1\u0B9F\u0BA9\u0BCD" },
  { value: "empty_stomach" as const, label: "Empty stomach", tamil: "\u0BB5\u0BC6\u0BB1\u0BC1\u0BAE\u0BCD \u0BB5\u0BAF\u0BBF\u0BB1\u0BCD\u0BB1\u0BBF\u0BB2\u0BCD" },
] as const;

export const DOSAGE_UNITS = [
  "ml",
  "g",
  "mg",
  "tablets",
  "drops",
  "pinch",
  "teaspoon",
  "tablespoon",
] as const;

export const GENDER_OPTIONS = [
  { value: "male" as const, label: "Male" },
  { value: "female" as const, label: "Female" },
  { value: "other" as const, label: "Other" },
] as const;

export const BLOOD_GROUP_OPTIONS = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
] as const;

export const FOOD_HABIT_OPTIONS = [
  { value: "vegetarian" as const, label: "Vegetarian" },
  { value: "non_vegetarian" as const, label: "Non-Vegetarian" },
  { value: "vegan" as const, label: "Vegan" },
] as const;

export const ACTIVITY_LEVEL_OPTIONS = [
  { value: "sedentary" as const, label: "Sedentary" },
  { value: "moderate" as const, label: "Moderate" },
  { value: "active" as const, label: "Active" },
] as const;

export const MARITAL_STATUS_OPTIONS = [
  { value: "single" as const, label: "Single" },
  { value: "married" as const, label: "Married" },
  { value: "widowed" as const, label: "Widowed" },
  { value: "divorced" as const, label: "Divorced" },
] as const;
