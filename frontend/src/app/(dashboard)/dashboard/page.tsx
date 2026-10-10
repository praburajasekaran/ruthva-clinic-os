"use client";

import Link from "next/link";
import { Users, Stethoscope, Pill, Hand, Plus } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import type {
  DashboardStats,
  FollowUpsResponse,
  PaginatedResponse,
  ConsultationListItem,
} from "@/lib/types";

const areas = [
  {
    title: "Patients",
    description: "Patient records and health history",
    href: "/patients",
    icon: Users,
  },
  {
    title: "Visits",
    description: "Consultations and prescriptions",
    href: "/consultations",
    icon: Stethoscope,
  },
  {
    title: "Medicines",
    description: "Available stock and dispensing",
    href: "/pharmacy",
    icon: Pill,
  },
  {
    title: "Therapies",
    description: "Procedures, sessions and patients",
    href: "/therapies",
    icon: Hand,
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const { data: stats } = useApi<DashboardStats>("/dashboard/stats/");
  const { data: work, error: workError } = useApi<FollowUpsResponse>(
    "/dashboard/follow-ups/?tab=all",
  );
  const { data: visits, error: visitError } = useApi<
    PaginatedResponse<ConsultationListItem>
  >(`/consultations/?consultation_date=${date}`);
  const pendingWork = (work?.items ?? []).filter(
    (item) => !item.follow_up_date || item.follow_up_date <= date,
  );
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-text-muted">
            {new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">
            {user?.clinic?.name || "Your clinic"}
          </h1>
        </div>
        {user?.role === "doctor" && (
          <Button asChild size="lg">
            <Link href="/visits/new">
              <Plus className="h-5 w-5" />
              Start visit
            </Link>
          </Button>
        )}
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {areas.map((area) => (
          <Link
            key={area.href}
            href={area.href}
            className="rounded-2xl border border-border bg-white p-6 transition-colors hover:border-brand-400 hover:bg-brand-50/30"
          >
            <area.icon
              className="mb-4 h-6 w-6 text-brand-700"
              aria-hidden="true"
            />
            <h2 className="text-2xl">{area.title}</h2>
            <p className="mt-2 text-text-secondary">{area.description}</p>
          </Link>
        ))}
      </div>
      <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl">Follow-ups</h2>
          <Link href="/follow-ups" className="py-2 text-brand-700">
            Open follow-ups →
          </Link>
        </div>
        <p className="mt-1 text-sm text-text-muted">
          Patient calls, therapy sessions and doctor reviews.
        </p>
        {workError ? (
          <p role="alert" className="mt-4">
            The clinical worklist could not be loaded.
          </p>
        ) : !work ? (
          <p className="mt-4 text-text-muted">Loading follow-ups…</p>
        ) : !pendingWork.length ? (
          <p className="mt-4 text-text-muted">
            No clinical reviews or sessions due today.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {pendingWork.slice(0, 5).map((item, i) => (
              <Link
                key={`${item.patient_id}-${i}`}
                href={
                  item.queue_type === "legacy"
                    ? `/patients/${item.patient_id}`
                    : `/treatments/plans/${item.treatment_plan_id}`
                }
                className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-brand-700"
              >
                <span className="font-semibold">{item.patient_name}</span>
                <span className="text-sm text-text-muted">
                  {item.queue_type === "doctor"
                    ? "Doctor review"
                    : item.queue_type === "therapist"
                      ? item.procedure_name
                      : "Clinical follow-up"}
                  {item.follow_up_date ? ` · ${item.follow_up_date}` : ""}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl">Today’s visits</h2>
          <Link href="/consultations" className="py-2 text-brand-700">
            All visits →
          </Link>
        </div>
        {stats && (
          <p className="mt-1 text-sm text-text-muted">
            {stats.today_patients} patients today ·{" "}
            {stats.pending_prescriptions} prescriptions to finish
          </p>
        )}
        {visitError ? (
          <p role="alert" className="mt-4">
            Visits could not be loaded.
          </p>
        ) : !visits ? (
          <p className="mt-4 text-text-muted">Loading visits…</p>
        ) : !visits.results.length ? (
          <p className="mt-4 text-text-muted">
            Today’s visits will appear here.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {visits.results.slice(0, 5).map((visit) => (
              <Link
                key={visit.id}
                href={`/consultations/${visit.id}`}
                className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-brand-700"
              >
                <span className="font-semibold">{visit.patient_name}</span>
                <span className="text-sm text-text-muted">
                  {visit.has_prescription
                    ? "Review visit"
                    : "Finish prescription"}{" "}
                  →
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
