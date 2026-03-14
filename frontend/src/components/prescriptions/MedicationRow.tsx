"use client";

import { GripVertical, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { BilingualLabel } from "@/components/ui/BilingualLabel";
import { MedicineAutocomplete } from "@/components/pharmacy/MedicineAutocomplete";
import {
  FREQUENCY_OPTIONS,
  DOSAGE_UNITS,
  TIMING_OPTIONS,
} from "@/lib/constants/envagai-options";
import { MEDICATION_LABELS } from "@/lib/constants/bilingual-labels";
import type { Medicine, Discipline } from "@/lib/types";

const DILUTION_SCALE_OPTIONS = [
  { value: "C",  label: "C \u2014 Centesimal" },
  { value: "X",  label: "X \u2014 Decimal" },
  { value: "LM", label: "LM Potency" },
  { value: "Q",  label: "Q \u2014 Mother Tincture" },
];

type MedicationData = {
  medicine: number | null;
  drug_name: string;
  dosage_amount: string;
  dosage_unit: string;
  frequency: string;
  frequency_tamil: string;
  timing: string;
  timing_tamil: string;
  duration: string;
  instructions: string;
  instructions_ta: string;
  potency: string;
  dilution_scale: string;
  pellet_count: string;
};

type MedicationRowProps = {
  index: number;
  data: MedicationData;
  onChange: (field: keyof MedicationData, value: string | number | null) => void;
  onRemove: () => void;
  discipline?: Discipline;
};

export function MedicationRow({
  index,
  data,
  onChange,
  onRemove,
  discipline,
}: MedicationRowProps) {
  const isHomeopathy = discipline === "homeopathy";
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
          <MedicineAutocomplete
            value={data.drug_name}
            onChange={(val: string, medicine?: Medicine) => {
              onChange("drug_name", val);
              onChange("medicine", medicine?.id ?? null);
            }}
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

        <div className="sm:col-span-2">
          <BilingualLabel
            english={MEDICATION_LABELS.instructions.en}
            tamil={MEDICATION_LABELS.instructions.ta}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={data.instructions}
              onChange={(e) => onChange("instructions", e.target.value)}
              placeholder="e.g., Mix with warm water, take before food"
            />
            <Input
              value={data.instructions_ta}
              onChange={(e) => onChange("instructions_ta", e.target.value)}
              placeholder="e.g., \u0bb5\u0bc6\u0ba8\u0bcd\u0ba8\u0bc0\u0bb0\u0bbf\u0bb2\u0bcd \u0b95\u0bb2\u0ba8\u0bcd\u0ba4\u0bc1 \u0b9a\u0bbe\u0baa\u0bcd\u0baa\u0bbf\u0b9f\u0bb5\u0bc1\u0bae\u0bcd"
              className="border-emerald-200 bg-emerald-50/30"
            />
          </div>
        </div>

        {isHomeopathy && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Potency
              </label>
              <Input
                value={data.potency}
                onChange={(e) => onChange("potency", e.target.value)}
                placeholder="e.g., 30C, 200C, 1M, LM1"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Dilution Scale
              </label>
              <Select
                value={data.dilution_scale}
                onChange={(e) => onChange("dilution_scale", e.target.value)}
              >
                <option value="">Select scale</option>
                {DILUTION_SCALE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Pellet Count
              </label>
              <Input
                type="number"
                inputMode="numeric"
                value={data.pellet_count}
                onChange={(e) => onChange("pellet_count", e.target.value)}
                placeholder="e.g., 4"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
