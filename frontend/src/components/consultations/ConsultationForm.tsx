"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BilingualLabel } from "@/components/ui/BilingualLabel";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { DiagnosticFormRouter } from "./DiagnosticFormRouter";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAutoSave, loadDraft, clearDraft } from "@/hooks/useAutoSave";
import { useMutation } from "@/hooks/useMutation";
import {
  SECTION_LABELS,
  ASSESSMENT_LABELS,
  DIAGNOSTIC_SECTION_LABELS,
} from "@/lib/constants/bilingual-labels";
import type { Consultation, DiagnosticData, Discipline } from "@/lib/types";

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
  mental_state: string;
  diagnostic_data: DiagnosticData;
  chief_complaints: string;
  history_of_present_illness: string;
  diagnosis: string;
  consultation_date: string;
};

type Action =
  | { type: "SET_FIELD"; field: keyof ConsultationFormState; value: string | DiagnosticData }
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
    mental_state: "",
    diagnostic_data: {},
    chief_complaints: "",
    history_of_present_illness: "",
    diagnosis: "",
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
    case "LOAD_DRAFT":
      return action.data;
    case "RESET":
      return getInitialState();
    default:
      return state;
  }
}

const textareaClasses =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

type ConsultationFormProps = {
  patientId: number;
  mode?: "create" | "edit";
  consultationId?: number;
  initialData?: Partial<ConsultationFormState>;
};

