"use client";

import { GripVertical, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { BilingualLabel } from "@/components/ui/BilingualLabel";
import {
  FREQUENCY_OPTIONS,
  DOSAGE_UNITS,
  TIMING_OPTIONS,
} from "@/lib/constants/envagai-options";
import { MEDICATION_LABELS } from "@/lib/constants/bilingual-labels";

type MedicationData = {
  drug_name: string;
  dosage_amount: string;
  dosage_unit: string;
  frequency: string;
  frequency_tamil: string;
  timing: string;
  timing_tamil: string;
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
          className="min-h-[44px] min-w-[44px] rounded-lg p-2.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
          aria-label={`Remove medication ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <BilingualLabel
            english={MEDICATION_LABELS.drugName.en}
            tamil={MEDICATION_LABELS.drugName.ta}
          />
          <Input
            value={data.drug_name}
            onChange={(e) => onChange("drug_name", e.target.value)}
            placeholder="e.g., Nilavembu Kudineer"
          />
        </div>

        <div>
          <BilingualLabel
            english={MEDICATION_LABELS.dosage.en}
            tamil={MEDICATION_LABELS.dosage.ta}
          />
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
          <BilingualLabel
            english={MEDICATION_LABELS.frequency.en}
            tamil={MEDICATION_LABELS.frequency.ta}
          />
          <Select
            value={data.frequency}
            onChange={(e) => {
              onChange("frequency", e.target.value);
              const opt = FREQUENCY_OPTIONS.find(
                (f) => f.value === e.target.value,
              );
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
          <BilingualLabel
            english={MEDICATION_LABELS.timing.en}
            tamil={MEDICATION_LABELS.timing.ta}
          />
          <Select
            value={data.timing}
            onChange={(e) => {
              onChange("timing", e.target.value);
              const opt = TIMING_OPTIONS.find(
                (t) => t.value === e.target.value,
              );
              if (opt) onChange("timing_tamil", opt.tamil);
            }}
          >
            <option value="">Select timing</option>
            {TIMING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          {data.timing_tamil && (
            <p className="mt-1 font-tamil text-xs text-gray-500">
              {data.timing_tamil}
            </p>
          )}
        </div>

        <div>
          <BilingualLabel
            english={MEDICATION_LABELS.duration.en}
            tamil={MEDICATION_LABELS.duration.ta}
          />
          <Input
            value={data.duration}
            onChange={(e) => onChange("duration", e.target.value)}
            placeholder="e.g., 15 days"
          />
        </div>

        <div>
          <BilingualLabel
            english={MEDICATION_LABELS.instructions.en}
            tamil={MEDICATION_LABELS.instructions.ta}
          />
          <Input
            value={data.instructions}
            onChange={(e) => onChange("instructions", e.target.value)}
            placeholder="e.g., With warm water"
          />
        </div>
      </div>
    </div>
  );
}
