"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Patient } from "@/lib/types";

type Summary = {
  patient_id: number;
  summary: string;
  source: "ai" | "saved_facts";
  enabled?: boolean;
  status?: string;
};

export function PatientSummary({
  patient,
  canGenerate,
}: {
  patient: Patient;
  canGenerate: boolean;
}) {
  const [result, setResult] = useState<Summary | null>(null);
  const [status, setStatus] = useState("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    setResult(null);
    setStatus("loading");
    async function load() {
      try {
        const saved = await api.get<Summary>(
          `/patients/${patient.id}/summary/`,
          { signal: controller.signal },
        );
        if (!current) return;
        setResult(saved.data);
        if (!saved.data.enabled || !canGenerate || saved.data.source === "ai") {
          setStatus("done");
          return;
        }
        const generated = await api.post<Summary>(
          `/patients/${patient.id}/summary/`,
          {},
          { signal: controller.signal },
        );
        if (!current || generated.data.patient_id !== patient.id) return;
        setResult(generated.data);
        setStatus(generated.data.status === "ready" ? "done" : "failed");
      } catch {
        if (current) setStatus("failed");
      }
    }
    void load();
    return () => {
      current = false;
      controller.abort();
    };
  }, [patient, canGenerate, retry]);

  return (
    <div className="mt-4 max-w-3xl" aria-live="polite">
      {result?.patient_id === patient.id ? (
        <p className="leading-relaxed text-text-secondary">{result.summary}</p>
      ) : (
        <p className="text-sm text-text-muted">
          {status === "loading"
            ? "Loading patient overview…"
            : "Patient overview is unavailable."}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-muted">
        {result?.source === "ai" && (
          <span>AI overview · Check against the saved record</span>
        )}
        {result?.source === "saved_facts" && (
          <span>
            Overview from saved details
            {status === "loading" ? " · Updating summary…" : ""}
          </span>
        )}
        {status === "failed" && (
          <button
            type="button"
            className="min-h-10 text-brand-700 underline"
            onClick={() => setRetry((x) => x + 1)}
          >
            Retry summary
          </button>
        )}
      </div>
    </div>
  );
}
