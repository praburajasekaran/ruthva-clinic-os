"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
type Therapy = { name: string; patient_count: number; last_activity: string };
type TherapyPatient = {
  patient_id: number;
  patient_name: string;
  record_id: string;
  last_activity: string;
  activity_count: number;
};
function Therapies() {
  const { user } = useAuth();
  const name = useSearchParams().get("name");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data: therapies, error: listError } = useApi<{ results: Therapy[] }>(
    name ? null : "/therapies/",
  );
  const { data: patients, error: patientError } = useApi<{
    count: number;
    results: TherapyPatient[];
  }>(name ? `/therapies/?name=${encodeURIComponent(name)}&page=${page}` : null);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">{name || "Therapies"}</h1>
        <p className="mt-2 text-text-secondary">
          {name
            ? "Patients with recorded sessions or prescribed procedures."
            : "Open a therapy to see the patients and their records."}
        </p>
      </div>
      <div className="flex flex-wrap gap-4">
        {name && (
          <Link
            href="/therapies"
            onClick={() => setPage(1)}
            className="text-brand-700"
          >
            ← All therapies
          </Link>
        )}
        <Link href="/follow-ups?view=clinical" className="text-brand-700">
          Session worklist →
        </Link>
        {user?.role === "doctor" && (
          <Link href="/visits/new" className="text-brand-700">
            Start a visit to prescribe therapy →
          </Link>
        )}
      </div>
      {(listError || patientError) && (
        <p role="alert">Could not load therapy records.</p>
      )}
      {!name && (
        <label className="block max-w-lg">
          Find a therapy
          <input
            className="mt-2 w-full rounded-xl border border-border px-4 py-3"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      )}
      {!name && therapies && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {therapies.results
            .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
            .map((t) => (
              <Link
                key={t.name}
                href={`/therapies?name=${encodeURIComponent(t.name)}`}
                className="rounded-2xl border border-border bg-white p-6 hover:border-brand-400"
              >
                <h2 className="text-xl">{t.name}</h2>
                <p className="mt-3 text-sm text-text-muted">
                  {t.patient_count} patient{t.patient_count === 1 ? "" : "s"} ·
                  Latest activity {t.last_activity}
                </p>
              </Link>
            ))}
          {!therapies.results.length && (
            <p className="text-text-muted">
              Therapies will appear here when a procedure or session is
              recorded.
            </p>
          )}
        </div>
      )}
      {name && patients && (
        <div className="divide-y divide-border rounded-2xl border border-border bg-white">
          {patients.results.map((p) => (
            <Link
              key={p.patient_id}
              href={`/patients/${p.patient_id}`}
              className="block p-5 hover:bg-brand-50"
            >
              <p className="font-semibold">{p.patient_name}</p>
              <p className="mt-1 text-sm text-text-muted">
                {p.record_id} · Latest activity {p.last_activity}
              </p>
            </Link>
          ))}
          {!patients.results.length && (
            <p className="p-5 text-text-muted">
              No patient records found for this therapy.
            </p>
          )}
        </div>
      )}
      {name && patients && patients.count > 20 && (
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span>Page {page}</span>
          <Button
            variant="secondary"
            disabled={page * 20 >= patients.count}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
export default function TherapiesPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Therapies />
    </Suspense>
  );
}
