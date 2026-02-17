"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { EnvagaiThervu } from "./EnvagaiThervu";
import { useAutoSave, loadDraft, clearDraft } from "@/hooks/useAutoSave";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { useMutation } from "@/hooks/useMutation";
import type { Consultation } from "@/lib/types";
import type { EnvagaiTool } from "@/lib/constants/envagai-options";

type ConsultationFormState = {
  weight: string;
  height: string;
  pulse_rate: string;
  temperature: string;
  bp_systolic: string;
  bp_diastolic: string;
  appetite: string;
  appetite_notes: string;
  bowel: string;
  bowel_notes: string;
  micturition: string;
  micturition_notes: string;
  sleep_quality: string;
  sleep_notes: string;
  naa: string;
  niram: string;
  mozhi: string;
  vizhi: string;
  nadi: string;
  mei: string;
  muthiram: string;
  varmam: string;
  mental_state: string;
  chief_complaints: string;
  history_of_present_illness: string;
  diagnosis: string;
  icd_code: string;
  consultation_date: string;
};

type Action =
  | { type: "SET_FIELD"; field: keyof ConsultationFormState; value: string }
  | { type: "SET_ENVAGAI"; tool: EnvagaiTool; value: string }
  | { type: "LOAD_DRAFT"; data: ConsultationFormState }
  | { type: "RESET" };

function getInitialState(): ConsultationFormState {
  return {
    weight: "",
    height: "",
    pulse_rate: "",
    temperature: "",
    bp_systolic: "",
    bp_diastolic: "",
    appetite: "",
    appetite_notes: "",
    bowel: "",
    bowel_notes: "",
    micturition: "",
    micturition_notes: "",
    sleep_quality: "",
    sleep_notes: "",
    naa: "",
    niram: "",
    mozhi: "",
    vizhi: "",
    nadi: "",
    mei: "",
    muthiram: "",
    varmam: "",
    mental_state: "",
    chief_complaints: "",
    history_of_present_illness: "",
    diagnosis: "",
    icd_code: "",
    consultation_date: new Date().toISOString().split("T")[0],
  };
}

function reducer(
  state: ConsultationFormState,
  action: Action,
): ConsultationFormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_ENVAGAI":
      return { ...state, [action.tool]: action.value };
    case "LOAD_DRAFT":
      return action.data;
    case "RESET":
      return getInitialState();
    default:
      return state;
  }
}

const SECTIONS = [
  { id: "vitals", label: "Vitals" },
  { id: "general-assessment", label: "General Assessment" },
  { id: "envagai-thervu", label: "Envagai Thervu" },
  { id: "diagnosis-section", label: "Diagnosis" },
];

type ConsultationFormProps = {
  patientId: number;
};

