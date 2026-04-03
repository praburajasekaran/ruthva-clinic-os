"use client";

import { PillGroup } from "@/components/ui/PillGroup";

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
    <div className="grid gap-5 sm:grid-cols-2">
      {Object.entries(PRAKRITI_OPTIONS).map(([key, config]) => (
        <div key={key}>
          <label className="mb-2 block text-sm font-medium text-foreground">
            {config.label}
          </label>
          <PillGroup
            options={config.options as unknown as readonly string[]}
            value={value[key] ?? ""}
            onChange={(v) => onChange({ ...value, [key]: v })}
            label={config.label}
          />
        </div>
      ))}

      <div className="sm:col-span-2">
        <label className="mb-2 block text-sm font-medium text-foreground">
          Notes
        </label>
        <textarea
          value={value.notes ?? ""}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          placeholder="Additional prakriti observations..."
          rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>
    </div>
  );
}
