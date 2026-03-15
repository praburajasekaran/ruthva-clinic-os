"use client";

import { useEffect, useMemo, useRef, useState, useCallback, useId } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, AlertCircle, User } from "lucide-react";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import type { PatientListItem, PaginatedResponse } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const previousFocusRef = useRef<Element | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [hasError, setHasError] = useState(false);
  const listboxId = useId();

  const { query, setQuery, results, isLoading, clear } = useDebouncedSearch<
    PaginatedResponse<PatientListItem>
  >({
    endpoint: "/patients/?page_size=8",
    queryParam: "search",
    debounceMs: 300,
    minChars: 2,
  });

  const patients = useMemo(() => results?.results ?? [], [results]);

  // Save focus target before opening; restore on close
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
      setSelectedIndex(-1);
      setHasError(false);
      // Focus input after the dialog renders
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      clear();
      setSelectedIndex(-1);
    }
  }, [open, clear]);

  // Restore focus on close
  const handleClose = useCallback(() => {
    onClose();
    requestAnimationFrame(() => {
      (previousFocusRef.current as HTMLElement | null)?.focus();
    });
  }, [onClose]);

  const navigateToPatient = useCallback(
    (id: number) => {
      handleClose();
      router.push(`/patients/${id}`);
    },
    [handleClose, router],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }

      if (isLoading || patients.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, patients.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (selectedIndex <= 0) {
          setSelectedIndex(-1);
          inputRef.current?.focus();
        } else {
          setSelectedIndex((prev) => prev - 1);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target =
          selectedIndex >= 0 ? patients[selectedIndex] : patients[0];
        if (target) navigateToPatient(target.id);
      }
    },
    [handleClose, isLoading, patients, selectedIndex, navigateToPatient],
  );

  // Focus trap: prevent Tab from escaping the modal
  const handleTabTrap = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Tab") return;
      e.preventDefault();
      // Only focusable elements are the input and the result items
      if (patients.length > 0) {
        if (!e.shiftKey) {
          if (selectedIndex < patients.length - 1) {
            setSelectedIndex((prev) => Math.min(prev + 1, patients.length - 1));
          } else {
            setSelectedIndex(-1);
            inputRef.current?.focus();
          }
        } else {
          if (selectedIndex > 0) {
            setSelectedIndex((prev) => prev - 1);
          } else {
            setSelectedIndex(patients.length - 1);
          }
        }
      }
    },
    [patients.length, selectedIndex],
  );

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[selectedIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!open) return null;

  const activeDescendantId =
    selectedIndex >= 0 ? `result-${selectedIndex}` : undefined;

  let statusContent: React.ReactNode = null;
  if (query.length === 0) {
    statusContent = (
      <p className="py-8 text-center text-sm text-gray-400">
        Type a patient name or phone number
      </p>
    );
  } else if (query.length === 1) {
    statusContent = (
      <p className="py-8 text-center text-sm text-gray-400">
        Type at least 2 characters to search…
      </p>
    );
  } else if (isLoading) {
    statusContent = (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
        <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />
        Searching…
      </div>
    );
  } else if (hasError) {
    statusContent = (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-red-600">
        <AlertCircle className="h-4 w-4" />
        Search unavailable — try again
      </div>
    );
  } else if (patients.length === 0 && results !== null) {
    statusContent = (
      <p className="py-8 text-center text-sm text-gray-400">
        No patients found for &ldquo;{query}&rdquo;
      </p>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search patients"
        className="fixed left-1/2 top-[10vh] z-60 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
        onKeyDown={(e) => {
          handleKeyDown(e);
          handleTabTrap(e);
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={patients.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeDescendantId}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
              setHasError(false);
            }}
            placeholder="Search patients by name or phone…"
            className="h-14 w-full bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden shrink-0 rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-400 sm:block">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {statusContent ?? (
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label="Patient search results"
              className="py-2"
            >
              {patients.map((patient, i) => (
                <li
                  key={patient.id}
                  id={`result-${i}`}
                  role="option"
                  aria-selected={i === selectedIndex}
                  onClick={() => navigateToPatient(patient.id)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    i === selectedIndex
                      ? "bg-emerald-50 text-emerald-900"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <User className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{patient.name}</span>
                    <span className="text-xs text-gray-500">
                      {patient.phone}
                      <span className="mx-1.5">·</span>
                      <span className="font-mono">{patient.record_id}</span>
                    </span>
                  </span>
                  {i === selectedIndex && (
                    <kbd className="shrink-0 rounded border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-xs font-mono text-emerald-600">
                      ↵
                    </kbd>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* ARIA live region for screen readers */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {!isLoading && results !== null && patients.length > 0
              ? `${patients.length} patient${patients.length === 1 ? "" : "s"} found`
              : null}
          </div>
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
          <span>
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 font-mono">↑</kbd>
            <kbd className="ml-0.5 rounded border border-gray-200 bg-gray-50 px-1 font-mono">↓</kbd>
            {" "}navigate
          </span>
          <span>
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 font-mono">↵</kbd>
            {" "}open
          </span>
          <span>
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 font-mono">Esc</kbd>
            {" "}close
          </span>
        </div>
      </div>
    </>
  );
}
