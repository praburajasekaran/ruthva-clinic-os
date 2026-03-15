"use client";
import { Spinner } from "@/components/ui/Spinner";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Pencil,
  Plus,
  Save,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { PatientBanner } from "@/components/patients/PatientBanner";
import { BlockEntryForm } from "@/components/treatments/BlockEntryForm";
import type {
  Patient,
  Prescription,
  SessionPlanEntry,
  TreatmentPlan,
  TreatmentSession,
} from "@/lib/types";

type SessionEditDraft = {
  procedure_name: string;
  medium_type: "oil" | "powder" | "other";
  medium_name: string;
  instructions: string;
};

type BlockDraft = {
  start_day_number: number;
  end_day_number: number;
  start_date: string;
  entries: SessionPlanEntry[];
};

const planStatusStyles: Record<TreatmentPlan["status"], string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

const blockStatusStyles: Record<string, string> = {
  planned: "bg-gray-100 text-gray-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function createDefaultBlockDraft(plan: TreatmentPlan): BlockDraft {
  const highestDay = Math.max(...plan.blocks.map((block) => block.end_day_number), 0);
  const nextDay = highestDay + 1;
  const remainingDays = Math.max(plan.total_days - highestDay, 1);
  const nextEndDay = nextDay + Math.min(remainingDays, 3) - 1;
  const startDate = plan.blocks.length > 0
    ? new Date(plan.blocks[plan.blocks.length - 1].end_date)
    : new Date();

  startDate.setDate(startDate.getDate() + 1);

  return {
    start_day_number: nextDay,
    end_day_number: nextEndDay,
    start_date: startDate.toISOString().slice(0, 10),
    entries: [
      {
        entry_type: "day_range",
        start_day_number: nextDay,
        end_day_number: nextEndDay,
        procedure_name: "",
        medium_type: "oil",
        medium_name: "",
        instructions: "",
      },
    ],
  };
}

