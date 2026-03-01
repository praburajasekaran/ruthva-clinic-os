"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import type { MediumType, SessionPlanEntry, TreatmentPlan } from "@/lib/types";

type Props = {
  prescriptionId: number;
  onCreated: (plan: TreatmentPlan) => void;
  onCancel: () => void;
};

const EMPTY_ENTRY: SessionPlanEntry = {
  entry_type: "day_range",
  start_day_number: 1,
  end_day_number: 5,
  procedure_name: "",
  medium_type: "oil",
  medium_name: "",
  instructions: "",
};

const MEDIUM_OPTIONS: { value: MediumType; label: string }[] = [
  { value: "oil", label: "Oil" },
  { value: "powder", label: "Powder" },
  { value: "other", label: "Other" },
];

export function TreatmentPlanCreateForm({ prescriptionId, onCreated, onCancel }: Props) {
  const [totalDays, setTotalDays] = useState(15);
  const [blockStartDay, setBlockStartDay] = useState(1);
  const [blockEndDay, setBlockEndDay] = useState(5);
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [entries, setEntries] = useState<SessionPlanEntry[]>([{ ...EMPTY_ENTRY }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateEntry = (index: number, field: keyof SessionPlanEntry, value: string | number) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  };

  const addEntry = () => {
    setEntries((prev) => [
      ...prev,
      {
        ...EMPTY_ENTRY,
        start_day_number: blockStartDay,
        end_day_number: blockEndDay,
      },
    ]);
  };

  const removeEntry = (index: number) => {
    if (entries.length <= 1) return;
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

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
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Entries */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">Procedures</h4>
          <button
            type="button"
            onClick={addEntry}
            className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Procedure
          </button>
        </div>

        {entries.map((entry, idx) => (
          <div key={idx} className="rounded-md border border-gray-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <select
                  value={entry.entry_type}
                  onChange={(e) => updateEntry(idx, "entry_type", e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                >
                  <option value="day_range">Day Range</option>
                  <option value="single_day">Single Day</option>
                </select>

                {entry.entry_type === "single_day" ? (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500">Day</label>
                    <input
                      type="number"
                      min={blockStartDay}
                      max={blockEndDay}
                      value={entry.day_number ?? blockStartDay}
                      onChange={(e) => updateEntry(idx, "day_number", Number(e.target.value))}
                      className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500">Days</label>
                    <input
                      type="number"
                      min={blockStartDay}
                      max={blockEndDay}
                      value={entry.start_day_number ?? blockStartDay}
                      onChange={(e) => updateEntry(idx, "start_day_number", Number(e.target.value))}
                      className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-400">to</span>
                    <input
                      type="number"
                      min={entry.start_day_number ?? blockStartDay}
                      max={blockEndDay}
                      value={entry.end_day_number ?? blockEndDay}
                      onChange={(e) => updateEntry(idx, "end_day_number", Number(e.target.value))}
                      className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              {entries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEntry(idx)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-gray-600">Procedure</label>
                <input
                  type="text"
                  value={entry.procedure_name}
                  onChange={(e) => updateEntry(idx, "procedure_name", e.target.value)}
                  placeholder="e.g. Abhyanga"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Medium</label>
                <select
                  value={entry.medium_type}
                  onChange={(e) => updateEntry(idx, "medium_type", e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                >
                  {MEDIUM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Medium Name</label>
                <input
                  type="text"
                  value={entry.medium_name}
                  onChange={(e) => updateEntry(idx, "medium_name", e.target.value)}
                  placeholder="e.g. Dhanwantharam Thailam"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
              <div className="col-span-2 sm:col-span-4">
                <label className="block text-xs font-medium text-gray-600">Instructions</label>
                <input
                  type="text"
                  value={entry.instructions}
                  onChange={(e) => updateEntry(idx, "instructions", e.target.value)}
                  placeholder="Optional instructions"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

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
