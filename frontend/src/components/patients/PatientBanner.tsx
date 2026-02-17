import { AlertTriangle } from "lucide-react";
import type { Patient } from "@/lib/types";

type PatientBannerProps = {
  patient: Patient;
};

export function PatientBanner({ patient }: PatientBannerProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <span className="font-semibold text-gray-900">{patient.name}</span>
        <span className="font-mono text-xs text-gray-500">
          {patient.record_id}
        </span>
        <span className="text-gray-600">
          {patient.age}y / {patient.gender.charAt(0).toUpperCase()}
        </span>
        <span className="text-gray-600">{patient.phone}</span>
        {patient.allergies && (
          <span className="flex items-center gap-1 text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {patient.allergies}
          </span>
        )}
      </div>
    </div>
  );
}
