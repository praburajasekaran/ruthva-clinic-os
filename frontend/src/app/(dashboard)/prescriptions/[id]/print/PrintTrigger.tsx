"use client";

import { useEffect } from "react";
import { Printer, ArrowLeft } from "lucide-react";

export function PrintTrigger() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

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
