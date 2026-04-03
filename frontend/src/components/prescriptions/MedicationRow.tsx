"use client";

import { GripVertical, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { PillGroup } from "@/components/ui/PillGroup";
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
    <div className="border-t border-border pt-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
          <span className="text-sm font-medium text-foreground">
            Medication {index + 1}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="min-h-[44px] min-w-[44px] rounded-lg p-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Remove medication ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Drug Name — full width */}
        <div>
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

        {/* Dosage + Unit + Duration */}
        <div>
          <BilingualLabel
            english={MEDICATION_LABELS.dosage.en}
            tamil={MEDICATION_LABELS.dosage.ta}
          />
          <div className="flex items-center gap-3">
            <Input
              type="text"
              inputMode="decimal"
              value={data.dosage_amount}
              onChange={(e) => onChange("dosage_amount", e.target.value)}
              placeholder="Amount"
              className="w-24 shrink-0"
            />
            <PillGroup
              options={DOSAGE_UNITS}
              value={data.dosage_unit}
              onChange={(v) => onChange("dosage_unit", v)}
              label="Dosage unit"
            />
          </div>
        </div>

        {/* Duration */}
        <div className="sm:max-w-xs">
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

        {/* Frequency + Timing — side by side on desktop */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <BilingualLabel
              english={MEDICATION_LABELS.frequency.en}
              tamil={MEDICATION_LABELS.frequency.ta}
            />
            <PillGroup
              options={FREQUENCY_OPTIONS.map((f) => ({ value: f.value, label: f.value }))}
              value={data.frequency}
              onChange={(v) => {
                onChange("frequency", v);
                const opt = FREQUENCY_OPTIONS.find((f) => f.value === v);
                if (opt) onChange("frequency_tamil", opt.tamil);
              }}
              label="Frequency"
            />
            {data.frequency && (
              <p className="mt-1 text-xs text-muted-foreground">
                {FREQUENCY_OPTIONS.find((f) => f.value === data.frequency)?.label}
                {data.frequency_tamil && (
                  <span lang="ta" className="ml-2">{data.frequency_tamil}</span>
                )}
              </p>
            )}
          </div>
          <div>
            <BilingualLabel
              english={MEDICATION_LABELS.timing.en}
              tamil={MEDICATION_LABELS.timing.ta}
            />
            <PillGroup
              options={TIMING_OPTIONS}
              value={data.timing}
              onChange={(v) => {
                onChange("timing", v);
                const opt = TIMING_OPTIONS.find((t) => t.value === v);
                if (opt) onChange("timing_tamil", opt.tamil);
              }}
              label="Timing"
            />
            {data.timing_tamil && (
              <p lang="ta" className="mt-1 text-xs text-muted-foreground">
                {data.timing_tamil}
              </p>
            )}
          </div>
        </div>

        {/* Instructions — EN + Tamil side by side */}
        <div>
          <BilingualLabel
            english={MEDICATION_LABELS.instructions.en}
            tamil={MEDICATION_LABELS.instructions.ta}
          />
          <Input
            value={data.instructions}
            onChange={(e) => onChange("instructions", e.target.value)}
            placeholder="e.g., Mix with warm water, take before food"
          />
        </div>

        {isHomeopathy && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Potency
              </label>
              <Input
                value={data.potency}
                onChange={(e) => onChange("potency", e.target.value)}
                placeholder="e.g., 30C, 200C, 1M"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Dilution Scale
              </label>
              <PillGroup
                options={DILUTION_SCALE_OPTIONS.map((o) => ({ value: o.value, label: o.value }))}
                value={data.dilution_scale}
                onChange={(v) => onChange("dilution_scale", v)}
                label="Dilution Scale"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
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
          </div>
        )}
      </div>
    </div>
  );
}
