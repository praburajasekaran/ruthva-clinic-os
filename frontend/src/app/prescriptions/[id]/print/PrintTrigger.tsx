"use client";

import { useEffect, useState } from "react";
import { Printer, ArrowLeft } from "lucide-react";

type PaperSize = "A5" | "A4";

export function PrintTrigger() {
  const [paperSize, setPaperSize] = useState<PaperSize>("A5");

  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.paperSize = paperSize;
  }, [paperSize]);

  return (
    <div className="no-print mt-6 flex items-center justify-center gap-3">
      {/* Paper size toggle */}
      <div className="flex rounded-lg border border-gray-300">
        {(["A5", "A4"] as const).map((size) => (
          <button
            key={size}
            onClick={() => setPaperSize(size)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              paperSize === size
                ? "bg-emerald-100 text-emerald-700"
                : "text-gray-600 hover:bg-gray-50"
            } ${size === "A5" ? "rounded-l-lg" : "rounded-r-lg"}`}
          >
            {size}
          </button>
        ))}
      </div>

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
