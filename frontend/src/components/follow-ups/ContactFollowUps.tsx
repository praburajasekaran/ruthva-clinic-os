"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/Button";
import { PillGroup } from "@/components/ui/PillGroup";
import { ContactCreate } from "./ContactCreate";
import type { ContactTask } from "@/lib/types";

export function ContactFollowUps() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const patientId = params.get("patient");
  const [status, setStatus] = useState(
    params.get("status") === "awaiting_doctor" ? "awaiting_doctor" : "open",
  );
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(params.get("plan") === "true");
  const { data, isLoading, error, refetch } = useApi<{
    count: number;
    results: ContactTask[];
  }>(
    `/contact-follow-ups/?status=${status}&page=${page}${patientId ? `&patient=${encodeURIComponent(patientId)}` : ""}${params.get("due") === "true" && status === "open" ? "&due=true" : ""}`,
  );
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">Patient follow-ups</h1>
          <p className="mt-2 text-text-secondary">
            Keep track of calls and questions after a visit.
          </p>
        </div>
        {user?.role === "doctor" && !creating && (
          <Button onClick={() => setCreating(true)}>Plan follow-up</Button>
        )}
      </header>
      {patientId && (
        <Link
          href={`/patients/${encodeURIComponent(patientId)}`}
          className="inline-block text-brand-700"
        >
          ← Patient record
        </Link>
      )}
      {creating && user?.role === "doctor" && (
        <ContactCreate
          patientId={patientId ? Number(patientId) : undefined}
          onCancel={() => setCreating(false)}
          onCreated={(task) => router.push(`/follow-ups/contact/${task.id}`)}
        />
      )}
      <PillGroup
        label="Follow-up status"
        value={status}
        options={[
          { value: "open", label: "To contact" },
          { value: "awaiting_doctor", label: "Waiting for doctor" },
          { value: "completed", label: "Completed" },
        ]}
        onChange={(v) => {
          if (v) {
            setStatus(v);
            setPage(1);
          }
        }}
      />
      {error ? (
        <div role="alert">
          <p>Follow-ups could not be loaded.</p>
          <Button variant="secondary" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <p role="status" className="text-text-muted">
          Loading follow-ups…
        </p>
      ) : !data?.results.length ? (
        <p className="rounded-2xl border border-border bg-white p-6 text-text-muted">
          {status === "open"
            ? "No patient calls planned."
            : status === "awaiting_doctor"
              ? "No questions waiting for a doctor."
              : "No completed contact follow-ups."}
        </p>
      ) : (
        <ul className="space-y-3">
          {data.results.map((task) => (
            <li
              key={task.id}
              className="rounded-2xl border border-border bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link
                    className="font-semibold text-brand-800"
                    href={`/patients/${task.patient_id}`}
                  >
                    {task.patient_name}
                  </Link>
                  <p className="mt-1 text-sm text-text-muted">
                    Contact on {task.contact_date} · {task.assigned_to_name}
                  </p>
                  <p className="mt-3">{task.reason}</p>
                  {task.clinical_return_date && (
                    <p className="mt-2 text-sm text-text-muted">
                      Clinical return date {task.clinical_return_date}
                    </p>
                  )}
                </div>
                <Button asChild variant="secondary">
                  <Link href={`/follow-ups/contact/${task.id}`}>
                    Open follow-up
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && data.count > 20 && (
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
            disabled={page * 20 >= data.count}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
