"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { DynamicTable } from "@/components/forms/DynamicTable";
import { useMutation } from "@/hooks/useMutation";
import api from "@/lib/api";
import type { Patient, PatientFormState } from "@/lib/types";
import {
  GENDER_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  FOOD_HABIT_OPTIONS,
  ACTIVITY_LEVEL_OPTIONS,
  MARITAL_STATUS_OPTIONS,
} from "@/lib/constants/envagai-options";

const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

const emptyForm: PatientFormState = {
  name: "",
  age: "",
  date_of_birth: "",
  gender: "",
  phone: "",
  email: "",
  address: "",
  blood_group: "",
  occupation: "",
  marital_status: "",
  referred_by: "",
  allergies: "",
  food_habits: "",
  activity_level: "",
  menstrual_history: "",
  number_of_children: "",
  vaccination_records: "",
  medical_history: [],
  family_history: [],
};

type PhoneMatch = { id: number; name: string; record_id: string };

type PatientFormProps = {
  mode?: "create" | "edit";
  patientId?: number;
  initialData?: Partial<PatientFormState>;
};

function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function PatientForm({ mode = "create", patientId, initialData }: PatientFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [form, setForm] = useState<PatientFormState>(() =>
    initialData ? { ...emptyForm, ...initialData } : emptyForm,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [phoneMatches, setPhoneMatches] = useState<PhoneMatch[]>([]);
  const phoneCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dobControlsAge = !!form.date_of_birth;

  const { mutate, isLoading, error: mutationError } = useMutation<unknown, Patient>(
    isEdit ? "patch" : "post",
    isEdit ? `/patients/${patientId}/` : "/patients/",
  );

  function updateField<K extends keyof PatientFormState>(
    field: K,
    value: PatientFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (serverErrors[field]) {
      setServerErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleDobChange(value: string) {
    updateField("date_of_birth", value);
    if (value) {
      const age = calculateAge(value);
      if (age >= 0 && age <= 150) {
        setForm((prev) => ({ ...prev, date_of_birth: value, age: String(age) }));
      }
    }
  }

  // Debounced phone duplicate check
  useEffect(() => {
    if (phoneCheckTimer.current) clearTimeout(phoneCheckTimer.current);
    if (form.phone.length !== 10 || !INDIAN_PHONE_REGEX.test(form.phone)) {
      setPhoneMatches([]);
      return;
    }
    phoneCheckTimer.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ phone: form.phone });
        if (isEdit && patientId) params.set("exclude", String(patientId));
        const res = await api.get<PhoneMatch[]>(`/patients/check_phone/?${params}`);
        setPhoneMatches(res.data);
      } catch {
        // Silently ignore — warning is informational
      }
    }, 500);
    return () => {
      if (phoneCheckTimer.current) clearTimeout(phoneCheckTimer.current);
    };
  }, [form.phone, isEdit, patientId]);

  // Parse server errors when mutation fails
  useEffect(() => {
    if (!mutationError) return;
    const fieldErrors: Record<string, string> = {};
    for (const [key, val] of Object.entries(mutationError)) {
      if (key === "detail" || key === "non_field_errors") continue;
      if (Array.isArray(val)) fieldErrors[key] = val[0];
      else if (typeof val === "string") fieldErrors[key] = val;
    }
    setServerErrors(fieldErrors);
  }, [mutationError]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.age.trim()) errs.age = "Age is required";
    else if (isNaN(Number(form.age)) || Number(form.age) < 0 || Number(form.age) > 150)
      errs.age = "Enter a valid age (0-150)";
    if (!form.gender) errs.gender = "Gender is required";
    if (!form.phone.trim()) errs.phone = "Phone number is required";
    else if (!INDIAN_PHONE_REGEX.test(form.phone))
      errs.phone = "Enter a valid 10-digit Indian mobile number";
    if (form.date_of_birth) {
      const dobDate = new Date(form.date_of_birth);
      if (dobDate > new Date()) errs.date_of_birth = "Date of birth cannot be in the future";
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstErrorField = document.querySelector('[aria-invalid="true"]');
      if (firstErrorField instanceof HTMLElement) firstErrorField.focus();
      return false;
    }
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setServerErrors({});

    const payload = {
      ...form,
      age: Number(form.age),
      date_of_birth: form.date_of_birth || null,
      number_of_children: form.number_of_children
        ? Number(form.number_of_children)
        : null,
    };

    const result = await mutate(payload);
    if (result) {
      router.push(`/patients/${isEdit ? patientId : result.id}`);
    }
  }

  // Merge client + server errors for display
  const allErrors = { ...serverErrors, ...errors };
  const nonFieldError =
    mutationError?.detail ||
    (mutationError?.non_field_errors
      ? (Array.isArray(mutationError.non_field_errors)
          ? mutationError.non_field_errors[0]
          : mutationError.non_field_errors)
      : null);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Non-field server errors */}
      {nonFieldError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {nonFieldError}
        </div>
      )}

      {/* Basic Information */}
      <FormSection title="Basic Information" id="basic-info">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full Name" required error={allErrors.name}>
            {(props) => (
              <Input
                {...props}
                autoFocus
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Patient full name"
                hasError={!!allErrors.name}
              />
            )}
          </FormField>
          <FormField label="Date of Birth" error={allErrors.date_of_birth}>
            {(props) => (
              <Input
                {...props}
                type="date"
                value={form.date_of_birth}
                onChange={(e) => handleDobChange(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                hasError={!!allErrors.date_of_birth}
              />
            )}
          </FormField>
          <FormField label="Age" required error={allErrors.age}>
            {(props) => (
              <Input
                {...props}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.age}
                onChange={(e) => {
                  if (!dobControlsAge) updateField("age", e.target.value);
                }}
                placeholder={dobControlsAge ? "Calculated from DOB" : "Age in years"}
                readOnly={dobControlsAge}
                hasError={!!allErrors.age}
                className={dobControlsAge ? "bg-gray-50 text-gray-500" : ""}
              />
            )}
          </FormField>
          <FormField label="Gender" required error={allErrors.gender}>
            {(props) => (
              <Select
                {...props}
                value={form.gender}
                onChange={(e) => updateField("gender", e.target.value as PatientFormState["gender"])}
                hasError={!!allErrors.gender}
              >
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <div>
            <FormField label="Phone" required error={allErrors.phone}>
              {(props) => (
                <Input
                  {...props}
                  type="tel"
                  inputMode="tel"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="10-digit mobile number"
                  hasError={!!allErrors.phone}
                />
              )}
            </FormField>
            {phoneMatches.length > 0 && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">
                      This phone number is already registered for:
                    </p>
                    <ul className="mt-1 space-y-1">
                      {phoneMatches.map((match) => (
                        <li key={match.id}>
                          <Link
                            href={`/patients/${match.id}`}
                            className="font-medium text-amber-900 underline hover:text-amber-700"
                            target="_blank"
                          >
                            {match.name}
                          </Link>{" "}
                          ({match.record_id})
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-xs text-amber-600">
                      If this is a different person (e.g., family member), you can continue.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <FormField label="Email" error={allErrors.email}>
            {(props) => (
              <Input
                {...props}
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="email@example.com"
              />
            )}
          </FormField>
          <FormField label="Occupation">
            {(props) => (
              <Input
                {...props}
                value={form.occupation}
                onChange={(e) => updateField("occupation", e.target.value)}
                placeholder="Occupation"
              />
            )}
          </FormField>
        </div>
        <div className="mt-4">
          <FormField label="Address">
            {(props) => (
              <textarea
                {...props}
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Full address"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
              />
            )}
          </FormField>
        </div>
      </FormSection>

      {/* Clinical Information */}
      <FormSection title="Clinical Information" id="clinical-info">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Blood Group">
            {(props) => (
              <Select
                {...props}
                value={form.blood_group}
                onChange={(e) => updateField("blood_group", e.target.value as PatientFormState["blood_group"])}
              >
                <option value="">Select blood group</option>
                {BLOOD_GROUP_OPTIONS.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField label="Marital Status">
            {(props) => (
              <Select
                {...props}
                value={form.marital_status}
                onChange={(e) => updateField("marital_status", e.target.value as PatientFormState["marital_status"])}
              >
                <option value="">Select status</option>
                {MARITAL_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField label="Food Habits">
            {(props) => (
              <Select
                {...props}
                value={form.food_habits}
                onChange={(e) => updateField("food_habits", e.target.value as PatientFormState["food_habits"])}
              >
                <option value="">Select food habits</option>
                {FOOD_HABIT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField label="Activity Level">
            {(props) => (
              <Select
                {...props}
                value={form.activity_level}
                onChange={(e) => updateField("activity_level", e.target.value as PatientFormState["activity_level"])}
              >
                <option value="">Select level</option>
                {ACTIVITY_LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField label="Referred By">
            {(props) => (
              <Input
                {...props}
                value={form.referred_by}
                onChange={(e) => updateField("referred_by", e.target.value)}
                placeholder="Referring doctor or source"
              />
            )}
          </FormField>
        </div>
        <div className="mt-4">
          <FormField label="Known Allergies">
            {(props) => (
              <textarea
                {...props}
                value={form.allergies}
                onChange={(e) => updateField("allergies", e.target.value)}
                placeholder="List any known allergies"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
              />
            )}
          </FormField>
        </div>
      </FormSection>

      {/* Menstrual History - only for female patients */}
      {form.gender === "female" && (
        <FormSection title="Menstrual / Obstetric History" id="menstrual-history">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Menstrual History">
              {(props) => (
                <textarea
                  {...props}
                  value={form.menstrual_history}
                  onChange={(e) => updateField("menstrual_history", e.target.value)}
                  placeholder="Menstrual cycle details, any irregularities"
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
              )}
            </FormField>
            <FormField label="Number of Children">
              {(props) => (
                <Input
                  {...props}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.number_of_children}
                  onChange={(e) => updateField("number_of_children", e.target.value)}
                  placeholder="0"
                />
              )}
            </FormField>
          </div>
        </FormSection>
      )}

      {/* Medical History */}
      <FormSection title="Medical History" id="medical-history" defaultOpen={isEdit}>
        <DynamicTable
          columns={[
            { key: "disease", label: "Disease/Condition", placeholder: "e.g., Diabetes" },
            { key: "duration", label: "Duration", placeholder: "e.g., 5 years" },
            { key: "medication", label: "Current Medication", placeholder: "e.g., Metformin" },
          ]}
          rows={form.medical_history}
          onAdd={() =>
            updateField("medical_history", [
              ...form.medical_history,
              { disease: "", duration: "", medication: "" },
            ])
          }
          onRemove={(idx) =>
            updateField(
              "medical_history",
              form.medical_history.filter((_, i) => i !== idx),
            )
          }
          onChange={(idx, key, value) =>
            updateField(
              "medical_history",
              form.medical_history.map((row, i) =>
                i === idx ? { ...row, [key]: value } : row,
              ),
            )
          }
          addLabel="Add Medical History"
        />
      </FormSection>

      {/* Family History */}
      <FormSection title="Family History" id="family-history" defaultOpen={isEdit}>
        <DynamicTable
          columns={[
            { key: "relation", label: "Relation", placeholder: "e.g., Father" },
            { key: "disease", label: "Disease", placeholder: "e.g., Hypertension" },
            { key: "duration", label: "Duration", placeholder: "e.g., 10 years" },
            { key: "remarks", label: "Remarks", placeholder: "Any notes" },
          ]}
          rows={form.family_history}
          onAdd={() =>
            updateField("family_history", [
              ...form.family_history,
              { relation: "", disease: "", duration: "", remarks: "" },
            ])
          }
          onRemove={(idx) =>
            updateField(
              "family_history",
              form.family_history.filter((_, i) => i !== idx),
            )
          }
          onChange={(idx, key, value) =>
            updateField(
              "family_history",
              form.family_history.map((row, i) =>
                i === idx ? { ...row, [key]: value } : row,
              ),
            )
          }
          addLabel="Add Family History"
        />
      </FormSection>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {isEdit ? "Save Changes" : "Register Patient"}
        </Button>
      </div>
    </form>
  );
}
