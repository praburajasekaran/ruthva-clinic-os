"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/Button";
import { PillGroup } from "@/components/ui/PillGroup";
import type {
  ContactAction,
  ContactEvent,
  ContactStaff,
  ContactTask,
} from "@/lib/types";

const actionLabels: Record<ContactAction, string> = {
  reached: "Reached patient; contact completed",
  no_answer: "No answer",
  call_later: "Call later",
  question: "Question for doctor",
  doctor_reply: "Doctor reply",
  reopen: "Contact reopened",
  assign: "Assignment changed",
};
type TaskDetail = ContactTask & { events: ContactEvent[]; event_count: number };
function ContactRecord({
  task,
  refetch,
}: {
  task: TaskDetail;
  refetch: () => Promise<void>;
}) {
  const { user } = useAuth();
  const doctor = user?.role === "doctor";
  const [action, setAction] = useState<ContactAction>(
    task.status === "awaiting_doctor"
      ? "doctor_reply"
      : task.status === "completed"
        ? "reopen"
        : "reached",
  );
  const [note, setNote] = useState("");
  const [retryDate, setRetryDate] = useState("");
  const [owner, setOwner] = useState(String(task.assigned_to_id || ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { data: staff } = useApi<ContactStaff[]>(
    doctor ? "/contact-follow-ups/staff/" : null,
  );
  const needsRetry = ["no_answer", "call_later", "reopen"].includes(action);
  async function save(event: ContactAction) {
    setBusy(true);
    setError("");
    try {
      await api.post(`/contact-follow-ups/${task.id}/events/`, {
        action: event,
        expected_revision: task.revision,
        note,
        next_contact_date: retryDate,
        assigned_to_id: Number(owner),
      });
      window.dispatchEvent(new Event("contact-follow-ups-updated"));
      await refetch();
    } catch (err) {
      setError(
        (err as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail || "Could not save. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const inputClass =
    "mt-2 w-full rounded-lg border border-border bg-white px-3 py-3 text-base";
  const canRecord = task.status === "open" || doctor;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/follow-ups?patient=${task.patient_id}`}
        className="inline-block py-2 text-brand-700"
      >
        ← Patient follow-ups
      </Link>
      <header>
        <h1 className="text-heading-page">Follow up with {task.patient_name}</h1>
        <Link
          href={`/patients/${task.patient_id}`}
          className="mt-2 inline-block text-brand-700"
        >
          Open patient record →
        </Link>
      </header>
      <section className="space-y-3 rounded-2xl border border-border bg-white p-5">
        <p className="font-semibold">{task.reason}</p>
        <p>
          Contact on {task.contact_date} · {task.assigned_to_name}
        </p>
        {task.clinical_return_date && (
          <p className="text-text-muted">
            Clinical return date {task.clinical_return_date}
          </p>
        )}
        <p>
          Phone{" "}
          <a className="text-brand-700 underline" href={`tel:${task.phone}`}>
            {task.phone}
          </a>
        </p>
        <p className="text-sm text-text-muted">
          {task.status === "completed"
            ? "Contact completed. Clinical follow-up stays on the patient record."
            : task.status === "awaiting_doctor"
              ? "Waiting for a doctor’s reply."
              : "Ready for contact."}
        </p>
      </section>
      {canRecord && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save(action);
          }}
          className="space-y-5 rounded-2xl border border-border bg-white p-5"
        >
          <h2 className="text-heading-section">
            {task.status === "awaiting_doctor"
              ? "Answer the question"
              : task.status === "completed"
                ? "Plan another contact"
                : "Record contact"}
          </h2>
          <fieldset disabled={busy} className="space-y-5">
            {task.status === "open" && (
              <PillGroup
                label="Contact outcome"
                value={action}
                options={[
                  { value: "reached", label: "Reached patient" },
                  { value: "no_answer", label: "No answer" },
                  { value: "call_later", label: "Call later" },
                  { value: "question", label: "Ask doctor" },
                ]}
                onChange={(v) => {
                  if (v) setAction(v as ContactAction);
                }}
              />
            )}
            <label className="block">
              {action === "doctor_reply"
                ? "Doctor reply"
                : action === "question"
                  ? "Question for doctor"
                  : "Call notes"}
              <textarea
                required={action === "question" || action === "doctor_reply"}
                maxLength={4000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={inputClass}
              />
            </label>
            {needsRetry && (
              <label className="block max-w-xs">
                Next contact date
                <input
                  type="date"
                  required
                  value={retryDate}
                  onChange={(e) => setRetryDate(e.target.value)}
                  className={inputClass}
                />
              </label>
            )}
            {error && (
              <p role="alert" className="text-red-700">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={busy}>
                {busy
                  ? "Saving…"
                  : action === "doctor_reply"
                    ? "Save doctor reply"
                    : action === "reopen"
                      ? "Reopen contact"
                      : "Save contact"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void refetch()}
              >
                Reload follow-up
              </Button>
            </div>
          </fieldset>
        </form>
      )}
      {doctor && task.status !== "completed" && staff && (
        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="text-heading-section mb-3">Assigned to</h2>
          <PillGroup
            label="Change assignment"
            value={owner}
            options={staff.map((s) => ({
              value: String(s.id),
              label: `${s.name} · ${s.role === "admin" ? "Admin staff" : "Doctor"}`,
            }))}
            onChange={(v) => {
              if (v) setOwner(v);
            }}
          />
          <Button
            className="mt-4"
            variant="secondary"
            disabled={busy || !owner || Number(owner) === task.assigned_to_id}
            onClick={() => void save("assign")}
          >
            Save assignment
          </Button>
        </section>
      )}
      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="text-heading-section mb-4">Contact history</h2>
        {task.event_count > 100 && (
          <p className="mb-3 text-sm text-text-muted">
            Showing the latest 100 of {task.event_count} entries.
          </p>
        )}
        <ol className="space-y-5">
          {task.events.map((event) => (
            <li key={event.id}>
              <p className="font-semibold">{actionLabels[event.action]}</p>
              {event.note && (
                <p className="mt-1 whitespace-pre-wrap">{event.note}</p>
              )}
              {event.next_contact_date && (
                <p className="mt-1">Next contact {event.next_contact_date}</p>
              )}
              {event.assigned_to_name && (
                <p className="mt-1">Assigned to {event.assigned_to_name}</p>
              )}
              <p className="mt-1 text-sm text-text-muted">
                {event.actor_name} ·{" "}
                {new Date(event.created_at).toLocaleString("en-IN")}
              </p>
            </li>
          ))}
        </ol>
        {!task.events.length && (
          <p className="text-text-muted">No contact recorded yet.</p>
        )}
      </section>
    </div>
  );
}
export default function ContactPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading, refetch } = useApi<TaskDetail>(
    `/contact-follow-ups/${id}/`,
  );
  if (isLoading || (data && data.id !== Number(id)))
    return <p role="status">Loading follow-up…</p>;
  if (!data)
    return (
      <div role="alert">
        <p>{error?.detail || "Follow-up could not be loaded."}</p>
        <Button variant="secondary" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  return (
    <ContactRecord
      key={`${data.id}-${data.revision}`}
      task={data}
      refetch={refetch}
    />
  );
}
