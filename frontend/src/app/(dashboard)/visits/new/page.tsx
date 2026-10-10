"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import type { PaginatedResponse, PatientListItem } from "@/lib/types";

export default function StartVisitPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const { data, isLoading, error } = useApi<PaginatedResponse<PatientListItem>>(
    `/patients/?is_active=true&search=${encodeURIComponent(query)}&page=${page}`,
  );
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl">Start a visit</h1>
        <p className="mt-2 text-text-secondary">
          Find the patient, then record today’s consultation.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <Link href="/patients/new">Add a new patient</Link>
        </Button>
        <Link href="/consultations" className="px-3 py-3 text-brand-700">
          See all visits →
        </Link>
        <Link href="/prescriptions" className="px-3 py-3 text-brand-700">
          Prescriptions →
        </Link>
      </div>
      <label className="block font-semibold">
        Find a patient
        <input
          autoFocus
          className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-base font-normal"
          placeholder="Name, phone or record number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {error ? (
        <p role="alert">Could not load patients. Try again.</p>
      ) : isLoading ? (
        <p role="status" className="text-text-muted">
          Finding patients…
        </p>
      ) : !data?.results.length ? (
        <p className="rounded-xl border border-border bg-white p-5">
          No patient found. You can add a new patient above.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
          {data.results.map((patient) => (
            <li
              key={patient.id}
              className="flex flex-wrap items-center justify-between gap-3 p-5"
            >
              <div>
                <Link
                  className="font-semibold text-brand-800"
                  href={`/patients/${patient.id}`}
                >
                  {patient.name}
                </Link>
                <p className="mt-1 text-sm text-text-muted">
                  {patient.record_id} · {patient.calculated_age ?? patient.age}{" "}
                  years · {patient.phone}
                </p>
              </div>
              {user?.role === "doctor" && (
                <Button asChild variant="secondary">
                  <Link href={`/patients/${patient.id}/consultations/new`}>
                    Start visit
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {data && (data.next || data.previous) && (
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            disabled={!data.previous}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span>Page {page}</span>
          <Button
            variant="secondary"
            disabled={!data.next}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
