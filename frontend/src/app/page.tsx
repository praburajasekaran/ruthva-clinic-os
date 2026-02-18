import {
  Calendar,
  ClipboardList,
  Plus,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

async function getDashboardStats() {
  try {
    const res = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:8000"}/api/v1/dashboard/stats/`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

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
          Welcome to Sivanethram — Siddha Clinic Management System
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
              <p className="text-sm text-gray-500">Search for a patient</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Patients */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          Recent Patients
        </h2>
        {stats?.recent_patients?.length > 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 font-medium text-gray-500">Patient</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Record ID</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Age</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Last Visit</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Complaint</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.recent_patients.map(
                    (rp: { id: number; name: string; record_id: string; age: number; date_of_birth: string | null; last_visit: string; latest_complaint: string | null }) => (
                      <tr key={rp.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/patients/${rp.id}`}
                            className="font-medium text-emerald-700 hover:underline"
                          >
                            {rp.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{rp.record_id}</td>
                        <td className="px-4 py-3 text-gray-600">{rp.age}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(rp.last_visit).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                          {rp.latest_complaint || "—"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            No consultations yet. Register your first patient to get started.
          </div>
        )}
      </div>

      {/* Total Patients */}
      {stats?.total_patients != null && (
        <div className="text-sm text-gray-500">
          Total registered patients: <span className="font-medium text-gray-700">{stats.total_patients}</span>
        </div>
      )}
    </div>
  );
}
