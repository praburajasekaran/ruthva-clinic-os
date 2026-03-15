"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useMutation } from "@/hooks/useMutation";
import { AlertTriangle, CheckCircle, User, Phone } from "lucide-react";
import type { RuthvaJourneyRef, StartJourneyPayload } from "@/lib/types";

type StartJourneyModalProps = {
  open: boolean;
  onClose: () => void;
  patientId: number;
  patientName: string;
  patientPhone: string;
  consultationId: number | null;
  defaultDurationDays: number;
  onSuccess: () => void;
};

export function StartJourneyModal({
  open,
  onClose,
  patientId,
  patientName,
  patientPhone,
  consultationId,
  defaultDurationDays,
  onSuccess,
}: StartJourneyModalProps) {
  const [durationDays, setDurationDays] = useState(defaultDurationDays);
  const [followupIntervalDays, setFollowupIntervalDays] = useState(3);
  const [consentGiven, setConsentGiven] = useState(false);
  const [success, setSuccess] = useState(false);

  const { mutate, isLoading, error, reset } = useMutation<
    StartJourneyPayload,
    RuthvaJourneyRef
  >("post", "/integrations/journeys/start/");

  const handleSubmit = async () => {
    const result = await mutate({
      patient_id: patientId,
      consultation_id: consultationId,
      duration_days: durationDays,
      followup_interval_days: followupIntervalDays,
      consent_given: consentGiven,
    });

    if (result) {
      setSuccess(true);
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1500);
    }
  };

  const handleClose = () => {
    setConsentGiven(false);
    setSuccess(false);
    reset();
    onClose();
  };

  const errorMessage =
    error?.detail ??
    error?.non_field_errors?.[0] ??
    (error ? "Something went wrong. Please try again." : null);

  if (success) {
    return (
      <Modal open={open} onClose={handleClose} title="Treatment Journey Started" size="sm">
        <div className="flex flex-col items-center gap-3 py-4">
          <CheckCircle className="h-12 w-12 text-emerald-500" />
          <p className="text-sm text-gray-600">
            Ruthva will now track treatment continuity over WhatsApp.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Start Treatment Journey" size="md">
      <div className="space-y-5">
        {/* Patient summary */}
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-gray-700">
              <User className="h-4 w-4 text-gray-400" />
              {patientName}
            </span>
            <span className="flex items-center gap-1.5 text-gray-500">
              <Phone className="h-4 w-4 text-gray-400" />
              {patientPhone || "No phone"}
            </span>
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Journey Duration (days)
          </label>
          <input
            type="number"
            min={7}
            max={180}
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            Pre-filled from treatment plan ({defaultDurationDays} days)
          </p>
        </div>

        {/* Follow-up interval */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Follow-up Interval (days)
          </label>
          <div className="flex gap-2">
            {[3, 5, 7, 14].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setFollowupIntervalDays(d)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  followupIntervalDays === d
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>

        {/* Consent */}
        <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm text-gray-700">
            Patient has given consent for WhatsApp treatment follow-up messages
          </span>
        </label>

        {/* Error */}
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!consentGiven || isLoading || !patientPhone}
          >
            {isLoading ? "Starting…" : "Start Treatment Journey"}
          </Button>
        </div>

        {!patientPhone && (
          <p className="text-xs text-amber-600">
            Patient has no phone number on file. Add one before starting a treatment journey.
          </p>
        )}
      </div>
    </Modal>
  );
}
