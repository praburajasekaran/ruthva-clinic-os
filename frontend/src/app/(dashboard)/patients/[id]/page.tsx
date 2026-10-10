"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Archive, ArchiveRestore, Plus } from "lucide-react";
import { PatientBanner } from "@/components/patients/PatientBanner";
import { PatientSummary } from "@/components/patients/PatientSummary";
import {
  PatientHistory,
  patientGaps,
} from "@/components/patients/PatientHistory";
import { PatientShortcutsInit } from "@/components/patients/PatientShortcutsInit";
import { RemedyHistoryTimeline } from "@/components/patients/RemedyHistoryTimeline";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { KbdBadge } from "@/components/ui/KbdBadge";
import { useApi } from "@/hooks/useApi";
import { pharmacyApi } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Patient, PaginatedResponse } from "@/lib/types";

type Visit = {
  id: number;
  consultation_date: string;
  chief_complaints: string;
  diagnosis: string;
  has_prescription: boolean;
};
const tabs = [
  { value: "overview", label: "Overview" },
  { value: "visits", label: "Visits" },
  { value: "history", label: "Health history" },
  { value: "details", label: "Patient details" },
];
const fields: { key: keyof Patient; label: string }[] = [
  { key: "date_of_birth", label: "Date of birth" },
  { key: "phone", label: "Phone" },
  { key: "whatsapp_number", label: "WhatsApp" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "blood_group", label: "Blood group" },
  { key: "occupation", label: "Occupation" },
  { key: "marital_status", label: "Marital status" },
  { key: "referred_by", label: "Referred by" },
  { key: "food_habits", label: "Food habits" },
  { key: "activity_level", label: "Activity level" },
  { key: "menstrual_history", label: "Menstrual history" },
  { key: "number_of_children", label: "Number of children" },
  { key: "vaccination_records", label: "Vaccination records" },
];

