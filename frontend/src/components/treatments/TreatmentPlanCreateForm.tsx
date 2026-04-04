"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { BlockEntryForm } from "@/components/treatments/BlockEntryForm";
import api from "@/lib/api";
import type { SessionPlanEntry, TreatmentPlan } from "@/lib/types";

type Props = {
  prescriptionId: number;
  onCreated: (plan: TreatmentPlan) => void;
  onCancel: () => void;
};

const DEFAULT_ENTRY: SessionPlanEntry = {
  entry_type: "day_range",
  start_day_number: 1,
  end_day_number: 5,
  procedure_name: "",
  medium_type: "oil",
  medium_name: "",
  instructions: "",
};

export function TreatmentPlanCreateForm({ prescriptionId, onCreated, onCancel }: Props) {
  const [totalDays, setTotalDays] = useState(15);
  const [blockStartDay, setBlockStartDay] = useState(1);
  const [blockEndDay, setBlockEndDay] = useState(5);
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [entries, setEntries] = useState<SessionPlanEntry[]>([{ ...DEFAULT_ENTRY }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    const payload = {
      prescription: prescriptionId,
      total_days: totalDays,
      block: {
        start_day_number: blockStartDay,
        end_day_number: blockEndDay,
        start_date: startDate,
        entries: entries.map((e) => {
          if (e.entry_type === "single_day") {
            return {
              entry_type: "single_day" as const,
              day_number: e.day_number ?? blockStartDay,
              procedure_name: e.procedure_name,
              medium_type: e.medium_type,
              medium_name: e.medium_name,
              instructions: e.instructions,
            };
          }
          return {
            entry_type: "day_range" as const,
            start_day_number: e.start_day_number ?? blockStartDay,
            end_day_number: e.end_day_number ?? blockEndDay,
            procedure_name: e.procedure_name,
            medium_type: e.medium_type,
            medium_name: e.medium_name,
            instructions: e.instructions,
          };
        }),
      },
    };

    try {
      const res = await api.post<TreatmentPlan>("/treatments/plans/", payload);
      onCreated(res.data);
    } catch (err: unknown) {
      const apiErr =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: Record<string, unknown> } }).response?.data
          : null;
      if (apiErr) {
        const msg =
          typeof apiErr.detail === "string"
            ? apiErr.detail
            : typeof apiErr.non_field_errors === "object" && Array.isArray(apiErr.non_field_errors)
              ? apiErr.non_field_errors.join(", ")
              : JSON.stringify(apiErr);
        setError(msg);
      } else {
        setError("Failed to create treatment plan.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-6 space-y-5">
      <h3 className="text-base font-semibold text-gray-900">New Treatment Plan</h3>

      {/* Plan-level fields */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Total Days</label>
          <input
            type="number"
            min={1}
            value={totalDays}
            onChange={(e) => setTotalDays(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Block Start Day</label>
          <input
            type="number"
            min={1}
            value={blockStartDay}
            onChange={(e) => setBlockStartDay(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Block End Day</label>
          <input
            type="number"
            min={blockStartDay}
            max={totalDays}
            value={blockEndDay}
            onChange={(e) => setBlockEndDay(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Start Date</label>
          <DatePicker
            value={startDate}
            onChange={(v) => setStartDate(v)}
          />
        </div>
      </div>

      {/* Entries via shared BlockEntryForm */}
      <BlockEntryForm
        blockStartDay={blockStartDay}
        blockEndDay={blockEndDay}
        entries={entries}
        onChange={setEntries}
      />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSubmit} isLoading={isSubmitting} size="sm">
          Create Treatment Plan
        </Button>
        <Button variant="secondary" onClick={onCancel} size="sm" disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
