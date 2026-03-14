"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isShortcutSuppressed } from "@/lib/keyboard";

type Options = {
  patientId: number;
  consultationId?: number;
  prescriptionId?: number;
};

/**
 * Registers patient-context keyboard shortcuts.
 * Mount this hook in patient detail, consultation detail, and prescription detail pages.
 *
 * C → new consultation for this patient
 * H → back to patient detail
 * P → view prescription (only when consultationId + prescriptionId are provided)
 */
export function usePatientShortcuts({
  patientId,
  consultationId,
  prescriptionId,
}: Options) {
  const router = useRouter();

  useEffect(() => {
    // Don't register shortcuts if patientId is not a valid number
    if (!patientId || typeof patientId !== "number") return;


    function handleKeyDown(e: KeyboardEvent) {
      if (isShortcutSuppressed(e)) return;

      // C — new consultation
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        router.push(`/patients/${patientId}/consultations/new`);
        return;
      }

      // H — back to patient detail
      if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        router.push(`/patients/${patientId}`);
        return;
      }

      // P — view prescription (only available from consultation detail with a prescription)
      if ((e.key === "p" || e.key === "P") && consultationId && prescriptionId) {
        e.preventDefault();
        router.push(`/prescriptions/${prescriptionId}`);
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router, patientId, consultationId, prescriptionId]);
}
