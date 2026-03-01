"use client";

import { Select } from "@/components/ui/Select";

const PRAKRITI_OPTIONS = {
  dosha_type: {
    label: "Dosha Type",
    options: ["Vata", "Pitta", "Kapha", "Vata-Pitta", "Pitta-Kapha", "Vata-Kapha", "Tridosha"],
  },
  body_frame: {
    label: "Body Frame",
    options: ["Thin/Light", "Medium/Moderate", "Large/Heavy"],
  },
  skin_type: {
    label: "Skin Type",
    options: ["Dry/Rough", "Warm/Oily", "Thick/Cool"],
  },
  digestion: {
    label: "Agni (Digestive Fire)",
    options: ["Vishama (Irregular)", "Tikshna (Sharp)", "Manda (Slow)", "Sama (Balanced)"],
  },
  mental_tendency: {
    label: "Mental Tendency",
    options: ["Anxious/Creative", "Focused/Intense", "Calm/Steady"],
  },
} as const;

type PrakritiFormProps = {
  value: Record<string, string>;
  onChange: (data: Record<string, string>) => void;
};

export function PrakritiForm({ value, onChange }: PrakritiFormProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Object.entries(PRAKRITI_OPTIONS).map(([key, config]) => (
        <div
          key={key}
          className="rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {config.label}
          </label>
          <Select
            value={value[key] ?? ""}
            onChange={(e) =>
              onChange({ ...value, [key]: e.target.value })
            }
          >
            <option value="">Select...</option>
            {config.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        </div>
      ))}

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 sm:col-span-2">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          value={value.notes ?? ""}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          placeholder="Additional prakriti observations..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
        />
      </div>
    </div>
  );
}
