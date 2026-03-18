"use client";

import { AlertCircle, AlertTriangle } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/components/auth/AuthProvider";
import type { UsageDashboard } from "@/lib/types";

export function PatientUsageIndicator() {
  const { user } = useAuth();
  const { data } = useApi<UsageDashboard>("/usage/");

  if (!data) return null;

  const { active_patients, patient_limit } = data;
  const isOwner = user?.is_clinic_owner ?? false;

  // Hidden below 180
  if (active_patients < 180) return null;

  const atLimit = active_patients >= patient_limit;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
        atLimit
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      {atLimit ? (
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      )}
      <span>
        {atLimit
          ? `Patient limit reached (${active_patients}/${patient_limit}).`
          : `Nearing patient limit (${active_patients}/${patient_limit}).`}
        {" "}
        Archive inactive patients{isOwner ? " or upgrade to add more" : ""}.
      </span>
    </div>
  );
}
