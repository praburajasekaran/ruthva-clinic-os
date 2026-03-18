"use client";

import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  Plus,
  Stethoscope,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/components/auth/AuthProvider";
import type {
  DashboardStats,
  DoctorActionItem,
  FollowUpQueueItem,
  FollowUpsResponse,
  LegacyFollowUpItem,
  TherapistWorklistItem,
} from "@/lib/types";

type AttentionItem = {
  id: string;
  patientId: number;
  patientName: string;
  recordId: string;
  reason: string;
  nextStep: string;
  dueLabel: string;
  dueDate: string | null;
  theme: "brand" | "warning" | "critical";
};

function formatShortDate(value: string | null) {
  if (!value) return "No date set";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function getItemDate(item: FollowUpQueueItem) {
  return item.follow_up_date ? new Date(`${item.follow_up_date}T00:00:00`) : null;
}

function toAttentionItem(item: FollowUpQueueItem, todayValue: number): AttentionItem {
  const dueDate = getItemDate(item);
  const dueValue = dueDate ? dueDate.setHours(0, 0, 0, 0) : null;
  const isOverdue = dueValue !== null && dueValue < todayValue;
  const isToday = dueValue !== null && dueValue === todayValue;
  const dueLabel = item.follow_up_date
    ? isOverdue
      ? `Overdue since ${formatShortDate(item.follow_up_date)}`
      : isToday
        ? `Due today`
        : `Due ${formatShortDate(item.follow_up_date)}`
    : "Needs review";

  if (item.queue_type === "therapist") {
    const therapistItem = item as TherapistWorklistItem;
    return {
      id: `therapist-${therapistItem.treatment_session_id}`,
      patientId: therapistItem.patient_id,
      patientName: therapistItem.patient_name,
      recordId: therapistItem.patient_record_id,
      reason: `${therapistItem.procedure_name} is scheduled for Day ${therapistItem.day_number}.`,
      nextStep: "Record session outcome",
      dueLabel,
      dueDate: therapistItem.follow_up_date,
      theme: isOverdue ? "critical" : isToday ? "warning" : "brand",
    };
  }

  if (item.queue_type === "doctor") {
    const doctorItem = item as DoctorActionItem;
    const reason =
      doctorItem.task_type === "block_completed"
        ? `Block ${doctorItem.block_number} is complete and needs the next block planned.`
        : doctorItem.task_type === "plan_completed"
          ? `The treatment plan has completed and needs acknowledgement.`
          : `Therapist feedback is waiting for doctor review.`;

    const nextStep =
      doctorItem.task_type === "block_completed"
        ? "Plan next block"
        : doctorItem.task_type === "plan_completed"
          ? "Acknowledge completion"
          : "Review therapist feedback";

    return {
      id: `doctor-${doctorItem.doctor_action_task_id}`,
      patientId: doctorItem.patient_id,
      patientName: doctorItem.patient_name,
      recordId: doctorItem.patient_record_id,
      reason,
      nextStep,
      dueLabel,
      dueDate: doctorItem.follow_up_date,
      theme: doctorItem.task_type === "review_requested" || isOverdue ? "critical" : "warning",
    };
  }

  const legacyItem = item as LegacyFollowUpItem;

  return {
    id: `legacy-${legacyItem.patient_id}-${legacyItem.legacy_type}`,
    patientId: legacyItem.patient_id,
    patientName: legacyItem.patient_name,
    recordId: legacyItem.patient_record_id,
    reason: `${legacyItem.legacy_type === "procedure" ? "Procedure" : "Prescription"} follow-up still needs continuity review.`,
    nextStep: "Review patient context",
    dueLabel,
    dueDate: legacyItem.follow_up_date,
    theme: isOverdue ? "critical" : "warning",
  };
}

const tileStyles = {
  brand: "border-brand-200 bg-brand-50/80 text-brand-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-orange-200 bg-orange-50 text-orange-900",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats } = useApi<DashboardStats>("/dashboard/stats/");
  const { data: followUpsData } = useApi<FollowUpsResponse>("/dashboard/follow-ups/?tab=all");

  const clinicName = user?.clinic?.name ?? "Your Clinic";

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const allAttentionItems = useMemo(
    () =>
      (followUpsData?.items ?? [])
        .map((item) => toAttentionItem(item, today.getTime()))
        .sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }),
    [followUpsData?.items, today],
  );

  const dueTodayCount = allAttentionItems.filter((item) => {
    if (!item.dueDate) return false;
    const itemDate = new Date(`${item.dueDate}T00:00:00`);
    itemDate.setHours(0, 0, 0, 0);
    return itemDate.getTime() === today.getTime();
  }).length;

  const overdueCount = allAttentionItems.filter((item) => {
    if (!item.dueDate) return false;
    const itemDate = new Date(`${item.dueDate}T00:00:00`);
    itemDate.setHours(0, 0, 0, 0);
    return itemDate.getTime() < today.getTime();
  }).length;

  const priorityItems = allAttentionItems.slice(0, 5);
  const recentReturns = stats?.recent_patients?.slice(0, 4) ?? [];

  const supportStats = [
    {
      label: "Active queue",
      value: followUpsData?.meta?.counts?.total ?? "—",
      note: "Journeys needing action",
      icon: HeartPulse,
      tone: "brand",
    },
    {
      label: "Due today",
      value: dueTodayCount,
      note: "Patients expected back today",
      icon: CalendarClock,
      tone: "warning",
    },
    {
      label: "Doctor decisions",
      value: followUpsData?.meta?.counts?.doctor ?? "—",
      note: "Reviews and plan updates",
      icon: ClipboardList,
      tone: "critical",
    },
    {
      label: "Visits this week",
      value: stats?.week_patients ?? "—",
      note: "Recent clinical activity",
      icon: Activity,
      tone: "brand",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        <div className="overflow-hidden rounded-[28px] border border-brand-200 bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 p-7 text-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-50">
                <HeartPulse className="h-3.5 w-3.5" />
                Ruthva Home
              </div>
              <div className="space-y-2">
                <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Who needs attention right now?
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-brand-50/90 sm:text-base">
                  Start from continuity work first. {clinicName} has {followUpsData?.meta?.counts?.total ?? 0} active
                  journey item{followUpsData?.meta?.counts?.total === 1 ? "" : "s"} waiting across doctor review,
                  therapist execution, and follow-through.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/follow-ups"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-900 transition-transform hover:-translate-y-0.5"
              >
                Review Needs Attention
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/patients/new"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
              >
                <Plus className="h-4 w-4" />
                New Patient
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-brand-50/70">Journeys due</p>
              <p className="mt-2 text-3xl font-semibold">{stats?.follow_ups_due ?? 0}</p>
              <p className="mt-1 text-sm text-brand-50/80">Continuity milestones due or pending.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-brand-50/70">Due today</p>
              <p className="mt-2 text-3xl font-semibold">{dueTodayCount}</p>
              <p className="mt-1 text-sm text-brand-50/80">Patients expected back in today&apos;s care window.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-brand-50/70">At risk now</p>
              <p className="mt-2 text-3xl font-semibold">{overdueCount}</p>
              <p className="mt-1 text-sm text-brand-50/80">Journeys that have slipped past the expected date.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-[28px] border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Continuity summary
              </p>
              <h2 className="mt-2 text-xl font-semibold text-text-primary">Today&apos;s operating rhythm</h2>
            </div>
            <Calendar className="h-5 w-5 text-brand-700" />
          </div>

          <div className="space-y-3">
            {supportStats.map((item) => (
              <div
                key={item.label}
                className={`rounded-2xl border p-4 ${tileStyles[item.tone as keyof typeof tileStyles]}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="mt-1 text-2xl font-semibold">{item.value}</p>
                    <p className="mt-1 text-sm opacity-80">{item.note}</p>
                  </div>
                  <item.icon className="h-5 w-5 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.85fr)]">
        <div className="rounded-[28px] border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Needs attention
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-text-primary">Priority journeys</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                Start with the patients most likely to slip. Each row answers who this is, why they are
                here, and what should happen next.
              </p>
            </div>
            <Link
              href="/follow-ups"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-text-primary hover:border-brand-200 hover:bg-brand-50"
            >
              Open Journeys
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {priorityItems.length > 0 ? (
              priorityItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-3xl border p-5 transition-transform hover:-translate-y-0.5 ${tileStyles[item.theme]}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/patients/${item.patientId}`}
                          className="text-lg font-semibold text-current underline-offset-4 hover:underline"
                        >
                          {item.patientName}
                        </Link>
                        <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-current">
                          {item.recordId}
                        </span>
                      </div>
                      <p className="max-w-2xl text-sm leading-6 opacity-90">{item.reason}</p>
                    </div>
                    <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-current">
                      {item.dueLabel}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-current/10 pt-4">
                    <p className="text-sm font-medium">
                      Next step: <span className="font-semibold">{item.nextStep}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/patients/${item.patientId}`}
                        className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-white"
                      >
                        Open Patient
                      </Link>
                      <Link
                        href="/follow-ups"
                        className="inline-flex items-center gap-2 rounded-full border border-current/20 px-3 py-1.5 text-sm font-medium hover:bg-white/40"
                      >
                        Continue in Journeys
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-border-strong bg-surface-raised p-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-brand-700" />
                <h3 className="mt-4 text-lg font-semibold text-text-primary">No journeys need action right now</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  New attention items will appear here as therapist sessions, reviews, or journey follow-through come due.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Recent returns
                </p>
                <h2 className="mt-2 text-xl font-semibold text-text-primary">Patients back in care</h2>
              </div>
              <Users className="h-5 w-5 text-brand-700" />
            </div>

            <div className="mt-5 space-y-3">
              {recentReturns.length > 0 ? (
                recentReturns.map((patient) => (
                  <Link
                    key={patient.id}
                    href={`/patients/${patient.id}`}
                    className="block rounded-2xl border border-border bg-surface-raised p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-text-primary">{patient.name}</p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {patient.record_id} · Last seen {formatShortDate(patient.last_visit)}
                        </p>
                      </div>
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                        {patient.age}y
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-text-secondary">
                      {patient.latest_complaint || "Open the patient record to continue treatment."}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border-strong bg-surface-raised p-6 text-sm text-text-secondary">
                  Recent patient returns will appear here after visits begin to flow through Ruthva.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Quick moves
                </p>
                <h2 className="mt-2 text-xl font-semibold text-text-primary">Move patients forward</h2>
              </div>
              <Stethoscope className="h-5 w-5 text-brand-700" />
            </div>

            <div className="mt-5 grid gap-3">
              <Link
                href="/patients/new"
                className="flex items-center justify-between rounded-2xl border border-border bg-surface-raised px-4 py-4 transition-colors hover:border-brand-200 hover:bg-brand-50"
              >
                <div>
                  <p className="font-semibold text-text-primary">New Patient</p>
                  <p className="mt-1 text-sm text-text-secondary">Register intake, then move directly into care.</p>
                </div>
                <Plus className="h-5 w-5 text-brand-700" />
              </Link>
              <Link
                href="/patients"
                className="flex items-center justify-between rounded-2xl border border-border bg-surface-raised px-4 py-4 transition-colors hover:border-brand-200 hover:bg-brand-50"
              >
                <div>
                  <p className="font-semibold text-text-primary">Start Consultation</p>
                  <p className="mt-1 text-sm text-text-secondary">Search an existing patient and start today&apos;s visit.</p>
                </div>
                <Stethoscope className="h-5 w-5 text-brand-700" />
              </Link>
              <Link
                href="/follow-ups"
                className="flex items-center justify-between rounded-2xl border border-border bg-surface-raised px-4 py-4 transition-colors hover:border-brand-200 hover:bg-brand-50"
              >
                <div>
                  <p className="font-semibold text-text-primary">Review Journeys</p>
                  <p className="mt-1 text-sm text-text-secondary">Work through the therapist and doctor queue from one surface.</p>
                </div>
                <ArrowRight className="h-5 w-5 text-brand-700" />
              </Link>
            </div>
          </div>

          {(overdueCount > 0 || (followUpsData?.meta?.counts?.doctor ?? 0) > 0) && (
            <div className="rounded-[28px] border border-orange-200 bg-orange-50 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-700" />
                <div>
                  <h2 className="text-lg font-semibold text-orange-950">Escalation watch</h2>
                  <p className="mt-2 text-sm leading-6 text-orange-900">
                    {overdueCount > 0
                      ? `${overdueCount} journey item${overdueCount === 1 ? "" : "s"} are already overdue.`
                      : "Doctor review items are waiting and should be cleared before the next care block starts."}
                  </p>
                  <Link
                    href="/follow-ups"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-900 underline-offset-4 hover:underline"
                  >
                    Open Journeys and resolve next action
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
