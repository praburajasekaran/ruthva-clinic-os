"use client";

import { FlaskConical } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export function DemoClinicSwitcher() {
  const { user } = useAuth();

  if (user?.email !== "demo@ruthva.com") return null;

  return (
    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        <span className="text-sm font-medium text-emerald-700">
          Siddha demo
        </span>
      </div>
      <p className="mt-1 text-xs text-emerald-700">English + Tamil. Read-only.</p>
    </div>
  );
}
