import { AlertTriangle, Phone } from "lucide-react";
import type { Patient } from "@/lib/types";

type PatientBannerProps = {
  patient: Patient;
};

export function PatientBanner({ patient }: PatientBannerProps) {
  const age = patient.calculated_age ?? patient.age;

  return (
    <div className="rounded-[28px] border border-border bg-gradient-to-r from-white to-surface-raised px-5 py-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Patient record
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
            {patient.name}
          </h2>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          {patient.record_id}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full border border-border bg-white px-3 py-1.5 text-sm text-text-secondary">
          {age} years · {patient.gender.charAt(0).toUpperCase()}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-sm text-text-secondary">
          <Phone className="h-3.5 w-3.5 text-brand-700" />
          {patient.phone}
        </span>
        {patient.whatsapp_number && patient.whatsapp_number !== patient.phone && (
          <span className="rounded-full border border-border bg-white px-3 py-1.5 text-sm text-text-secondary">
            WhatsApp {patient.whatsapp_number}
          </span>
        )}
        {patient.allergies && (
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            Allergies: {patient.allergies}
          </span>
        )}
      </div>
    </div>
  );
}
