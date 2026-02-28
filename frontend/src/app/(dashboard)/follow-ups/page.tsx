"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/Button";
import type {
  DoctorActionItem,
  FollowUpsResponse,
  LegacyFollowUpItem,
  TherapistWorklistItem,
} from "@/lib/types";

type QueueTab = "all" | "therapist" | "doctor";
type DoctorStatus = "open" | "resolved";
type FeedbackDraft = {
  completion_status: "done" | "not_done";
  response_score: number;
  notes: string;
  review_requested: boolean;
};

type BlockDraft = {
  start_day_number: number;
  end_day_number: number;
  start_date: string;
  procedure_name: string;
  medium_type: "oil" | "powder" | "other";
  medium_name: string;
  instructions: string;
};

const isTherapistItem = (item: FollowUpsResponse["items"][number]): item is TherapistWorklistItem =>
  item.queue_type === "therapist";
const isDoctorItem = (item: FollowUpsResponse["items"][number]): item is DoctorActionItem =>
  item.queue_type === "doctor";
const isLegacyItem = (item: FollowUpsResponse["items"][number]): item is LegacyFollowUpItem =>
  item.queue_type === "legacy";

export default function FollowUpsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<QueueTab>("therapist");
  const [doctorStatus, setDoctorStatus] = useState<DoctorStatus>("open");
  const [submittingSessionId, setSubmittingSessionId] = useState<number | null>(null);
  const [submittingTaskId, setSubmittingTaskId] = useState<number | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<number, FeedbackDraft>>({});
  const [blockDrafts, setBlockDrafts] = useState<Record<number, BlockDraft>>({});
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (user?.role === "doctor") {
      setTab("doctor");
      return;
    }
    if (user?.role === "therapist") {
      setTab("therapist");
      return;
    }
    setTab("all");
  }, [user?.role]);

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (tab === "doctor") {
      params.set("status", doctorStatus);
    }
    return `/dashboard/follow-ups/?${params.toString()}`;
  }, [tab, doctorStatus]);

  const { data, isLoading, error, refetch } = useApi<FollowUpsResponse>(queryUrl);

  const items = data?.items ?? [];
  const therapistItems = items.filter(isTherapistItem);
  const doctorItems = items.filter(isDoctorItem);
  const legacyItems = items.filter(isLegacyItem);

  const canSeeTherapist = user?.role === "therapist" || user?.role === "admin";
  const canSeeDoctor = user?.role === "doctor" || user?.role === "admin";

  const upsertFeedbackDraft = (sessionId: number, patch: Partial<FeedbackDraft>) => {
    const defaults: FeedbackDraft = {
      completion_status: "done",
      response_score: 3,
      notes: "",
      review_requested: false,
    };
    setFeedbackDrafts((prev) => ({
      ...prev,
      [sessionId]: {
        ...defaults,
        ...(prev[sessionId] ?? defaults),
        ...patch,
      },
    }));
  };

  const upsertBlockDraft = (taskId: number, defaults: BlockDraft) => {
    setBlockDrafts((prev) => ({
      ...prev,
      [taskId]: prev[taskId] ?? defaults,
    }));
  };

  const submitFeedback = async (item: TherapistWorklistItem) => {
    const draft = feedbackDrafts[item.treatment_session_id] ?? {
      completion_status: "done",
      response_score: 3,
      notes: "",
      review_requested: false,
    };
    setSubmittingSessionId(item.treatment_session_id);
    setErrorMessage("");
    try {
      await api.post(`/treatments/sessions/${item.treatment_session_id}/feedback/`, draft);
      await refetch();
    } catch {
      setErrorMessage("Could not submit session feedback. Please try again.");
    } finally {
      setSubmittingSessionId(null);
    }
  };

  const submitNextBlock = async (item: DoctorActionItem) => {
    const draft = blockDrafts[item.doctor_action_task_id];
    if (!draft) return;

    setSubmittingTaskId(item.doctor_action_task_id);
    setErrorMessage("");
    try {
      await api.post(`/treatments/plans/${item.treatment_plan_id}/blocks/`, {
        start_day_number: Number(draft.start_day_number),
        end_day_number: Number(draft.end_day_number),
        start_date: draft.start_date,
        entries: [
          {
            entry_type: "day_range",
            start_day_number: Number(draft.start_day_number),
            end_day_number: Number(draft.end_day_number),
            procedure_name: draft.procedure_name,
            medium_type: draft.medium_type,
            medium_name: draft.medium_name,
            instructions: draft.instructions,
          },
        ],
      });
      await refetch();
    } catch {
      setErrorMessage("Could not create the next treatment block. Check values and retry.");
    } finally {
      setSubmittingTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Follow-ups</h1>
          <p className="mt-1 text-sm text-gray-600">Treatment execution queue and doctor planning actions.</p>
        </div>
        {data?.meta?.counts && (
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
            Total open items: <span className="font-semibold text-gray-900">{data.meta.counts.total}</span>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-2">
        <div className="flex flex-wrap gap-2">
          {canSeeTherapist && (
            <button
              type="button"
              onClick={() => setTab("therapist")}
              className={`rounded-md px-3 py-2 text-sm ${
                tab === "therapist" ? "bg-emerald-100 font-medium text-emerald-800" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Therapist Worklist
            </button>
          )}
          {canSeeDoctor && (
            <button
              type="button"
              onClick={() => setTab("doctor")}
              className={`rounded-md px-3 py-2 text-sm ${
                tab === "doctor" ? "bg-blue-100 font-medium text-blue-800" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Doctor Actions
            </button>
          )}
          {user?.role === "admin" && (
            <button
              type="button"
              onClick={() => setTab("all")}
              className={`rounded-md px-3 py-2 text-sm ${
                tab === "all" ? "bg-violet-100 font-medium text-violet-800" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              All Queues
            </button>
          )}

          {tab === "doctor" && (
            <select
              value={doctorStatus}
              onChange={(e) => setDoctorStatus(e.target.value as DoctorStatus)}
              className="ml-auto rounded-md border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </select>
          )}
        </div>
      </div>

      {errorMessage && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>}
      {error?.detail && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error.detail}</div>}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          {(tab === "therapist" || tab === "all") && (
            <section className="space-y-3">
              {tab === "all" && <h2 className="text-base font-semibold text-gray-900">Therapist Worklist</h2>}
              {therapistItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
                  No treatment sessions pending in this tab.
                </div>
              ) : (
                therapistItems.map((item) => {
                  const draft = feedbackDrafts[item.treatment_session_id] ?? {
                    completion_status: "done",
                    response_score: 3,
                    notes: "",
                    review_requested: false,
                  };
                  return (
                    <div key={item.treatment_session_id} className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">{item.patient_name}</p>
                          <p className="text-sm text-gray-600">{item.patient_record_id} · Block {item.block_number} · Day {item.day_number}</p>
                          <p className="text-sm text-gray-500">{item.procedure_name} ({item.medium_type})</p>
                          <p className="text-xs text-gray-500">
                            Timeline: Day {item.block_start_day}-{item.block_end_day} · Completed {item.completed_days} · Pending {item.pending_days}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                          {item.follow_up_date ?? "No date"}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-4">
                        <select
                          value={draft.completion_status}
                          onChange={(e) =>
                            upsertFeedbackDraft(item.treatment_session_id, {
                              completion_status: e.target.value as "done" | "not_done",
                            })
                          }
                          className="rounded-md border border-gray-300 px-2 py-2 text-sm"
                        >
                          <option value="done">Done</option>
                          <option value="not_done">Not done</option>
                        </select>
                        <select
                          value={draft.response_score}
                          onChange={(e) =>
                            upsertFeedbackDraft(item.treatment_session_id, {
                              response_score: Number(e.target.value),
                            })
                          }
                          className="rounded-md border border-gray-300 px-2 py-2 text-sm"
                        >
                          {[1, 2, 3, 4, 5].map((score) => (
                            <option key={score} value={score}>
                              Response score {score}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={draft.notes}
                          onChange={(e) =>
                            upsertFeedbackDraft(item.treatment_session_id, {
                              notes: e.target.value,
                            })
                          }
                          placeholder="Session notes"
                          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                        <label className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={draft.review_requested}
                            onChange={(e) =>
                              upsertFeedbackDraft(item.treatment_session_id, {
                                review_requested: e.target.checked,
                              })
                            }
                          />
                          Request doctor review
                        </label>
                      </div>

                      <div className="mt-3">
                        <Button
                          type="button"
                          isLoading={submittingSessionId === item.treatment_session_id}
                          onClick={() => submitFeedback(item)}
                        >
                          Submit Feedback
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          )}

          {(tab === "doctor" || tab === "all") && (
            <section className="space-y-3">
              {tab === "all" && <h2 className="text-base font-semibold text-gray-900">Doctor Actions</h2>}
              {doctorItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
                  No doctor actions for this filter.
                </div>
              ) : (
                doctorItems.map((item) => {
                  const defaultStartDay = item.block_end_day + 1;
                  const draft = blockDrafts[item.doctor_action_task_id] ?? {
                    start_day_number: defaultStartDay,
                    end_day_number: defaultStartDay,
                    start_date: item.follow_up_date ?? new Date().toISOString().slice(0, 10),
                    procedure_name: "",
                    medium_type: "other",
                    medium_name: "",
                    instructions: "",
                  };
                  return (
                    <div key={item.doctor_action_task_id} className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">{item.patient_name}</p>
                          <p className="text-sm text-gray-600">{item.patient_record_id} · Block {item.block_number}</p>
                          <p className="text-sm text-gray-500">
                            {item.task_type === "block_completed" ? "Current block completed" : "Therapist requested review"}
                          </p>
                          <p className="text-xs text-gray-500">
                            Timeline: Day {item.block_start_day}-{item.block_end_day} · Completed {item.completed_days} · Pending {item.pending_days}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            item.task_status === "open" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.task_status}
                        </span>
                      </div>

                      {item.task_status === "open" ? (
                        <div className="mt-3 space-y-3">
                          <div className="grid gap-3 md:grid-cols-3">
                            <input
                              type="number"
                              min={1}
                              value={draft.start_day_number}
                              onChange={(e) =>
                                upsertBlockDraft(item.doctor_action_task_id, {
                                  ...draft,
                                  start_day_number: Number(e.target.value),
                                })
                              }
                              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                              placeholder="Start day"
                            />
                            <input
                              type="number"
                              min={1}
                              value={draft.end_day_number}
                              onChange={(e) =>
                                upsertBlockDraft(item.doctor_action_task_id, {
                                  ...draft,
                                  end_day_number: Number(e.target.value),
                                })
                              }
                              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                              placeholder="End day"
                            />
                            <input
                              type="date"
                              value={draft.start_date}
                              onChange={(e) =>
                                upsertBlockDraft(item.doctor_action_task_id, {
                                  ...draft,
                                  start_date: e.target.value,
                                })
                              }
                              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                            />
                          </div>

                          <div className="grid gap-3 md:grid-cols-3">
                            <input
                              type="text"
                              value={draft.procedure_name}
                              onChange={(e) =>
                                upsertBlockDraft(item.doctor_action_task_id, {
                                  ...draft,
                                  procedure_name: e.target.value,
                                })
                              }
                              placeholder="Procedure name"
                              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                            />
                            <select
                              value={draft.medium_type}
                              onChange={(e) =>
                                upsertBlockDraft(item.doctor_action_task_id, {
                                  ...draft,
                                  medium_type: e.target.value as "oil" | "powder" | "other",
                                })
                              }
                              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                            >
                              <option value="other">Other</option>
                              <option value="oil">Oil</option>
                              <option value="powder">Powder</option>
                            </select>
                            <input
                              type="text"
                              value={draft.medium_name}
                              onChange={(e) =>
                                upsertBlockDraft(item.doctor_action_task_id, {
                                  ...draft,
                                  medium_name: e.target.value,
                                })
                              }
                              placeholder="Medium name"
                              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                            />
                          </div>

                          <textarea
                            rows={2}
                            value={draft.instructions}
                            onChange={(e) =>
                              upsertBlockDraft(item.doctor_action_task_id, {
                                ...draft,
                                instructions: e.target.value,
                              })
                            }
                            placeholder="Instructions"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          />

                          <Button
                            type="button"
                            isLoading={submittingTaskId === item.doctor_action_task_id}
                            onClick={() => submitNextBlock(item)}
                            disabled={!draft.procedure_name}
                          >
                            Create Next Block
                          </Button>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-gray-500">Resolved when next block was created.</p>
                      )}
                    </div>
                  );
                })
              )}
            </section>
          )}

          {(tab === "therapist" || tab === "all") && legacyItems.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-gray-900">Legacy Follow-ups</h2>
              {legacyItems.map((item, idx) => (
                <div key={`${item.legacy_type}-${item.patient_id}-${idx}`} className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="font-medium text-gray-900">{item.patient_name}</p>
                  <p className="text-sm text-gray-600">{item.legacy_type} · {item.patient_record_id}</p>
                  <p className="text-sm text-gray-500">{item.notes || "No notes"}</p>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
