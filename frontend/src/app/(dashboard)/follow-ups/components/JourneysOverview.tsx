"use client";

import { Activity, AlertTriangle, ClipboardList, HeartPulse } from "lucide-react";

type QueueTab = "all" | "therapist" | "doctor";
type DoctorStatus = "open" | "resolved";

type JourneysOverviewProps = {
  total: number;
  therapistCount: number;
  doctorCount: number;
  legacyCount: number;
  tab: QueueTab;
  canSeeTherapist: boolean;
  canSeeDoctor: boolean;
  isAdmin: boolean;
  doctorStatus: DoctorStatus;
  onTabChange: (tab: QueueTab) => void;
  onDoctorStatusChange: (status: DoctorStatus) => void;
};

const tabLabels: Record<QueueTab, string> = {
  all: "Needs Attention",
  therapist: "Execution Queue",
  doctor: "Doctor Review",
};

export function JourneysOverview({
  total,
  therapistCount,
  doctorCount,
  legacyCount,
  tab,
  canSeeTherapist,
  canSeeDoctor,
  isAdmin,
  doctorStatus,
  onTabChange,
  onDoctorStatusChange,
}: JourneysOverviewProps) {
  const summaryCards = [
    {
      label: "Open continuity work",
      value: total,
      note: "All journey items waiting for action",
      icon: HeartPulse,
      className: "border-brand-200 bg-brand-50 text-brand-950",
    },
    {
      label: "Therapist execution",
      value: therapistCount,
      note: "Sessions ready to record",
      icon: Activity,
      className: "border-emerald-200 bg-emerald-50 text-emerald-950",
    },
    {
      label: "Doctor review",
      value: doctorCount,
      note: "Feedback and plan decisions",
      icon: ClipboardList,
      className: "border-amber-200 bg-amber-50 text-amber-950",
    },
    {
      label: "Legacy items",
      value: legacyCount,
      note: "Older follow-through still in queue",
      icon: AlertTriangle,
      className: "border-orange-200 bg-orange-50 text-orange-950",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <div className="rounded-[28px] border border-brand-200 bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-50/80">
            Journeys command center
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Treatment continuity work, not queue admin</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-brand-50/90">
            Start with the patient who needs the next intervention. Every row in Journeys should tell the team
            who this is, what is happening, why it matters, and what to do next.
          </p>
        </div>

        <div className="rounded-[28px] border border-border bg-surface p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Current focus</p>
          <h2 className="mt-2 text-xl font-semibold text-text-primary">{tabLabels[tab]}</h2>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {tab === "therapist" && "Keep therapist work lightweight: record outcomes fast and escalate only when needed."}
            {tab === "doctor" && "Clear plan decisions and feedback review without losing patient context."}
            {tab === "all" && "Use the combined view to triage the full continuity workload across the clinic."}
          </p>

          {tab === "doctor" && (
            <div className="mt-5 inline-flex rounded-full border border-border bg-surface-raised p-1">
              {(["open", "resolved"] as DoctorStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onDoctorStatusChange(status)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    doctorStatus === status
                      ? "bg-brand-700 text-white"
                      : "text-text-secondary hover:bg-white hover:text-text-primary"
                  }`}
                >
                  {status === "open" ? "Needs attention" : "Resolved"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className={`rounded-3xl border p-5 ${card.className}`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold">{card.value}</p>
                <p className="mt-2 text-sm opacity-80">{card.note}</p>
              </div>
              <card.icon className="h-5 w-5 shrink-0" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[28px] border border-border bg-surface p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {canSeeTherapist && (
            <button
              type="button"
              onClick={() => onTabChange("therapist")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                tab === "therapist"
                  ? "bg-brand-700 text-white"
                  : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
              }`}
            >
              Execution Queue
            </button>
          )}
          {canSeeDoctor && (
            <button
              type="button"
              onClick={() => onTabChange("doctor")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                tab === "doctor"
                  ? "bg-brand-700 text-white"
                  : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
              }`}
            >
              Doctor Review
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => onTabChange("all")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                tab === "all"
                  ? "bg-brand-700 text-white"
                  : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
              }`}
            >
              Needs Attention
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
