"use client";

import { usePatientShortcuts } from "@/hooks/usePatientShortcuts";

type Props = {
  patientId: number;
  consultationId?: number;
  prescriptionId?: number;
};

/**
 * Client island that mounts patient-context keyboard shortcuts.
 * Insert this as a zero-render child in server-side patient/consultation/prescription pages.
 */
export function PatientShortcutsInit({
  patientId,
  consultationId,
  prescriptionId,
}: Props) {
  usePatientShortcuts({ patientId, consultationId, prescriptionId });
  return null;
}
