"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useReducer } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BilingualLabel } from "@/components/ui/BilingualLabel";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { MedicationRow } from "./MedicationRow";
import { useMutation } from "@/hooks/useMutation";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  SECTION_LABELS,
  ADVICE_LABELS,
} from "@/lib/constants/bilingual-labels";
import type { Prescription } from "@/lib/types";

type MedicationData = {
  drug_name: string;
  dosage_amount: string;
  dosage_unit: string;
  frequency: string;
  frequency_tamil: string;
  timing: string;
  timing_tamil: string;
  duration: string;
  instructions: string;
  instructions_ta: string;
  potency: string;
  dilution_scale: string;
  pellet_count: string;
};

type ProcedureData = {
  name: string;
  details: string;
  duration: string;
};

type PrescriptionFormState = {
  medications: MedicationData[];
  procedures: ProcedureData[];
  diet_advice: string;
  diet_advice_ta: string;
  lifestyle_advice: string;
  lifestyle_advice_ta: string;
  exercise_advice: string;
  exercise_advice_ta: string;
  follow_up_date: string;
  follow_up_notes: string;
  follow_up_notes_ta: string;
};

type Action =
  | { type: "SET_FIELD"; field: keyof PrescriptionFormState; value: string }
  | { type: "ADD_MEDICATION" }
  | { type: "REMOVE_MEDICATION"; index: number }
  | {
      type: "UPDATE_MEDICATION";
      index: number;
      field: keyof MedicationData;
      value: string;
    }
  | { type: "ADD_PROCEDURE" }
  | { type: "REMOVE_PROCEDURE"; index: number }
  | {
      type: "UPDATE_PROCEDURE";
      index: number;
      field: keyof ProcedureData;
      value: string;
    };

const emptyMedication: MedicationData = {
  drug_name: "",
  dosage_amount: "",
  dosage_unit: "",
  frequency: "",
  frequency_tamil: "",
  timing: "",
  timing_tamil: "",
  duration: "",
  instructions: "",
  instructions_ta: "",
  potency: "",
  dilution_scale: "",
  pellet_count: "",
};

const emptyProcedure: ProcedureData = {
  name: "",
  details: "",
  duration: "",
};

function getInitialState(): PrescriptionFormState {
  return {
    medications: [{ ...emptyMedication }],
    procedures: [],
    diet_advice: "",
    diet_advice_ta: "",
    lifestyle_advice: "",
    lifestyle_advice_ta: "",
    exercise_advice: "",
    exercise_advice_ta: "",
    follow_up_date: "",
    follow_up_notes: "",
    follow_up_notes_ta: "",
  };
}

function reducer(
  state: PrescriptionFormState,
  action: Action,
): PrescriptionFormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "ADD_MEDICATION":
      return {
        ...state,
        medications: [...state.medications, { ...emptyMedication }],
      };
    case "REMOVE_MEDICATION":
      return {
        ...state,
        medications: state.medications.filter((_, i) => i !== action.index),
      };
    case "UPDATE_MEDICATION":
      return {
        ...state,
        medications: state.medications.map((m, i) =>
          i === action.index ? { ...m, [action.field]: action.value } : m,
        ),
      };
    case "ADD_PROCEDURE":
      return {
        ...state,
        procedures: [...state.procedures, { ...emptyProcedure }],
      };
    case "REMOVE_PROCEDURE":
      return {
        ...state,
        procedures: state.procedures.filter((_, i) => i !== action.index),
      };
    case "UPDATE_PROCEDURE":
      return {
        ...state,
        procedures: state.procedures.map((p, i) =>
          i === action.index ? { ...p, [action.field]: action.value } : p,
        ),
      };
    default:
      return state;
  }
}

type PrescriptionBuilderProps = {
  consultationId: number;
  patientId: number;
  mode?: "create" | "edit";
  prescriptionId?: number;
  initialData?: {
    medications?: MedicationData[];
    procedures?: ProcedureData[];
    diet_advice?: string;
    diet_advice_ta?: string;
    lifestyle_advice?: string;
    lifestyle_advice_ta?: string;
    exercise_advice?: string;
    exercise_advice_ta?: string;
    follow_up_date?: string;
    follow_up_notes?: string;
    follow_up_notes_ta?: string;
  };
};

