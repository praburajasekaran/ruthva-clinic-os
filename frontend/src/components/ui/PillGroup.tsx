"use client";

type PillGroupProps = {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

export function PillGroup({ options, value, onChange, label }: PillGroupProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
      {options.map((opt) => {
        const isSelected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(isSelected ? "" : opt)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              isSelected
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : "border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