export function ConsultationForm({
  patientId,
  mode = "create",
  consultationId,
  initialData,
}: ConsultationFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const discipline = (user?.clinic?.discipline ?? "siddha") as Discipline;
  const isEdit = mode === "edit";
  const draftKey = isEdit
    ? `consultation-edit-draft-${consultationId}`
    : `consultation-draft-${patientId}`;

  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => (initialData ? { ...getInitialState(), ...initialData } : getInitialState()),
  );
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const draftLoadedRef = useRef(false);

  // Progressive disclosure state
  const hasAssessmentData = !!(state.appetite || state.bowel || state.micturition || state.sleep_quality || state.mental_state);
  const hasDiagnosticData = Object.keys(state.diagnostic_data).length > 0;
  const hasDiagnosisData = !!(state.chief_complaints || state.history_of_present_illness || state.diagnosis);

  const [showAssessment, setShowAssessment] = useState(isEdit || hasAssessmentData);
  const [showDiagnostics, setShowDiagnostics] = useState(isEdit || hasDiagnosticData);
  const [showDiagnosis, setShowDiagnosis] = useState(isEdit || hasDiagnosisData);

  const diagLabel = DIAGNOSTIC_SECTION_LABELS[discipline] ?? DIAGNOSTIC_SECTION_LABELS.siddha;

  const { mutate, isLoading } = useMutation<unknown, Consultation>(
    isEdit ? "patch" : "post",
    isEdit ? `/consultations/${consultationId}/` : "/consultations/",
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
      // Show all sections when resuming a draft
      setShowAssessment(true);
      setShowDiagnostics(true);
      setShowDiagnosis(true);
    }
    setShowDraftBanner(false);
  }, [draftKey]);

  const handleDiscardDraft = useCallback(() => {
    clearDraft(draftKey);
    setShowDraftBanner(false);
  }, [draftKey]);

  function setField(field: keyof ConsultationFormState, value: string | DiagnosticData) {
    dispatch({ type: "SET_FIELD", field, value });
  }

  async function handleSubmit(e: FormEvent, andWriteRx: boolean) {
    e.preventDefault();

    const payload = {
      ...(isEdit ? {} : { patient: patientId }),
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
      if (isEdit) {
        router.push(`/consultations/${consultationId}`);
      } else if (andWriteRx) {
        router.push(`/consultations/${result.id}/prescriptions/new`);
      } else {
        router.push(`/consultations/${result.id}`);
      }
    }
  }

  return (
    <form
      onSubmit={(e) => handleSubmit(e, false)}
      className="space-y-10 pb-24"
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

      {/* Vitals — always visible */}
      <FormSection
        title={<BilingualLabel english={SECTION_LABELS.vitals.en} tamil={SECTION_LABELS.vitals.ta} as="span" />}
        id="vitals"
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
      {(showAssessment || hasAssessmentData) && (
        <FormSection
          title={<BilingualLabel english={SECTION_LABELS.generalAssessment.en} tamil={SECTION_LABELS.generalAssessment.ta} as="span" />}
          subtitle="Appetite, bowel, sleep, and mental state"
          id="general-assessment"
        >
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {(
                [
                  { field: "appetite" as const, notesField: "appetite_notes" as const, label: ASSESSMENT_LABELS.appetite.en, labelTamil: ASSESSMENT_LABELS.appetite.ta },
                  { field: "bowel" as const, notesField: "bowel_notes" as const, label: ASSESSMENT_LABELS.bowel.en, labelTamil: ASSESSMENT_LABELS.bowel.ta },
                  { field: "micturition" as const, notesField: "micturition_notes" as const, label: ASSESSMENT_LABELS.micturition.en, labelTamil: ASSESSMENT_LABELS.micturition.ta },
                  { field: "sleep_quality" as const, notesField: "sleep_notes" as const, label: ASSESSMENT_LABELS.sleep.en, labelTamil: ASSESSMENT_LABELS.sleep.ta },
                ] as const
              ).map(({ field, notesField, label, labelTamil }) => (
                <div key={field}>
                  <BilingualLabel english={label} tamil={labelTamil} as="label" className="mb-2" />
                  <div className="flex gap-2" role="group" aria-label={`${label} status`}>
                    <button
                      type="button"
                      aria-pressed={state[field] === "normal"}
                      onClick={() => setField(field, state[field] === "normal" ? "" : "normal")}
                      className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        state[field] === "normal"
                          ? "bg-accent text-primary ring-1 ring-primary"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      aria-pressed={state[field] === "abnormal"}
                      onClick={() => setField(field, state[field] === "abnormal" ? "" : "abnormal")}
                      className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        state[field] === "abnormal"
                          ? "bg-amber-50 text-amber-700 ring-1 ring-amber-500"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Abnormal
                    </button>
                  </div>
                  <div aria-live="polite">
                    {state[field] === "abnormal" && (
                      <textarea
                        aria-label={`${label} abnormality notes`}
                        value={state[notesField]}
                        onChange={(e) => setField(notesField, e.target.value)}
                        placeholder={`Describe ${label.toLowerCase()} abnormality...`}
                        rows={2}
                        className={`mt-2 ${textareaClasses}`}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <FormField label="Mental State / Attitude">
              {(props) => (
                <textarea
                  {...props}
                  value={state.mental_state}
                  onChange={(e) => setField("mental_state", e.target.value)}
                  placeholder="Observations about patient's mental state and attitude..."
                  rows={2}
                  className={textareaClasses}
                />
              )}
            </FormField>
          </div>
        </FormSection>
      )}

      {/* Discipline-specific Diagnostics */}
      {(showDiagnostics || hasDiagnosticData) && (
        <FormSection
          title={<BilingualLabel english={diagLabel.en} tamil={diagLabel.ta} as="span" />}
          id="diagnostics"
        >
          <DiagnosticFormRouter
            discipline={discipline}
            value={state.diagnostic_data}
            onChange={(data) => setField("diagnostic_data", data)}
          />
        </FormSection>
      )}

      {/* Diagnosis */}
      {(showDiagnosis || hasDiagnosisData) && (
        <FormSection
          title={<BilingualLabel english={SECTION_LABELS.diagnosis.en} tamil={SECTION_LABELS.diagnosis.ta} as="span" />}
          id="diagnosis-section"
        >
          <div className="space-y-5">
            <FormField label="Chief Complaints" required>
              {(props) => (
                <textarea
                  {...props}
                  value={state.chief_complaints}
                  onChange={(e) => setField("chief_complaints", e.target.value)}
                  placeholder="Patient's main complaints and duration"
                  rows={3}
                  className={textareaClasses}
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
                  className={textareaClasses}
                />
              )}
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
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
              <FormField label="Visit Date" required>
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
          </div>
        </FormSection>
      )}

      {/* Collapsed add buttons — grouped vertically */}
      {(!showAssessment && !hasAssessmentData || !showDiagnostics && !hasDiagnosticData || !showDiagnosis && !hasDiagnosisData) && (
        <div className="flex flex-col gap-5">
          {!showAssessment && !hasAssessmentData && (
            <button
              type="button"
              onClick={() => setShowAssessment(true)}
              className="inline-flex w-full items-center gap-2 border-b border-border pb-2 text-base font-semibold text-primary transition-colors hover:text-primary/80"
            >
              <Plus className="h-4 w-4" />
              Add general assessment
            </button>
          )}
          {!showDiagnostics && !hasDiagnosticData && (
            <button
              type="button"
              onClick={() => setShowDiagnostics(true)}
              className="inline-flex w-full items-center gap-2 border-b border-border pb-2 text-base font-semibold text-primary transition-colors hover:text-primary/80"
            >
              <Plus className="h-4 w-4" />
              Add {diagLabel.en.toLowerCase()}
            </button>
          )}
          {!showDiagnosis && !hasDiagnosisData && (
            <button
              type="button"
              onClick={() => setShowDiagnosis(true)}
              className="inline-flex w-full items-center gap-2 border-b border-border pb-2 text-base font-semibold text-primary transition-colors hover:text-primary/80"
            >
              <Plus className="h-4 w-4" />
              Add diagnosis
            </button>
          )}
        </div>
      )}

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-6 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          {isEdit ? (
            <Button type="submit" isLoading={isLoading}>
              Update Visit
            </Button>
          ) : (
            <>
              <Button type="submit" variant="secondary" isLoading={isLoading}>
                Save Visit
              </Button>
              <Button
                type="button"
                isLoading={isLoading}
                onClick={(e) => handleSubmit(e, true)}
              >
                Save & Write Rx
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
