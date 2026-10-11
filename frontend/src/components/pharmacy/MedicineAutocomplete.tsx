"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import {
  getMedicineSuggestions,
  normalizeMedicineName,
  type MedicineSuggestion,
  type MedicineSuggestionResponse,
} from "@/lib/medicine-suggestions";
import type { Discipline, Medicine } from "@/lib/types";

type Props = {
  value: string;
  onChange: (value: string, medicine?: Medicine) => void;
  placeholder?: string;
  discipline?: Discipline;
};

export function MedicineAutocomplete({
  value,
  onChange,
  placeholder = "Type medicine name...",
  discipline,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] =
    useState<MedicineSuggestion | null>(null);
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { results, isLoading, setQuery } = useDebouncedSearch<
    MedicineSuggestionResponse
  >({
    endpoint: "/pharmacy/medicine-suggestions/",
    queryParam: "search",
    minChars: 2,
  });

  const suggestions = useMemo(
    () =>
      getMedicineSuggestions(
        value,
        results?.results ?? [],
        discipline,
        results?.usage ?? [],
      ),
    [value, results, discipline],
  );
  const activeKeyIndex = suggestions.findIndex(
    (suggestion) => suggestion.key === activeSuggestion?.key,
  );
  const activeIndex =
    activeKeyIndex >= 0
      ? activeKeyIndex
      : suggestions.findIndex(
          (suggestion) =>
            activeSuggestion &&
            normalizeMedicineName(suggestion.name) ===
              normalizeMedicineName(activeSuggestion.name),
        );
  const showListbox = open && suggestions.length > 0;

  // APG mandatory: scroll active option into view
  useEffect(() => {
    if (activeIndex < 0 || !dropdownRef.current) return;
    const activeEl = dropdownRef.current.children[activeIndex];
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, showListbox]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setQuery(val);
    setOpen(true);
    setActiveSuggestion(null);
  };

  const handleSelect = (suggestion: MedicineSuggestion) => {
    onChange(suggestion.name, suggestion.medicine);
    setOpen(false);
    setActiveSuggestion(null);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label="Drug Name"
        aria-expanded={showListbox}
        aria-controls={showListbox ? listboxId : undefined}
        aria-activedescendant={
          showListbox && activeIndex >= 0
            ? `${listboxId}-${suggestions[activeIndex].key}`
            : undefined
        }
        aria-autocomplete="list"
        aria-haspopup="listbox"
        value={value}
        onChange={handleInputChange}
        onFocus={() => {
          setQuery(value);
          setOpen(true);
          setActiveSuggestion(null);
        }}
        onBlur={(e) => {
          // Don't close if focus moves into the dropdown
          if (
            !e.relatedTarget ||
            !dropdownRef.current?.contains(e.relatedTarget as Node)
          ) {
            setOpen(false);
            setActiveSuggestion(null);
          }
        }}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setQuery(value);
            setOpen(true);
            setActiveSuggestion(
              suggestions[Math.min(activeIndex + 1, suggestions.length - 1)] ??
                null,
            );
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setQuery(value);
            setOpen(true);
            setActiveSuggestion(
              suggestions[
                activeIndex < 0
                  ? suggestions.length - 1
                  : Math.max(activeIndex - 1, 0)
              ] ?? null,
            );
          } else if (e.key === "Enter" && showListbox && activeIndex >= 0) {
            e.preventDefault();
            handleSelect(suggestions[activeIndex]);
          } else if (e.key === "Escape") {
            setOpen(false);
            setActiveSuggestion(null);
          }
        }}
        placeholder={placeholder}
        className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />

      {open && (suggestions.length > 0 || isLoading) && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-background shadow-lg">
          {showListbox && (
            <div
              ref={dropdownRef}
              id={listboxId}
              role="listbox"
              aria-label="Medicine suggestions"
              className="max-h-48 overflow-auto"
            >
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.key}
                  id={`${listboxId}-${suggestion.key}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  tabIndex={-1}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(suggestion)}
                  className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent${activeIndex === index ? " bg-accent" : ""}`}
                >
                  <div>
                    <span className="font-medium text-foreground">
                      {suggestion.name}
                    </span>
                    {suggestion.medicine?.brand_name && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {suggestion.medicine.brand_name}
                      </span>
                    )}
                    {suggestion.medicine?.name_ta && (
                      <span lang="ta" className="ml-2 text-xs text-primary">
                        {suggestion.medicine.name_ta}
                      </span>
                    )}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {suggestion.medicine?.dosage_form ?? "Siddha EDL 2013"}
                    </span>
                  </div>
                  {suggestion.medicine && (
                    <span
                      className={`shrink-0 text-xs ${suggestion.medicine.is_low_stock ? "text-amber-600" : "text-muted-foreground"}`}
                    >
                      Stock: {suggestion.medicine.current_stock}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {isLoading && (
            <div
              aria-live="polite"
              aria-atomic="true"
              className="px-3 py-2 text-sm text-muted-foreground"
            >
              Searching clinic medicines…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