export function PrescriptionBuilder({
  consultationId,
  patientId,
  mode = "create",
  prescriptionId,
  initialData,
}: PrescriptionBuilderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const discipline = user?.clinic?.discipline ?? "siddha";
  const isEdit = mode === "edit";

  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => {
      if (initialData) {
        return {
          medications: initialData.medications?.length
            ? initialData.medications
            : [{ ...emptyMedication }],
          procedures: initialData.procedures ?? [],
          diet_advice: initialData.diet_advice ?? "",
          diet_advice_ta: initialData.diet_advice_ta ?? "",
          lifestyle_advice: initialData.lifestyle_advice ?? "",
          lifestyle_advice_ta: initialData.lifestyle_advice_ta ?? "",
          exercise_advice: initialData.exercise_advice ?? "",
          exercise_advice_ta: initialData.exercise_advice_ta ?? "",
          follow_up_date: initialData.follow_up_date ?? "",
          follow_up_notes: initialData.follow_up_notes ?? "",
          follow_up_notes_ta: initialData.follow_up_notes_ta ?? "",
        };
      }
      return getInitialState();
    },
  );

  const { mutate, isLoading } = useMutation<unknown, Prescription>(
    isEdit ? "patch" : "post",
    isEdit ? `/prescriptions/${prescriptionId}/` : "/prescriptions/",
  );

  async function handleSubmit(e: FormEvent, andPrint: boolean) {
    e.preventDefault();

    const payload = {
      ...(isEdit ? {} : { consultation: consultationId }),
      medications: state.medications
        .filter((m) => m.drug_name.trim())
        .map((m, i) => ({
          drug_name: m.drug_name,
          dosage: m.dosage_amount
            ? `${m.dosage_amount} ${m.dosage_unit}`.trim()
            : "",
          frequency: m.frequency,
          frequency_tamil: m.frequency_tamil,
          timing: m.timing,
          timing_tamil: m.timing_tamil,
          duration: m.duration,
          instructions: m.instructions,
          instructions_ta: m.instructions_ta,
          sort_order: i,
          potency: m.potency || undefined,
          dilution_scale: m.dilution_scale || undefined,
          pellet_count: m.pellet_count ? parseInt(m.pellet_count, 10) : undefined,
        })),
      procedures: state.procedures
        .filter((p) => p.name.trim())
        .map((p) => ({
          name: p.name,
          details: p.details,
          duration: p.duration,
        })),
      diet_advice: state.diet_advice,
      diet_advice_ta: state.diet_advice_ta,
      lifestyle_advice: state.lifestyle_advice,
      lifestyle_advice_ta: state.lifestyle_advice_ta,
      exercise_advice: state.exercise_advice,
      exercise_advice_ta: state.exercise_advice_ta,
      follow_up_date: state.follow_up_date || null,
      follow_up_notes: state.follow_up_notes,
      follow_up_notes_ta: state.follow_up_notes_ta,
    };

    const result = await mutate(payload);
    if (result) {
      if (isEdit) {
        router.push(`/prescriptions/${prescriptionId}`);
      } else if (andPrint) {
        router.push(`/prescriptions/${result.id}/print`);
      } else {
        router.push(`/patients/${patientId}`);
      }
    }
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
      {/* Medications */}
      <FormSection title={<BilingualLabel english={SECTION_LABELS.medications.en} tamil={SECTION_LABELS.medications.ta} as="span" />} id="medications">
        <div className="space-y-4">
          {state.medications.map((med, idx) => (
            <MedicationRow
              key={idx}
              index={idx}
              data={med}
              discipline={discipline}
              onChange={(field, value) =>
                dispatch({
                  type: "UPDATE_MEDICATION",
                  index: idx,
                  field,
                  value,
                })
              }
              onRemove={() =>
                dispatch({ type: "REMOVE_MEDICATION", index: idx })
              }
            />
          ))}
          <Button
            type="button"
            variant="ghost"
            onClick={() => dispatch({ type: "ADD_MEDICATION" })}
            className="text-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add Medication
          </Button>
        </div>
      </FormSection>

      {/* Procedures */}
      <FormSection title={<BilingualLabel english={SECTION_LABELS.procedures.en} tamil={SECTION_LABELS.procedures.ta} as="span" />} id="procedures" defaultOpen={false}>
        <div className="space-y-3">
          {state.procedures.map((proc, idx) => (
            <div
              key={idx}
              className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-3"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Procedure Name
                </label>
                <Input
                  value={proc.name}
                  onChange={(e) =>
                    dispatch({
                      type: "UPDATE_PROCEDURE",
                      index: idx,
                      field: "name",
                      value: e.target.value,
                    })
                  }
                  placeholder="e.g., Varmam Therapy"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Details
                </label>
                <Input
                  value={proc.details}
                  onChange={(e) =>
                    dispatch({
                      type: "UPDATE_PROCEDURE",
                      index: idx,
                      field: "details",
                      value: e.target.value,
                    })
                  }
                  placeholder="Procedure details"
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Duration
                  </label>
                  <Input
                    value={proc.duration}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_PROCEDURE",
                        index: idx,
                        field: "duration",
                        value: e.target.value,
                      })
                    }
                    placeholder="e.g., 30 mins"
                  />
                </div>
                <button
                  type="button"
                  aria-label={`Remove procedure ${idx + 1}`}
                  onClick={() =>
                    dispatch({ type: "REMOVE_PROCEDURE", index: idx })
                  }
                  className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-lg text-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            onClick={() => dispatch({ type: "ADD_PROCEDURE" })}
            className="text-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add Procedure
          </Button>
        </div>
      </FormSection>

      {/* Advice */}
      <FormSection title={<BilingualLabel english={SECTION_LABELS.advice.en} tamil={SECTION_LABELS.advice.ta} as="span" />} id="advice">
        <div className="space-y-4">
          <FormField label={`${ADVICE_LABELS.diet.ta} — ${ADVICE_LABELS.diet.en}`}>
            {(props) => (
              <div className="grid gap-2 sm:grid-cols-2">
                <textarea
                  {...props}
                  value={state.diet_advice}
                  onChange={(e) =>
                    dispatch({ type: "SET_FIELD", field: "diet_advice", value: e.target.value })
                  }
                  placeholder="Diet advice (English)"
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
                <textarea
                  value={state.diet_advice_ta}
                  onChange={(e) =>
                    dispatch({ type: "SET_FIELD", field: "diet_advice_ta", value: e.target.value })
                  }
                  placeholder="உணவுக் கட்டுப்பாடு (தமிழ்)"
                  rows={2}
                  className="w-full rounded-lg border border-emerald-200 bg-emerald-50/30 px-3 py-2 text-base placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
              </div>
            )}
          </FormField>
          <FormField label={`${ADVICE_LABELS.lifestyle.ta} — ${ADVICE_LABELS.lifestyle.en}`}>
            {(props) => (
              <div className="grid gap-2 sm:grid-cols-2">
                <textarea
                  {...props}
                  value={state.lifestyle_advice}
                  onChange={(e) =>
                    dispatch({ type: "SET_FIELD", field: "lifestyle_advice", value: e.target.value })
                  }
                  placeholder="Lifestyle advice (English)"
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
                <textarea
                  value={state.lifestyle_advice_ta}
                  onChange={(e) =>
                    dispatch({ type: "SET_FIELD", field: "lifestyle_advice_ta", value: e.target.value })
                  }
                  placeholder="வாழ்க்கைமுறை அறிவுரை (தமிழ்)"
                  rows={2}
                  className="w-full rounded-lg border border-emerald-200 bg-emerald-50/30 px-3 py-2 text-base placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
              </div>
            )}
          </FormField>
          <FormField label={`${ADVICE_LABELS.exercise.ta} — ${ADVICE_LABELS.exercise.en}`}>
            {(props) => (
              <div className="grid gap-2 sm:grid-cols-2">
                <textarea
                  {...props}
                  value={state.exercise_advice}
                  onChange={(e) =>
                    dispatch({ type: "SET_FIELD", field: "exercise_advice", value: e.target.value })
                  }
                  placeholder="Exercise advice (English)"
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
                <textarea
                  value={state.exercise_advice_ta}
                  onChange={(e) =>
                    dispatch({ type: "SET_FIELD", field: "exercise_advice_ta", value: e.target.value })
                  }
                  placeholder="உடற்பயிற்சி அறிவுரை (தமிழ்)"
                  rows={2}
                  className="w-full rounded-lg border border-emerald-200 bg-emerald-50/30 px-3 py-2 text-base placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
              </div>
            )}
          </FormField>
        </div>
      </FormSection>

      {/* Follow-up */}
      <FormSection title={<BilingualLabel english={SECTION_LABELS.followUp.en} tamil={SECTION_LABELS.followUp.ta} as="span" />} id="follow-up">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Follow-up Date">
            {(props) => (
              <Input
                {...props}
                type="date"
                value={state.follow_up_date}
                onChange={(e) =>
                  dispatch({
                    type: "SET_FIELD",
                    field: "follow_up_date",
                    value: e.target.value,
                  })
                }
              />
            )}
          </FormField>
          <FormField label="Follow-up Notes (English)">
            {(props) => (
              <Input
                {...props}
                value={state.follow_up_notes}
                onChange={(e) =>
                  dispatch({ type: "SET_FIELD", field: "follow_up_notes", value: e.target.value })
                }
                placeholder="Follow-up notes..."
              />
            )}
          </FormField>
          <FormField label="மறு ஆய்வு குறிப்புகள் (தமிழ்)">
            {(props) => (
              <Input
                {...props}
                value={state.follow_up_notes_ta}
                onChange={(e) =>
                  dispatch({ type: "SET_FIELD", field: "follow_up_notes_ta", value: e.target.value })
                }
                placeholder="மறு ஆய்வு குறிப்புகள்..."
                className="border-emerald-200 bg-emerald-50/30"
              />
            )}
          </FormField>
        </div>
      </FormSection>

      {/* Submit */}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-6">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        {isEdit ? (
          <Button type="submit" isLoading={isLoading}>
            Update Prescription
          </Button>
        ) : (
          <>
            <Button type="submit" variant="secondary" isLoading={isLoading}>
              Save Draft
            </Button>
            <Button
              type="button"
              isLoading={isLoading}
              onClick={(e) => handleSubmit(e, true)}
            >
              Save & Print
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
