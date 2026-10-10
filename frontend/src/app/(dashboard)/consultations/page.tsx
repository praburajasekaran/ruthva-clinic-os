"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import type { PaginatedResponse } from "@/lib/types";

type Visit = {
  id: number;
  patient: number;
  patient_name: string;
  patient_record_id: string;
  consultation_date: string;
  diagnosis: string;
  has_prescription: boolean;
};
export default function ConsultationsPage() {
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
  const { data, error, isLoading } = useApi<PaginatedResponse<Visit>>(
    `/consultations/?search=${encodeURIComponent(query)}&page=${page}`,
  );
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-page">Visits</h1>
          <p className="mt-2 text-text-muted">
            {data
              ? `${data.count} recorded visits`
              : "Consultations and prescriptions"}
          </p>
        </div>
        {user?.role === "doctor" && (
          <Button asChild>
            <Link href="/visits/new">Start visit</Link>
          </Button>
        )}
      </header>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="block w-full max-w-lg">
          Find visits by patient
          <input
            className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Patient name or record number"
          />
        </label>
        <Link className="py-3 text-brand-700" href="/prescriptions">
          All prescriptions →
        </Link>
      </div>
      {error ? (
        <p role="alert">Could not load visits. Try again.</p>
      ) : isLoading ? (
        <p role="status" className="text-text-muted">
          Loading visits…
        </p>
      ) : !data?.results.length ? (
        <p className="rounded-xl border border-border bg-white p-6 text-text-muted">
          No visits found.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-white">
          {data.results.map((visit) => (
            <div
              key={visit.id}
              className="flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div>
                <Link
                  href={`/patients/${visit.patient}`}
                  className="font-semibold text-brand-800"
                >
                  {visit.patient_name}
                </Link>
                <p className="mt-1 text-sm text-text-muted">
                  {visit.consultation_date} · {visit.patient_record_id}
                </p>
                {visit.diagnosis && <p className="mt-1">{visit.diagnosis}</p>}
              </div>
              <Link
                href={`/consultations/${visit.id}`}
                className="rounded-lg border border-border px-4 py-3 text-brand-700"
              >
                {visit.has_prescription ? "Review visit" : "Finish visit"} →
              </Link>
            </div>
          ))}
        </div>
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
