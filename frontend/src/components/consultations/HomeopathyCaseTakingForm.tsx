"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export type Complaint = {
  complaint: string;
  duration: string;
  location: string;
  modalities_worse: string;
  modalities_better: string;
  concomitants: string;
};

export type HomeopathyCaseData = {
  chief_complaints: Complaint[];
  mental_generals: Record<string, string>;
  physical_generals: Record<string, string>;
  miasmatic_classification: string;
  constitutional_notes: string;
  notes: string;
};

export const EMPTY_HOMEOPATHY_CASE: HomeopathyCaseData = {
  chief_complaints: [],
  mental_generals: { mood: "", fears: "", grief: "", irritability: "", dreams: "", notes: "" },
  physical_generals: { thermals: "", thirst: "", perspiration: "", sleep: "", notes: "" },
  miasmatic_classification: "",
  constitutional_notes: "",
  notes: "",
};

const EMPTY_COMPLAINT: Complaint = {
  complaint: "",
  duration: "",
  location: "",
  modalities_worse: "",
  modalities_better: "",
  concomitants: "",
};

const MIASMATIC_OPTIONS = [
  { value: "psoric",      label: "Psoric" },
  { value: "sycotic",     label: "Sycotic" },
  { value: "syphilitic",  label: "Syphilitic" },
  { value: "tubercular",  label: "Tubercular" },
  { value: "cancer",      label: "Cancer" },
  { value: "mixed",       label: "Mixed" },
  { value: "unknown",     label: "Unknown" },
];

const MENTAL_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: "mood",          label: "Mood / Emotional State",    placeholder: "e.g., Anxious, Sad, Cheerful" },
  { key: "fears",         label: "Fears",                     placeholder: "e.g., Dark, heights, failure" },
  { key: "grief",         label: "Grief / Past Trauma",       placeholder: "e.g., Recent loss, long-standing grief" },
  { key: "irritability",  label: "Irritability",              placeholder: "e.g., Mild, violent, from contradiction" },
  { key: "dreams",        label: "Dreams",                    placeholder: "e.g., Vivid, disturbing, falling" },
];

const PHYSICAL_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: "perspiration",  label: "Perspiration",  placeholder: "e.g., Profuse on head, offensive" },
  { key: "sleep",         label: "Sleep",          placeholder: "e.g., Restless, wakes 3am, position" },
];

const THERMAL_OPTIONS = ["", "Chilly", "Hot", "Warm", "Ambithermal"];
const THIRST_OPTIONS   = ["", "Excessive", "Moderate", "Thirstless", "Increased for cold water"];

type Props = {
  value: HomeopathyCaseData;
  onChange: (data: HomeopathyCaseData) => void;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-700">
      {children}
    </h4>
  );
}

export function HomeopathyCaseTakingForm({ value, onChange }: Props) {
  const complaints = value.chief_complaints ?? [];
  const mental = value.mental_generals ?? EMPTY_HOMEOPATHY_CASE.mental_generals;
  const physical = value.physical_generals ?? EMPTY_HOMEOPATHY_CASE.physical_generals;

  function updateComplaint(i: number, field: keyof Complaint, val: string) {
    const updated = complaints.map((c, idx) => (idx === i ? { ...c, [field]: val } : c));
    onChange({ ...value, chief_complaints: updated });
  }

  function addComplaint() {
    onChange({ ...value, chief_complaints: [...complaints, { ...EMPTY_COMPLAINT }] });
  }

  function removeComplaint(i: number) {
    onChange({ ...value, chief_complaints: complaints.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-6">
      {/* Chief Complaints */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <SectionLabel>Chief Complaints</SectionLabel>
        <div className="space-y-4">
          {complaints.map((c, i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Complaint {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeComplaint(i)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  aria-label="Remove complaint"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Complaint</label>
                  <Input
                    value={c.complaint}
                    onChange={(e) => updateComplaint(i, "complaint", e.target.value)}
                    placeholder="e.g., Chronic headache"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Duration</label>
                  <Input
                    value={c.duration}
                    onChange={(e) => updateComplaint(i, "duration", e.target.value)}
                    placeholder="e.g., 6 months"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Location</label>
                  <Input
                    value={c.location}
                    onChange={(e) => updateComplaint(i, "location", e.target.value)}
                    placeholder="e.g., Right temporal"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Modalities — Worse (&lt;)
                  </label>
                  <Input
                    value={c.modalities_worse}
                    onChange={(e) => updateComplaint(i, "modalities_worse", e.target.value)}
                    placeholder="e.g., heat, morning, motion"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Modalities — Better (&gt;)
                  </label>
                  <Input
                    value={c.modalities_better}
                    onChange={(e) => updateComplaint(i, "modalities_better", e.target.value)}
                    placeholder="e.g., cold, rest, pressure"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Concomitants</label>
                  <Input
                    value={c.concomitants}
                    onChange={(e) => updateComplaint(i, "concomitants", e.target.value)}
                    placeholder="e.g., Nausea, photophobia"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addComplaint}
          className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-emerald-300 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
        >
          <Plus className="h-4 w-4" />
          Add Complaint
        </button>
      </div>

      {/* Mental Generals */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <SectionLabel>Mental Generals</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          {MENTAL_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
              <Input
                value={mental[key] ?? ""}
                onChange={(e) =>
                  onChange({ ...value, mental_generals: { ...mental, [key]: e.target.value } })
                }
                placeholder={placeholder}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
            <textarea
              value={mental.notes ?? ""}
              onChange={(e) =>
                onChange({ ...value, mental_generals: { ...mental, notes: e.target.value } })
              }
              placeholder="Additional mental generals..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Physical Generals */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <SectionLabel>Physical Generals</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Thermals</label>
            <Select
              value={physical.thermals ?? ""}
              onChange={(e) =>
                onChange({ ...value, physical_generals: { ...physical, thermals: e.target.value } })
              }
            >
              {THERMAL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt || "Select..."}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Thirst</label>
            <Select
              value={physical.thirst ?? ""}
              onChange={(e) =>
                onChange({ ...value, physical_generals: { ...physical, thirst: e.target.value } })
              }
            >
              {THIRST_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt || "Select..."}
                </option>
              ))}
            </Select>
          </div>
          {PHYSICAL_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
              <Input
                value={physical[key] ?? ""}
                onChange={(e) =>
                  onChange({ ...value, physical_generals: { ...physical, [key]: e.target.value } })
                }
                placeholder={placeholder}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
            <textarea
              value={physical.notes ?? ""}
              onChange={(e) =>
                onChange({ ...value, physical_generals: { ...physical, notes: e.target.value } })
              }
              placeholder="Additional physical generals..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Miasmatic Classification + Constitutional Notes */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Miasmatic Classification
          </label>
          <Select
            value={value.miasmatic_classification ?? ""}
            onChange={(e) =>
              onChange({ ...value, miasmatic_classification: e.target.value })
            }
          >
            <option value="">Select miasm...</option>
            {MIASMATIC_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Constitutional Notes
          </label>
          <textarea
            value={value.constitutional_notes ?? ""}
            onChange={(e) => onChange({ ...value, constitutional_notes: e.target.value })}
            placeholder="e.g., Calc carb type — fair, chilly, sweaty head, slow"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
          />
        </div>
      </div>

      {/* General Notes */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Additional Notes
        </label>
        <textarea
          value={value.notes ?? ""}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          placeholder="Any other observations..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
        />
      </div>
    </div>
  );
}
