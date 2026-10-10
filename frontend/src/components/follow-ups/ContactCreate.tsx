"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { PillGroup } from "@/components/ui/PillGroup";
import type {
  ContactStaff,
  ContactTask,
  Patient,
  PatientListItem,
  PaginatedResponse,
} from "@/lib/types";

export function ContactCreate({
  patientId,
  onCreated,
  onCancel,
}: {
  patientId?: number;
  onCreated: (task: ContactTask) => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<number | undefined>(patientId);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [owner, setOwner] = useState(String(user?.id || ""));
  const [date, setDate] = useState(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  const [reason, setReason] = useState("");
  const [requestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const {
    data: patient,
    error: patientError,
    refetch: reloadPatient,
  } = useApi<Patient>(selected ? `/patients/${selected}/` : null);
  const {
    data: patients,
    isLoading: finding,
    error: patientsError,
    refetch: reloadPatients,
  } = useApi<PaginatedResponse<PatientListItem>>(
    selected
      ? null
      : `/patients/?is_active=true&search=${encodeURIComponent(query)}&page=${page}`,
  );
  const {
    data: staff,
    error: staffError,
    refetch: reloadStaff,
  } = useApi<ContactStaff[]>("/contact-follow-ups/staff/");
  const inputClass =
    "mt-2 w-full rounded-lg border border-border bg-white px-3 py-3 text-base";
  async function create() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const response = await api.post<ContactTask>("/contact-follow-ups/", {
        patient_id: selected,
        assigned_to_id: Number(owner || user?.id),
        contact_date: date,
        reason,
        request_id: requestId,
      });
      window.dispatchEvent(new Event("contact-follow-ups-updated"));
      onCreated(response.data);
    } catch (err) {
      setError(
        (err as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail || "Could not save the follow-up. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void create();
      }}
      className="space-y-5 rounded-2xl border border-border bg-white p-5 sm:p-6"
    >
      <h2 className="text-heading-section">Plan a patient follow-up</h2>
      <fieldset disabled={busy} className="space-y-5">
        {selected ? (
          <div>
            <p className="font-semibold">
              {patient?.id === selected ? patient.name : "Loading patient…"}
            </p>
            {patientError && (
              <div role="alert">
                <p>Patient could not be loaded.</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void reloadPatient()}
                >
                  Try loading the patient again
                </Button>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelected(undefined)}
            >
              Choose a different patient
            </Button>
          </div>
        ) : (
          <div>
            <label>
              Find a patient
              <input
                className={inputClass}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, phone or record number"
              />
            </label>
            {patientsError ? (
              <div role="alert">
                <p>Patients could not be loaded.</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void reloadPatients()}
                >
                  Try searching again
                </Button>
              </div>
            ) : finding ? (
              <p className="mt-3">Finding patients…</p>
            ) : (
              <ul className="mt-3 max-h-72 divide-y divide-border overflow-y-auto">
                {!patients?.results.length && (
                  <li className="py-3 text-text-muted">No patients found.</li>
                )}
                {patients?.results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(p.id)}
                      className="w-full px-2 py-3 text-left hover:bg-brand-50"
                    >
                      <strong>{p.name}</strong>
                      <span className="ml-3 text-sm text-text-muted">
                        {p.record_id} · {p.phone}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {patients && (patients.next || patients.previous) && (
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!patients.previous}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!patients.next}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
            <Link
              href="/patients/new"
              className="mt-3 inline-block text-brand-700"
            >
              Add a new patient →
            </Link>
          </div>
        )}
        <label className="block">
          Reason for contacting
          <textarea
            required
            maxLength={2000}
            className={inputClass}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What should we check with the patient?"
          />
        </label>
        <label className="block max-w-xs">
          Contact on
          <input
            type="date"
            required
            className={inputClass}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <div>
          <p className="mb-2">Assigned to</p>
          {staff && (
            <PillGroup
              label="Assign follow-up"
              value={owner || String(user?.id || "")}
              options={staff.map((s) => ({
                value: String(s.id),
                label: `${s.name} · ${s.role === "admin" ? "Admin staff" : "Doctor"}`,
              }))}
              onChange={(v) => {
                if (v) setOwner(v);
              }}
            />
          )}
          {staffError && (
            <div role="alert">
              <p>Staff could not be loaded.</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void reloadStaff()}
              >
                Try loading staff again
              </Button>
            </div>
          )}
          <p className="mt-2 text-sm text-text-muted">
            Admin staff can record calls. A doctor answers clinical questions.
          </p>
        </div>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={
              busy ||
              !selected ||
              patient?.id !== selected ||
              !!patientError ||
              !staff?.length
            }
          >
            {busy ? "Saving…" : "Save follow-up"}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