function PatientRecord() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const tab = tabs.some((t) => t.value === search.get("tab"))
    ? search.get("tab")
    : "overview";
  const { user } = useAuth();
  const {
    data: patient,
    isLoading,
    error,
    refetch,
  } = useApi<Patient>(`/patients/${params.id}/`);
  const [page, setPage] = useState(1);
  const { data: visits, error: visitError } = useApi<PaginatedResponse<Visit>>(
    `/consultations/?patient=${params.id}&page=${page}`,
  );
  const [toggling, setToggling] = useState(false);
  const [actionError, setActionError] = useState("");
  const canEdit = user?.role === "doctor";
  async function toggleActive() {
    if (!patient) return;
    setToggling(true);
    setActionError("");
    try {
      await pharmacyApi.togglePatientActive(patient.id);
      await refetch();
    } catch {
      setActionError("Could not change patient status. Try again.");
    } finally {
      setToggling(false);
    }
  }
  if (isLoading || (patient && patient.id !== Number(params.id)))
    return (
      <div className="py-20 text-center">
        <Spinner />
      </div>
    );
  if (!patient)
    return <p role="alert">{error?.detail || "Patient not found."}</p>;
  const gaps = patientGaps(patient);
  const shownVisits =
    tab === "overview"
      ? (visits?.results ?? []).slice(0, 3)
      : (visits?.results ?? []);
  return (
    <div className="space-y-5">
      <PatientShortcutsInit patientId={patient.id} />
      <Link
        href="/patients"
        className="inline-block py-2 text-sm text-brand-700"
      >
        ← All patients
      </Link>
      <PatientBanner patient={patient}>
        {canEdit && (
          <PatientSummary
            patient={patient}
            canGenerate={!user?.clinic?.subdomain?.startsWith("demo")}
          />
        )}
      </PatientBanner>
      <div className="flex flex-wrap items-center gap-3">
        {(user?.role === "doctor" || user?.role === "admin") && (
          <Button asChild variant="secondary">
            <Link href={`/follow-ups?patient=${patient.id}`}>
              Patient follow-ups
            </Link>
          </Button>
        )}
        {canEdit && (
          <Button asChild>
            <Link href={`/patients/${patient.id}/consultations/new`}>
              <Plus className="h-4 w-4" />
              Start visit
              <KbdBadge
                keys={["C"]}
                aria-label="Press C to start a new consultation"
              />
            </Link>
          </Button>
        )}
        <Button asChild variant="secondary">
          <Link href={`/patients/${patient.id}/edit`}>Edit patient</Link>
        </Button>
        <Button variant="ghost" onClick={toggleActive} disabled={toggling}>
          {patient.is_active ? (
            <Archive className="h-4 w-4" />
          ) : (
            <ArchiveRestore className="h-4 w-4" />
          )}
          {patient.is_active ? "Archive patient" : "Reactivate patient"}
        </Button>
      </div>
      {actionError && (
        <p role="alert" className="text-red-700">
          {actionError}
        </p>
      )}
      {!patient.is_active && (
        <p className="rounded-xl border border-border bg-white p-4 text-text-muted">
          This patient is archived and does not count toward your active patient
          limit.
        </p>
      )}
      <nav
        aria-label="Patient record sections"
        className="flex flex-wrap gap-1 border-b border-border pb-2"
      >
        {tabs.map((t) => (
          <Link
            key={t.value}
            aria-current={tab === t.value ? "page" : undefined}
            onClick={() => setPage(1)}
            href={`/patients/${patient.id}?tab=${t.value}`}
            className={`rounded-lg px-4 py-3 ${tab === t.value ? "bg-brand-50 font-semibold text-brand-800" : "text-text-secondary hover:bg-white"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {canEdit && gaps.length > 0 && tab !== "details" && (
        <aside className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="font-semibold text-amber-900">Check with the patient</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {gaps.map((gap) => (
              <Link
                key={gap}
                href={`/patients/${patient.id}?tab=history`}
                className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-amber-900"
              >
                {gap} →
              </Link>
            ))}
          </div>
        </aside>
      )}
      {(tab === "overview" || tab === "visits") && (
        <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-heading-section">
              {tab === "overview" ? "Recent visits" : "Visits"}
            </h2>
            {tab === "overview" && (
              <Link
                className="text-sm text-brand-700"
                href={`/patients/${patient.id}?tab=visits`}
              >
                See all visits →
              </Link>
            )}
          </div>
          {visitError ? (
            <p role="alert" className="mt-4">
              Visit history could not be loaded.
            </p>
          ) : !visits ? (
            <p className="mt-4 text-text-muted">Loading visits…</p>
          ) : !shownVisits.length ? (
            <p className="mt-4 text-text-muted">No visits recorded yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {shownVisits.map((visit) => (
                <Link
                  key={visit.id}
                  href={`/consultations/${visit.id}`}
                  className="block py-4 hover:text-brand-700"
                >
                  <p className="text-sm text-text-muted">
                    {new Date(
                      `${visit.consultation_date}T00:00:00`,
                    ).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {visit.has_prescription ? " · Prescription recorded" : ""}
                  </p>
                  {visit.chief_complaints && (
                    <p className="mt-1 font-semibold">
                      {visit.chief_complaints}
                    </p>
                  )}
                  {visit.diagnosis && (
                    <p className="mt-1 text-text-secondary">
                      {visit.diagnosis}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
          {tab === "visits" && visits && (visits.next || visits.previous) && (
            <div className="mt-4 flex items-center gap-3">
              <Button
                variant="secondary"
                disabled={!visits.previous}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span>Page {page}</span>
              <Button
                variant="secondary"
                disabled={!visits.next}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </section>
      )}
      {tab === "history" && (
        <PatientHistory
          key={patient.id}
          patient={patient}
          onSaved={refetch}
          canEdit={canEdit}
        />
      )}
      {tab === "history" && user?.clinic?.discipline === "homeopathy" && (
        <section className="rounded-2xl border border-border bg-white p-6">
          <h2 className="text-heading-section mb-4">Constitutional remedy history</h2>
          <RemedyHistoryTimeline patientId={patient.id} />
        </section>
      )}
      {tab === "details" && (
        <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-heading-section">Patient details</h2>
            <Link
              className="text-brand-700"
              href={`/patients/${patient.id}/edit`}
            >
              Add or edit details →
            </Link>
          </div>
          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-text-muted">Age</dt>
              <dd>{patient.calculated_age ?? patient.age} years</dd>
            </div>
            <div>
              <dt className="text-sm text-text-muted">Gender</dt>
              <dd className="capitalize">{patient.gender}</dd>
            </div>
            {fields.map(({ key, label }) => {
              const value = patient[key];
              return value === null ||
                value === undefined ||
                value === "" ? null : (
                <div key={key}>
                  <dt className="text-sm text-text-muted">{label}</dt>
                  <dd className="whitespace-pre-wrap">
                    {String(value).replaceAll("_", " ")}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}
    </div>
  );
}

export default function PatientDetailPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <PatientRecord />
    </Suspense>
  );
}
