"use client";

import { useApi } from "@/hooks/useApi";
import { AlertTriangle, Package, Users } from "lucide-react";
import type { UsageDashboard as UsageDashboardType } from "@/lib/types";

export function UsageDashboard() {
  const { data, isLoading } = useApi<UsageDashboardType>("/usage/");

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 h-4 w-full animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  if (!data) return null;

  const percentage = data.usage_percentage;
  const barColor =
    percentage >= 90 ? "bg-red-500" : percentage >= 75 ? "bg-amber-500" : "bg-emerald-500";
  const statusColor =
    percentage >= 90 ? "text-red-700" : percentage >= 75 ? "text-amber-700" : "text-emerald-700";

  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-4 text-base font-semibold text-gray-900">Clinic Usage</h3>

      <div className="space-y-4">
        {/* Active Patients */}
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-gray-600">
              <Users className="h-4 w-4" />
              Active Patients
            </span>
            <span className={`font-medium ${statusColor}`}>
              {data.active_patients} / {data.patient_limit}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">{percentage.toFixed(0)}% of limit used</p>
        </div>

        {/* Pharmacy Stats */}
        <div className="grid grid-cols-2 gap-3 border-t pt-4">
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
            <Package className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-lg font-semibold text-gray-900">{data.medicines_count}</p>
              <p className="text-xs text-gray-500">Medicines</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
            <AlertTriangle className={`h-4 w-4 ${data.low_stock_count > 0 ? "text-amber-500" : "text-gray-500"}`} />
            <div>
              <p className={`text-lg font-semibold ${data.low_stock_count > 0 ? "text-amber-600" : "text-gray-900"}`}>
                {data.low_stock_count}
              </p>
              <p className="text-xs text-gray-500">Low Stock</p>
            </div>
          </div>
        </div>

        {percentage >= 90 && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <p className="font-medium">Patient limit nearly reached</p>
            <p className="text-xs">Archive inactive patients or contact support to increase your limit.</p>
          </div>
        )}
      </div>
    </div>
  );
}
