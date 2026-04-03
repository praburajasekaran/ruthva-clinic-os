"use client";

type PillGroupProps = {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

export function PillGroup({ options, value, onChange, label }: PillGroupProps) {
  return (
    <div className="flex flex-wrap" role="radiogroup" aria-label={label}>
      {options.map((opt, i) => {
        const isSelected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(isSelected ? "" : opt)}
            className={`border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
              i === 0
                ? "rounded-l-lg"
                : ""
            } ${
              i === options.length - 1
                ? "rounded-r-lg"
                : "border-r-0"
            } ${
              isSelected
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
