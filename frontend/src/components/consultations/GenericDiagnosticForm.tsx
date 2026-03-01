"use client";

type GenericDiagnosticFormProps = {
  value: string;
  onChange: (notes: string) => void;
};

export function GenericDiagnosticForm({
  value,
  onChange,
}: GenericDiagnosticFormProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Diagnostic Notes
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter diagnostic observations, findings, and notes..."
        rows={6}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
      />
    </div>
  );
}