export default function TreatmentPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canEdit = user?.role === "doctor" || user?.role === "admin";

  const {
    data: plan,
    isLoading,
    error,
    refetch,
  } = useApi<TreatmentPlan>(`/treatments/plans/${id}/`);
  const { data: patient } = useApi<Patient>(plan ? `/patients/${plan.patient_id}/` : null);
  const { data: prescription } = useApi<Prescription>(
    plan ? `/prescriptions/${plan.prescription}/` : null,
  );

  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [totalDaysDraft, setTotalDaysDraft] = useState(1);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [metaMessage, setMetaMessage] = useState("");

  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null);
  const [isAddingBlock, setIsAddingBlock] = useState(false);

  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [sessionDraft, setSessionDraft] = useState<SessionEditDraft | null>(null);
  const [isSavingSession, setIsSavingSession] = useState(false);

  useEffect(() => {
    if (!plan) return;
    setTotalDaysDraft(plan.total_days);
    if (!blockDraft) {
      setBlockDraft(createDefaultBlockDraft(plan));
    }
  }, [plan, blockDraft]);

  const sortedBlocks = [...(plan?.blocks ?? [])].sort(
    (a, b) => a.block_number - b.block_number,
  );

  const activePlan = plan?.status === "active";

  const resetMessages = () => setMetaMessage("");

  const savePlanMeta = async () => {
    if (!plan) return;
    setIsSavingMeta(true);
    resetMessages();

    try {
      await api.patch(`/treatments/plans/${plan.id}/`, {
        total_days: Number(totalDaysDraft),
      });
      setIsEditingMeta(false);
      setMetaMessage("Treatment plan updated.");
      await refetch();
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      setMetaMessage(detail ?? "Could not update treatment plan.");
    } finally {
      setIsSavingMeta(false);
    }
  };

  const cancelPlan = async () => {
    if (!plan) return;
    setIsSavingMeta(true);
    resetMessages();

    try {
      await api.patch(`/treatments/plans/${plan.id}/`, {
        status: "cancelled",
      });
      setMetaMessage("Treatment plan cancelled.");
      setIsEditingMeta(false);
      setShowBlockForm(false);
      await refetch();
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      setMetaMessage(detail ?? "Could not cancel treatment plan.");
    } finally {
      setIsSavingMeta(false);
    }
  };

  const submitBlock = async () => {
    if (!plan || !blockDraft) return;
    setIsAddingBlock(true);
    resetMessages();

    try {
      await api.post(`/treatments/plans/${plan.id}/blocks/`, {
        start_day_number: Number(blockDraft.start_day_number),
        end_day_number: Number(blockDraft.end_day_number),
        start_date: blockDraft.start_date,
        entries: blockDraft.entries.map((entry) => {
          if (entry.entry_type === "single_day") {
            return {
              entry_type: "single_day" as const,
              day_number: entry.day_number ?? blockDraft.start_day_number,
              procedure_name: entry.procedure_name,
              medium_type: entry.medium_type,
              medium_name: entry.medium_name,
              instructions: entry.instructions,
            };
          }

          return {
            entry_type: "day_range" as const,
            start_day_number: entry.start_day_number ?? blockDraft.start_day_number,
            end_day_number: entry.end_day_number ?? blockDraft.end_day_number,
            procedure_name: entry.procedure_name,
            medium_type: entry.medium_type,
            medium_name: entry.medium_name,
            instructions: entry.instructions,
          };
        }),
      });

      setShowBlockForm(false);
      setBlockDraft(null);
      setMetaMessage("Next block added.");
      await refetch();
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      setMetaMessage(detail ?? "Could not add the next block.");
    } finally {
      setIsAddingBlock(false);
    }
  };

  const startEditingSession = (session: TreatmentSession) => {
    setEditingSessionId(session.id);
    setSessionDraft({
      procedure_name: session.procedure_name,
      medium_type: session.medium_type,
      medium_name: session.medium_name,
      instructions: session.instructions,
    });
  };

  const saveSession = async () => {
    if (!editingSessionId || !sessionDraft) return;
    setIsSavingSession(true);
    resetMessages();

    try {
      await api.patch(`/treatments/sessions/${editingSessionId}/`, sessionDraft);
      setMetaMessage("Session updated.");
      setEditingSessionId(null);
      setSessionDraft(null);
      await refetch();
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      setMetaMessage(detail ?? "Could not update session.");
    } finally {
      setIsSavingSession(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error?.detail ?? "Treatment plan not found."}
        </div>
        <Link href="/follow-ups" className="text-sm font-medium text-emerald-700 hover:underline">
          Go to journeys
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {patient && <PatientBanner patient={patient} />}

      <div className="rounded-[28px] border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Treatment plan execution
            </p>
          <Link
            href={`/prescriptions/${plan.prescription}`}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to prescription
          </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary">Treatment Plan</h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              This page owns execution design: total duration, blocks, sessions, and future editable work.
              Journey continuity remains linked, but the focus here is how treatment will run over time.
            </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            <ClipboardList className="h-4 w-4" />
            <span>{plan.patient_name}</span>
            <span>&middot;</span>
            <span>Rx #{plan.prescription}</span>
            {prescription?.follow_up_date && (
              <>
                <span>&middot;</span>
                <span>Follow-up {formatDate(prescription.follow_up_date)}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {patient && (
            <Link
              href={`/patients/${patient.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-4 py-2.5 text-sm font-medium text-text-primary hover:border-brand-200 hover:bg-brand-50"
            >
              Patient
            </Link>
          )}
          <Link
            href={`/prescriptions/${plan.prescription}`}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-4 py-2.5 text-sm font-medium text-text-primary hover:border-brand-200 hover:bg-brand-50"
          >
            Prescription
          </Link>
          <Link
            href="/follow-ups"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-medium text-text-secondary hover:border-border-strong hover:text-text-primary"
          >
            Open Journeys
          </Link>
        </div>
      </div>
      </div>

      <div className="rounded-[28px] border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium capitalize ${planStatusStyles[plan.status]}`}
              >
                {plan.status}
              </span>
              <span className="text-sm text-text-secondary">
                Created {formatDate(plan.created_at)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-3xl border border-brand-200 bg-brand-50/70 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
                  Total Days
                </p>
                {isEditingMeta ? (
                  <input
                    type="number"
                    min={1}
                    value={totalDaysDraft}
                    onChange={(event) => setTotalDaysDraft(Number(event.target.value))}
                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                ) : (
                  <p className="mt-2 text-2xl font-semibold text-text-primary">{plan.total_days}</p>
                )}
              </div>

              <div className="rounded-3xl border border-border bg-surface-raised p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Blocks
                </p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{plan.blocks.length}</p>
              </div>

              <div className="rounded-3xl border border-border bg-surface-raised p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Sessions
                </p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {plan.blocks.reduce((count, block) => count + block.sessions.length, 0)}
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-surface-raised p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Patient ID
                </p>
                <p className="mt-2 text-lg font-semibold text-text-primary">
                  {plan.patient_record_id}
                </p>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="flex flex-wrap gap-2">
              {activePlan && !isEditingMeta && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsEditingMeta(true);
                    setTotalDaysDraft(plan.total_days);
                    resetMessages();
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Edit Plan
                </Button>
              )}

              {activePlan && isEditingMeta && (
                <>
                  <Button size="sm" isLoading={isSavingMeta} onClick={savePlanMeta}>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsEditingMeta(false);
                      setTotalDaysDraft(plan.total_days);
                      resetMessages();
                    }}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </>
              )}

              {activePlan && (
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={isSavingMeta && !isEditingMeta}
                  onClick={cancelPlan}
                >
                  Cancel Plan
                </Button>
              )}
            </div>
          )}
        </div>

        {metaMessage && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              metaMessage.includes("Could not")
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {metaMessage}
          </div>
        )}
      </div>

      {canEdit && activePlan && blockDraft && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Next Block</h2>
              <p className="text-sm text-gray-500">
                Add the next set of treatment sessions when this plan needs to continue.
              </p>
            </div>
            <Button
              variant={showBlockForm ? "secondary" : "primary"}
              size="sm"
              onClick={() => {
                setShowBlockForm((value) => !value);
                if (!showBlockForm) {
                  setBlockDraft(createDefaultBlockDraft(plan));
                }
                resetMessages();
              }}
            >
              <Plus className="h-4 w-4" />
              {showBlockForm ? "Hide Form" : "Add Next Block"}
            </Button>
          </div>

          {showBlockForm && (
            <div className="mt-5 space-y-5 rounded-lg border border-emerald-200 bg-emerald-50/40 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Day</label>
                  <input
                    type="number"
                    min={1}
                    max={plan.total_days}
                    value={blockDraft.start_day_number}
                    onChange={(event) =>
                      setBlockDraft((current) =>
                        current
                          ? {
                            ...current,
                            start_day_number: Number(event.target.value),
                          }
                          : current,
                      )
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Day</label>
                  <input
                    type="number"
                    min={blockDraft.start_day_number}
                    max={plan.total_days}
                    value={blockDraft.end_day_number}
                    onChange={(event) =>
                      setBlockDraft((current) =>
                        current
                          ? {
                            ...current,
                            end_day_number: Number(event.target.value),
                          }
                          : current,
                      )
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    value={blockDraft.start_date}
                    onChange={(event) =>
                      setBlockDraft((current) =>
                        current
                          ? {
                            ...current,
                            start_date: event.target.value,
                          }
                          : current,
                      )
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <BlockEntryForm
                blockStartDay={blockDraft.start_day_number}
                blockEndDay={blockDraft.end_day_number}
                entries={blockDraft.entries}
                onChange={(entries) =>
                  setBlockDraft((current) => (current ? { ...current, entries } : current))
                }
              />

              <div className="flex gap-3">
                <Button size="sm" isLoading={isAddingBlock} onClick={submitBlock}>
                  <CheckCircle2 className="h-4 w-4" />
                  Save Block
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowBlockForm(false);
                    setBlockDraft(createDefaultBlockDraft(plan));
                  }}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {sortedBlocks.map((block) => (
          <div key={block.id} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Block {block.block_number}
                  </h2>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                      blockStatusStyles[block.status] ?? blockStatusStyles.planned
                    }`}
                  >
                    {block.status.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <span>Day {block.start_day_number} to {block.end_day_number}</span>
                  <span>&middot;</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(block.start_date)} to {formatDate(block.end_date)}
                  </span>
                  {block.completed_at && (
                    <>
                      <span>&middot;</span>
                      <span>Completed {formatDate(block.completed_at)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {block.sessions
                .slice()
                .sort((a, b) => a.day_number - b.day_number || a.sequence_number - b.sequence_number)
                .map((session) => {
                  const isEditing = editingSessionId === session.id;
                  const canEditSession =
                    canEdit && activePlan && session.execution_status === "planned";

                  return (
                    <div
                      key={session.id}
                      className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              Day {session.day_number}
                              {session.sequence_number > 1 ? ` · Session ${session.sequence_number}` : ""}
                            </h3>
                            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium capitalize text-gray-600">
                              {session.execution_status.replace("_", " ")}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            {formatDate(session.session_date)}
                          </p>
                        </div>

                        {canEditSession && !isEditing && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => startEditingSession(session)}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit Session
                          </Button>
                        )}
                      </div>

                      {isEditing && sessionDraft ? (
                        <div className="mt-4 space-y-4">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                                Procedure
                              </label>
                              <input
                                type="text"
                                value={sessionDraft.procedure_name}
                                onChange={(event) =>
                                  setSessionDraft((current) =>
                                    current
                                      ? { ...current, procedure_name: event.target.value }
                                      : current,
                                  )
                                }
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                                Medium Type
                              </label>
                              <select
                                value={sessionDraft.medium_type}
                                onChange={(event) =>
                                  setSessionDraft((current) =>
                                    current
                                      ? {
                                        ...current,
                                        medium_type: event.target.value as SessionEditDraft["medium_type"],
                                      }
                                      : current,
                                  )
                                }
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                              >
                                <option value="oil">Oil</option>
                                <option value="powder">Powder</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                                Medium Name
                              </label>
                              <input
                                type="text"
                                value={sessionDraft.medium_name}
                                onChange={(event) =>
                                  setSessionDraft((current) =>
                                    current
                                      ? { ...current, medium_name: event.target.value }
                                      : current,
                                  )
                                }
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                                Instructions
                              </label>
                              <input
                                type="text"
                                value={sessionDraft.instructions}
                                onChange={(event) =>
                                  setSessionDraft((current) =>
                                    current
                                      ? { ...current, instructions: event.target.value }
                                      : current,
                                  )
                                }
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                              />
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <Button size="sm" isLoading={isSavingSession} onClick={saveSession}>
                              <Save className="h-4 w-4" />
                              Save Session
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditingSessionId(null);
                                setSessionDraft(null);
                              }}
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              Procedure
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {session.procedure_name || "Not set"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              Medium
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {session.medium_name || "No medium name"}
                              <span className="ml-1 text-gray-500 capitalize">
                                ({session.medium_type})
                              </span>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              Instructions
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {session.instructions || "No instructions"}
                            </dd>
                          </div>
                        </dl>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
