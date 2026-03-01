"use client";

import { Plus, Trash2 } from "lucide-react";
import type { MediumType, SessionPlanEntry } from "@/lib/types";

type Props = {
  blockStartDay: number;
  blockEndDay: number;
  entries: SessionPlanEntry[];
  onChange: (entries: SessionPlanEntry[]) => void;
};

const MEDIUM_OPTIONS: { value: MediumType; label: string }[] = [
  { value: "oil", label: "Oil" },
  { value: "powder", label: "Powder" },
  { value: "other", label: "Other" },
];

function computeCoveredDays(entries: SessionPlanEntry[], blockStartDay: number, blockEndDay: number) {
  const covered = new Set<number>();
  for (const e of entries) {
    if (e.entry_type === "single_day") {
      const d = e.day_number ?? blockStartDay;
      if (d >= blockStartDay && d <= blockEndDay) covered.add(d);
    } else {
      const s = e.start_day_number ?? blockStartDay;
      const end = e.end_day_number ?? blockEndDay;
      for (let d = Math.max(s, blockStartDay); d <= Math.min(end, blockEndDay); d++) {
        covered.add(d);
      }
    }
  }
  return covered;
}

export function BlockEntryForm({ blockStartDay, blockEndDay, entries, onChange }: Props) {
  const updateEntry = (index: number, field: keyof SessionPlanEntry, value: string | number) => {
    onChange(entries.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  };

  const addEntry = () => {
    onChange([
      ...entries,
      {
        entry_type: "day_range",
        start_day_number: blockStartDay,
        end_day_number: blockEndDay,
        procedure_name: "",
        medium_type: "oil",
        medium_name: "",
        instructions: "",
      },
    ]);
  };

  const removeEntry = (index: number) => {
    if (entries.length <= 1) return;
    onChange(entries.filter((_, i) => i !== index));
  };

  const totalDaysInBlock = Math.max(0, blockEndDay - blockStartDay + 1);
  const covered = computeCoveredDays(entries, blockStartDay, blockEndDay);

  return (
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

      {/* Day Coverage Preview */}
      {totalDaysInBlock > 0 && totalDaysInBlock <= 30 && (
        <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
          <p className="mb-2 text-xs font-medium text-gray-500">
            Day Coverage ({covered.size}/{totalDaysInBlock} days)
          </p>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: totalDaysInBlock }, (_, i) => blockStartDay + i).map((day) => (
              <span
                key={day}
                className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-medium ${
                  covered.has(day)
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-50 text-red-400"
                }`}
              >
                {day}
              </span>
            ))}
          </div>
          {covered.size < totalDaysInBlock && (
            <p className="mt-1.5 text-xs text-amber-600">
              Some days are uncovered. Every day in the block should have at least one procedure.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
