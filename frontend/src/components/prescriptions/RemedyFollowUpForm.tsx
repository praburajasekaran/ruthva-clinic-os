"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useMutation } from "@/hooks/useMutation";

const RESPONSE_TYPE_OPTIONS = [
  { value: "amelioration",           label: "Amelioration — Improvement" },
  { value: "aggravation",            label: "Aggravation — Worsening" },
  { value: "partial_response",       label: "Partial Response" },
  { value: "no_change",              label: "No Change" },
  { value: "return_of_old_symptoms", label: "Return of Old Symptoms" },
  { value: "new_symptoms",           label: "New Symptoms Appeared" },
];

const ACTION_TAKEN_OPTIONS = [
  { value: "continue_same",    label: "Continue Same Remedy & Potency" },
  { value: "increase_potency", label: "Increase Potency" },
  { value: "decrease_potency", label: "Decrease Potency" },
  { value: "change_remedy",    label: "Change Remedy" },
  { value: "wait_and_watch",   label: "Wait and Watch" },
  { value: "antidote",         label: "Antidote" },
];

type Medication = {
  id: number;
  drug_name: string;
  potency: string;
};

type RemedyFollowUpFormProps = {
  prescriptionId: number;
  previousPrescriptionId?: number;
  medications: Medication[];
  onSuccess?: () => void;
};

export function RemedyFollowUpForm({
  prescriptionId,
  previousPrescriptionId,
  medications,
  onSuccess,
}: RemedyFollowUpFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [remedyEvaluated, setRemedyEvaluated] = useState("");
  const [responseType, setResponseType] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [newPotency, setNewPotency] = useState("");
  const [notes, setNotes] = useState("");

  const { mutate, isLoading } = useMutation<unknown, unknown>(
    "post",
    "/prescriptions/remedy-followup/",
  );

  const showNewPotency =
    actionTaken === "increase_potency" || actionTaken === "decrease_potency";

  async function handleSubmit() {
    if (!responseType || !actionTaken) return;
    await mutate({
      prescription: prescriptionId,
      previous_prescription: previousPrescriptionId ?? null,
      remedy_evaluated: remedyEvaluated ? parseInt(remedyEvaluated, 10) : null,
      response_type: responseType,
      action_taken: actionTaken,
      new_potency: newPotency || "",
      notes,
    });
    onSuccess?.();
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-dashed border-primary px-4 py-2.5 text-sm text-primary hover:bg-accent"
      >
        <FlaskConical className="h-4 w-4" />
        Record Remedy Response
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-input bg-muted p-4">
      <div className="mb-4 flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Remedy Response
        </h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {medications.length > 0 && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Remedy Evaluated
            </label>
            <Select
              value={remedyEvaluated}
              onChange={(e) => setRemedyEvaluated(e.target.value)}
            >
              <option value="">Select remedy...</option>
              {medications.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.drug_name}{m.potency ? ` ${m.potency}` : ""}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Response Type <span className="text-red-500">*</span>
          </label>
          <Select
            value={responseType}
            onChange={(e) => setResponseType(e.target.value)}
          >
            <option value="">Select response...</option>
            {RESPONSE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Action Taken <span className="text-red-500">*</span>
          </label>
          <Select
            value={actionTaken}
            onChange={(e) => setActionTaken(e.target.value)}
          >
            <option value="">Select action...</option>
            {ACTION_TAKEN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        {showNewPotency && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              New Potency
            </label>
            <Input
              value={newPotency}
              onChange={(e) => setNewPotency(e.target.value)}
              placeholder="e.g., 1M, 10M"
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Clinical Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observations, rationale for action taken..."
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || !responseType || !actionTaken}
          size="sm"
        >
          {isLoading ? "Saving…" : "Save Response"}
        </Button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
