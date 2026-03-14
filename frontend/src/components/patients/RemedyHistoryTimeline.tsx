"use client";

import { FlaskConical } from "lucide-react";
import { useApi } from "@/hooks/useApi";

type RemedyMedication = {
  drug_name: string;
  potency: string;
  dilution_scale: string;
  pellet_count: number | null;
};

type RemedyResponse = {
  response_type: string;
  action_taken: string;
  new_potency: string;
  notes: string;
};

type TimelineEntry = {
  date: string;
  prescription_id: number;
  consultation_id: number;
  medications: RemedyMedication[];
  response_at_next_visit: RemedyResponse | null;
};

type RemedyHistory = {
  patient_id: number;
  patient_name: string;
  remedy_timeline: TimelineEntry[];
};

const RESPONSE_LABELS: Record<string, string> = {
  amelioration:           "Amelioration",
  aggravation:            "Aggravation",
  partial_response:       "Partial Response",
  no_change:              "No Change",
  return_of_old_symptoms: "Return of Old Symptoms",
  new_symptoms:           "New Symptoms",
};

const ACTION_LABELS: Record<string, string> = {
  continue_same:    "Continue same",
  increase_potency: "Increase potency",
  decrease_potency: "Decrease potency",
  change_remedy:    "Change remedy",
  wait_and_watch:   "Wait & watch",
  antidote:         "Antidote",
};

const RESPONSE_COLORS: Record<string, string> = {
  amelioration:           "bg-green-100 text-green-800",
  aggravation:            "bg-orange-100 text-orange-800",
  partial_response:       "bg-blue-100 text-blue-800",
  no_change:              "bg-gray-100 text-gray-700",
  return_of_old_symptoms: "bg-purple-100 text-purple-800",
  new_symptoms:           "bg-red-100 text-red-700",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function RemedyHistoryTimeline({ patientId }: { patientId: number }) {
  const { data, isLoading } = useApi<RemedyHistory>(
    `/patients/${patientId}/remedy-history/`,
  );

  if (isLoading) {
    return (
      <div className="py-6 text-center text-sm text-gray-400">
        Loading remedy history…
      </div>
    );
  }

  const timeline = data?.remedy_timeline ?? [];

  if (timeline.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 px-6 py-8 text-center">
        <FlaskConical className="mx-auto mb-2 h-6 w-6 text-gray-300" />
        <p className="text-sm text-gray-400">
          No homeopathic prescriptions recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {timeline.map((entry, i) => (
        <div key={entry.prescription_id} className="relative flex gap-4">
          {/* Timeline spine */}
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <FlaskConical className="h-4 w-4 text-emerald-600" />
            </div>
            {i < timeline.length - 1 && (
              <div className="mt-1 w-px flex-1 bg-gray-200" />
            )}
          </div>

          {/* Card */}
          <div className="mb-6 flex-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-medium text-gray-400">
              {formatDate(entry.date)}
            </p>

            {/* Remedies prescribed */}
            <div className="mb-3 flex flex-wrap gap-2">
              {entry.medications.map((m, j) => (
                <span
                  key={j}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800"
                >
                  {m.drug_name}
                  {m.potency && (
                    <span className="text-emerald-600">{m.potency}</span>
                  )}
                  {m.pellet_count && (
                    <span className="text-xs text-emerald-500">
                      ×{m.pellet_count}
                    </span>
                  )}
                </span>
              ))}
            </div>

            {/* Response at next visit */}
            {entry.response_at_next_visit ? (
              <div className="rounded-md bg-gray-50 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      RESPONSE_COLORS[entry.response_at_next_visit.response_type] ??
                      "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {RESPONSE_LABELS[entry.response_at_next_visit.response_type] ??
                      entry.response_at_next_visit.response_type}
                  </span>
                  <span className="text-xs text-gray-500">→</span>
                  <span className="text-xs text-gray-700">
                    {ACTION_LABELS[entry.response_at_next_visit.action_taken] ??
                      entry.response_at_next_visit.action_taken}
                  </span>
                  {entry.response_at_next_visit.new_potency && (
                    <span className="text-xs font-medium text-emerald-700">
                      ({entry.response_at_next_visit.new_potency})
                    </span>
                  )}
                </div>
                {entry.response_at_next_visit.notes && (
                  <p className="mt-1 text-xs text-gray-500">
                    {entry.response_at_next_visit.notes}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                No response recorded yet
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
