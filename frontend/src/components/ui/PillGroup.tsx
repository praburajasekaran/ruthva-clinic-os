"use client";

type PillOption = string | { value: string; label: string };

type PillGroupProps = {
  options: readonly PillOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

function getOptionValue(opt: PillOption): string {
  return typeof opt === "string" ? opt : opt.value;
}

function getOptionLabel(opt: PillOption): string {
  return typeof opt === "string" ? opt : opt.label;
}

export function PillGroup({ options, value, onChange, label }: PillGroupProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
      {options.map((opt) => {
        const optValue = getOptionValue(opt);
        const optLabel = getOptionLabel(opt);
        const isSelected = value === optValue;
        return (
          <button
            key={optValue}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(isSelected ? "" : optValue)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              isSelected
                ? "border-primary bg-accent text-primary"
                : "border-input bg-background text-muted-foreground hover:border-ring hover:bg-accent"
            }`}
          >
            {optLabel}
          </button>
        );
      })}
    </div>
  );
}
