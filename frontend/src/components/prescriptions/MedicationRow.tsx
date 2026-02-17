"use client";

import { GripVertical, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FREQUENCY_OPTIONS, DOSAGE_UNITS } from "@/lib/constants/envagai-options";

type MedicationData = {
  drug_name: string;
  dosage_amount: string;
  dosage_unit: string;
  frequency: string;
  frequency_tamil: string;
  duration: string;
  instructions: string;
};

type MedicationRowProps = {
  index: number;
  data: MedicationData;
  onChange: (field: keyof MedicationData, value: string) => void;
  onRemove: () => void;
};

export function MedicationRow({
  index,
  data,
  onChange,
  onRemove,
}: MedicationRowProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-gray-300" />
          <span className="text-sm font-medium text-gray-700">
            Medication {index + 1}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
          aria-label={`Remove medication ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Drug Name
          </label>
          <Input
            value={data.drug_name}
            onChange={(e) => onChange("drug_name", e.target.value)}
            placeholder="e.g., Nilavembu Kudineer"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Dosage
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="decimal"
              value={data.dosage_amount}
              onChange={(e) => onChange("dosage_amount", e.target.value)}
              placeholder="Amount"
              className="flex-1"
            />
            <Select
              value={data.dosage_unit}
              onChange={(e) => onChange("dosage_unit", e.target.value)}
              className="w-28"
            >
              <option value="">Unit</option>
              {DOSAGE_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Frequency
          </label>
          <Select
            value={data.frequency}
            onChange={(e) => {
              onChange("frequency", e.target.value);
              const opt = FREQUENCY_OPTIONS.find((f) => f.value === e.target.value);
              if (opt) onChange("frequency_tamil", opt.tamil);
            }}
          >
            <option value="">Select frequency</option>
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          {data.frequency_tamil && (
            <p className="mt-1 font-tamil text-xs text-gray-500">
              {data.frequency_tamil}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Duration
          </label>
          <Input
            value={data.duration}
            onChange={(e) => onChange("duration", e.target.value)}
            placeholder="e.g., 15 days"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Instructions
          </label>
          <Input
            value={data.instructions}
            onChange={(e) => onChange("instructions", e.target.value)}
            placeholder="e.g., After food, with hot water"
          />
        </div>
      </div>
    </div>
  );
}
