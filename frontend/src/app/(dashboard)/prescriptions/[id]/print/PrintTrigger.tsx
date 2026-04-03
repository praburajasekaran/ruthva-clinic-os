"use client";

import { useEffect, useRef } from "react";
import { Printer, ArrowLeft } from "lucide-react";

type PrintTriggerProps = {
  patientName?: string;
  consultationDate?: string;
};

export function PrintTrigger({ patientName, consultationDate }: PrintTriggerProps) {
  const hasPrinted = useRef(false);

  // Set document title for filename when data is available
  useEffect(() => {
    if (!patientName || !consultationDate) return;

    const originalTitle = document.title;
    const safeName = patientName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
    document.title = `${safeName}_${consultationDate}`;

    // Auto-print once when data is ready
    if (!hasPrinted.current) {
      hasPrinted.current = true;
      const timer = setTimeout(async () => {
        await document.fonts.ready;
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }

    const restoreTitle = () => {
      document.title = originalTitle;
    };
    window.addEventListener("afterprint", restoreTitle, { once: true });

    return () => {
      window.removeEventListener("afterprint", restoreTitle);
    };
  }, [patientName, consultationDate]);

  return (
    <div className="no-print mt-6 flex items-center justify-center gap-3">
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        <Printer className="h-4 w-4" />
        Print
      </button>
      <button
        onClick={() => window.history.back()}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
    </div>
  );
}
