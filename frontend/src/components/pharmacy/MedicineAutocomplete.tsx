"use client";

import { useEffect, useRef, useState } from "react";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import type { Medicine, PaginatedResponse } from "@/lib/types";

type Props = {
  value: string;
  onChange: (value: string, medicine?: Medicine) => void;
  placeholder?: string;
};

export function MedicineAutocomplete({ value, onChange, placeholder = "Type medicine name..." }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { results, isLoading, setQuery } = useDebouncedSearch<PaginatedResponse<Medicine>>({
    endpoint: "/pharmacy/medicines/",
    queryParam: "search",
    minChars: 2,
  });

  const medicines = results?.results?.filter((m) => m.is_active) ?? [];

  // APG mandatory: scroll active option into view
  useEffect(() => {
    if (activeIndex < 0 || !dropdownRef.current) return;
    const activeEl = dropdownRef.current.querySelector(
      `#medicine-option-${activeIndex}`
    ) as HTMLElement | null;
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setQuery(val);
    setOpen(true);
    setActiveIndex(-1);
  };

  const handleSelect = (medicine: Medicine) => {
    onChange(medicine.name, medicine);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="medicine-listbox"
        aria-activedescendant={activeIndex >= 0 ? `medicine-option-${activeIndex}` : undefined}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        value={value}
        onChange={handleInputChange}
        onFocus={() => value.length >= 2 && setOpen(true)}
        onBlur={(e) => {
          // Don't close if focus moves into the dropdown
          if (!e.relatedTarget || !dropdownRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
        onKeyDown={(e) => {
          if (!open && e.key === "ArrowDown") {
            setOpen(true);
            return;
          }
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, medicines.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, -1));
          } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            handleSelect(medicines[activeIndex]);
            setActiveIndex(-1);
          } else if (e.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
        placeholder={placeholder}
        className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />

      {/* Loading feedback — outside listbox, polite live region */}
      {open && isLoading && (
        <div aria-live="polite" aria-atomic="true" className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground shadow-lg">
          Searching…
        </div>
      )}
      {open && medicines.length > 0 && (
        <div
          ref={dropdownRef}
          id="medicine-listbox"
          role="listbox"
          aria-label="Medicine suggestions"
          className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-white shadow-lg"
        >
          {medicines.map((medicine, index) => (
            <div
              key={medicine.id}
              id={`medicine-option-${index}`}
              role="option"
              aria-selected={activeIndex === index}
              tabIndex={-1}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(medicine)}
              className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent${activeIndex === index ? " bg-accent" : ""}`}
            >
              <div>
                <span className="font-medium text-gray-900">{medicine.name}</span>
                {medicine.brand_name && (
                  <span className="ml-2 text-xs text-muted-foreground">{medicine.brand_name}</span>
                )}
                {medicine.name_ta && (
                  <span lang="ta" className="ml-2 text-xs text-primary">{medicine.name_ta}</span>
                )}
                <span className="ml-2 text-xs text-muted-foreground">{medicine.dosage_form}</span>
              </div>
              <span className={`text-xs ${medicine.is_low_stock ? "text-amber-600" : "text-muted-foreground"}`}>
                Stock: {medicine.current_stock}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
