"use client";

import {
  Calendar,
  ClipboardList,
  Plus,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/components/auth/AuthProvider";
import type { DashboardStats } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats } = useApi<DashboardStats>("/dashboard/stats/");

  const clinicName = user?.clinic?.name ?? "Your Clinic";

  const statCards = [
    {
      label: "Today's Patients",
      value: stats?.today_patients ?? "—",
      icon: Users,
      color: "text-emerald-700 bg-emerald-50",
    },
    {
      label: "This Week",
      value: stats?.week_patients ?? "—",
      icon: TrendingUp,
      color: "text-blue-700 bg-blue-50",
    },
    {
      label: "Pending Rx",
      value: stats?.pending_prescriptions ?? "—",
      icon: ClipboardList,
      color: "text-amber-700 bg-amber-50",
    },
    {
      label: "Follow-ups Due",
      value: stats?.follow_ups_due ?? "—",
      icon: Calendar,
      color: "text-purple-700 bg-purple-50",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Welcome to {clinicName}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-gray-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {card.value}
                </p>
              </div>
              <div className={`rounded-lg p-2.5 ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          Quick Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/patients/new"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50"
          >
            <div className="rounded-lg bg-emerald-50 p-2">
              <Plus className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="font-medium text-gray-900">New Patient</p>
              <p className="text-sm text-gray-500">Register a new patient</p>
            </div>
          </Link>
          <Link
            href="/patients"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50"
          >
            <div className="rounded-lg bg-blue-50 p-2">
              <Users className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Find Patient</p>
              <p className="text-sm text-gray-500">Search patient records</p>
            </div>
          </Link>
          <Link
            href="/patients"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50"
          >
            <div className="rounded-lg bg-amber-50 p-2">
              <Stethoscope className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Start Consultation</p>
              <p className="text-sm text-gray-500">Select a patient first</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Total Patients */}
      {stats?.total_patients != null && (
        <div className="text-sm text-gray-500">
          Total registered patients:{" "}
          <span className="font-medium text-gray-700">
            {stats.total_patients}
          </span>
        </div>
      )}
    </div>
  );
}
