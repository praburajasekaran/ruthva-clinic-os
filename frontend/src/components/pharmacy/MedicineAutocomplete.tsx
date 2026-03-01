"use client";

import { useRef, useState } from "react";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import type { Medicine, PaginatedResponse } from "@/lib/types";

type Props = {
  value: string;
  onChange: (value: string, medicine?: Medicine) => void;
  placeholder?: string;
};

export function MedicineAutocomplete({ value, onChange, placeholder = "Type medicine name..." }: Props) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, isLoading, setQuery } = useDebouncedSearch<PaginatedResponse<Medicine>>({
    endpoint: "/pharmacy/medicines/",
    queryParam: "search",
    minChars: 2,
  });

  const medicines = results?.results?.filter((m) => m.is_active) ?? [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setQuery(val);
    setOpen(true);
  };

  const handleSelect = (medicine: Medicine) => {
    onChange(medicine.name, medicine);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => value.length >= 2 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder}
        className="w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />

      {open && (medicines.length > 0 || isLoading) && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-white shadow-lg">
          {isLoading && (
            <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>
          )}
          {medicines.map((medicine) => (
            <button
              key={medicine.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(medicine)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-emerald-50"
            >
              <div>
                <span className="font-medium text-gray-900">{medicine.name}</span>
                {medicine.name_ta && (
                  <span className="ml-2 text-xs text-emerald-600">{medicine.name_ta}</span>
                )}
                <span className="ml-2 text-xs text-gray-400">{medicine.dosage_form}</span>
              </div>
              <span className={`text-xs ${medicine.is_low_stock ? "text-amber-600" : "text-gray-400"}`}>
                Stock: {medicine.current_stock}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