export function ConsultationForm({ patientId }: ConsultationFormProps) {
  const router = useRouter();
  const draftKey = `consultation-draft-${patientId}`;
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const draftLoadedRef = useRef(false);

  const { activeSection, scrollToSection } = useScrollSpy(
    SECTIONS.map((s) => s.id),
  );

  const { mutate, isLoading } = useMutation<unknown, Consultation>(
    "post",
    "/consultations/",
  );

  // Check for draft on mount
  useEffect(() => {
    if (draftLoadedRef.current) return;
    draftLoadedRef.current = true;
    const draft = loadDraft<ConsultationFormState>(draftKey);
    if (draft) {
      setShowDraftBanner(true);
    }
  }, [draftKey]);

  // Auto-save
  useAutoSave(draftKey, state);

  const handleResumeDraft = useCallback(() => {
    const draft = loadDraft<ConsultationFormState>(draftKey);
    if (draft) {
      dispatch({ type: "LOAD_DRAFT", data: draft.data });
    }
    setShowDraftBanner(false);
  }, [draftKey]);

  const handleDiscardDraft = useCallback(() => {
    clearDraft(draftKey);
    setShowDraftBanner(false);
  }, [draftKey]);

  function setField(field: keyof ConsultationFormState, value: string) {
    dispatch({ type: "SET_FIELD", field, value });
  }

  async function handleSubmit(e: FormEvent, andWriteRx: boolean) {
    e.preventDefault();

    const payload = {
      patient: patientId,
      ...state,
      weight: state.weight || null,
      height: state.height || null,
      pulse_rate: state.pulse_rate ? Number(state.pulse_rate) : null,
      temperature: state.temperature || null,
      bp_systolic: state.bp_systolic ? Number(state.bp_systolic) : null,
      bp_diastolic: state.bp_diastolic ? Number(state.bp_diastolic) : null,
    };

    const result = await mutate(payload);
    if (result) {
      clearDraft(draftKey);
      if (andWriteRx) {
        router.push(`/consultations/${result.id}/prescriptions/new`);
      } else {
        router.push(`/patients/${patientId}`);
      }
    }
  }

  return (
    <div className="flex gap-6">
      {/* Section Navigator - desktop */}
      <nav className="hidden w-48 shrink-0 lg:block">
        <div className="sticky top-0 space-y-1">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                activeSection === section.id
                  ? "bg-emerald-50 font-medium text-emerald-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Section Navigator - mobile pill bar */}
      <div className="fixed left-0 right-0 top-14 z-30 overflow-x-auto border-b border-gray-200 bg-white px-4 py-2 md:top-0 lg:hidden">
        <div className="flex gap-2">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                activeSection === section.id
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={(e) => handleSubmit(e, false)}
        className="min-w-0 flex-1 space-y-6"
      >
        {/* Draft Recovery Banner */}
        {showDraftBanner && (
          <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-800">
              You have an unsaved draft. Resume where you left off?
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleDiscardDraft}
              >
                Discard
              </Button>
              <Button type="button" size="sm" onClick={handleResumeDraft}>
                Resume
              </Button>
            </div>
          </div>
        )}

        {/* Vitals */}
        <FormSection title="Vitals" id="vitals">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Weight (kg)">
              {(props) => (
                <Input
                  {...props}
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={state.weight}
                  onChange={(e) => setField("weight", e.target.value)}
                  placeholder="e.g., 65.5"
                />
              )}
            </FormField>
            <FormField label="Height (cm)">
              {(props) => (
                <Input
                  {...props}
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={state.height}
                  onChange={(e) => setField("height", e.target.value)}
                  placeholder="e.g., 170"
                />
              )}
            </FormField>
            <FormField label="Pulse Rate (bpm)">
              {(props) => (
                <Input
                  {...props}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={state.pulse_rate}
                  onChange={(e) => setField("pulse_rate", e.target.value)}
                  placeholder="e.g., 72"
                />
              )}
            </FormField>
            <FormField label="Temperature (\u00b0F)">
              {(props) => (
                <Input
                  {...props}
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={state.temperature}
                  onChange={(e) => setField("temperature", e.target.value)}
                  placeholder="e.g., 98.6"
                />
              )}
            </FormField>
            <FormField label="BP Systolic (mmHg)">
              {(props) => (
                <Input
                  {...props}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={state.bp_systolic}
                  onChange={(e) => setField("bp_systolic", e.target.value)}
                  placeholder="e.g., 120"
                />
              )}
            </FormField>
            <FormField label="BP Diastolic (mmHg)">
              {(props) => (
                <Input
                  {...props}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={state.bp_diastolic}
                  onChange={(e) => setField("bp_diastolic", e.target.value)}
                  placeholder="e.g., 80"
                />
              )}
            </FormField>
          </div>
        </FormSection>

        {/* General Assessment */}
        <FormSection title="General Assessment" id="general-assessment">
          <div className="space-y-4">
            {(
              [
                { field: "appetite" as const, notesField: "appetite_notes" as const, label: "Appetite" },
                { field: "bowel" as const, notesField: "bowel_notes" as const, label: "Bowel" },
                { field: "micturition" as const, notesField: "micturition_notes" as const, label: "Micturition" },
                { field: "sleep_quality" as const, notesField: "sleep_notes" as const, label: "Sleep" },
              ] as const
            ).map(({ field, notesField, label }) => (
              <div key={field}>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {label}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setField(field, state[field] === "normal" ? "" : "normal")}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      state[field] === "normal"
                        ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setField(field, state[field] === "abnormal" ? "" : "abnormal")}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      state[field] === "abnormal"
                        ? "bg-amber-100 text-amber-700 ring-1 ring-amber-500"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Abnormal
                  </button>
                </div>
                {state[field] === "abnormal" && (
                  <textarea
                    value={state[notesField]}
                    onChange={(e) => setField(notesField, e.target.value)}
                    placeholder={`Describe ${label.toLowerCase()} abnormality...`}
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-base placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                  />
                )}
              </div>
            ))}
          </div>
        </FormSection>

        {/* Envagai Thervu */}
        <FormSection title="Envagai Thervu (8 Diagnostic Tools)" id="envagai-thervu">
          <EnvagaiThervu
            values={{
              naa: state.naa,
              niram: state.niram,
              mozhi: state.mozhi,
              vizhi: state.vizhi,
              nadi: state.nadi,
              mei: state.mei,
              muthiram: state.muthiram,
              varmam: state.varmam,
            }}
            onChange={(tool, value) =>
              dispatch({ type: "SET_ENVAGAI", tool, value })
            }
          />

          <div className="mt-4">
            <FormField label="Mental State / Attitude">
              {(props) => (
                <textarea
                  {...props}
                  value={state.mental_state}
                  onChange={(e) => setField("mental_state", e.target.value)}
                  placeholder="Observations about patient's mental state and attitude..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
              )}
            </FormField>
          </div>
        </FormSection>

        {/* Diagnosis */}
        <FormSection title="Diagnosis" id="diagnosis-section">
          <div className="space-y-4">
            <FormField label="Chief Complaints">
              {(props) => (
                <textarea
                  {...props}
                  value={state.chief_complaints}
                  onChange={(e) => setField("chief_complaints", e.target.value)}
                  placeholder="Patient's main complaints and duration"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
              )}
            </FormField>
            <FormField label="History of Present Illness">
              {(props) => (
                <textarea
                  {...props}
                  value={state.history_of_present_illness}
                  onChange={(e) =>
                    setField("history_of_present_illness", e.target.value)
                  }
                  placeholder="Detailed history of the current illness"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
              )}
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Diagnosis">
                {(props) => (
                  <Input
                    {...props}
                    value={state.diagnosis}
                    onChange={(e) => setField("diagnosis", e.target.value)}
                    placeholder="Clinical diagnosis"
                  />
                )}
              </FormField>
              <FormField label="ICD Code">
                {(props) => (
                  <Input
                    {...props}
                    value={state.icd_code}
                    onChange={(e) => setField("icd_code", e.target.value)}
                    placeholder="e.g., M54.5"
                  />
                )}
              </FormField>
            </div>
            <FormField label="Consultation Date" required>
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  value={state.consultation_date}
                  onChange={(e) =>
                    setField("consultation_date", e.target.value)
                  }
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
          <Button type="submit" variant="secondary" isLoading={isLoading}>
            Save Consultation
          </Button>
          <Button
            type="button"
            isLoading={isLoading}
            onClick={(e) => handleSubmit(e, true)}
          >
            Save & Write Rx
          </Button>
        </div>
      </form>
    </div>
  );
}
