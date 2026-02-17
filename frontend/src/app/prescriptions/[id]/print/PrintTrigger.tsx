"use client";

import { useEffect } from "react";

export function PrintTrigger() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="no-print mt-6 text-center">
      <button
        onClick={() => window.print()}
        className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Print Again
      </button>
      <button
        onClick={() => window.history.back()}
        className="ml-3 rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Back
      </button>
    </div>
  );
}
