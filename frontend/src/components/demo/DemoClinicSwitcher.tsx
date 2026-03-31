"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import api from "@/lib/api";

const DEMO_CLINICS = [
  { slug: "demo-ayurveda", label: "Ayurveda", description: "English" },
  { slug: "demo-siddha", label: "Siddha", description: "English + Tamil" },
  { slug: "demo-homeopathy", label: "Homeopathy", description: "Potency-based" },
];

export function DemoClinicSwitcher() {
  const { user } = useAuth();
  const [switching, setSwitching] = useState(false);

  if (user?.email !== "demo@ruthva.com") return null;

  const currentSlug = typeof window !== "undefined"
    ? localStorage.getItem("clinic_slug")
    : null;

  async function handleSwitch(slug: string) {
    if (slug === currentSlug || switching) return;
    setSwitching(true);
    try {
      const res = await api.post("/auth/demo/switch-clinic/", {
        clinic_slug: slug,
      });
      localStorage.setItem("access_token", res.data.access);
      localStorage.setItem("refresh_token", res.data.refresh);
      localStorage.setItem("clinic_slug", res.data.clinic_slug);
      window.location.reload();
    } catch {
      setSwitching(false);
    }
  }

  return (
    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
          Demo Discipline
        </span>
      </div>
      <select
        value={currentSlug || ""}
        onChange={(e) => handleSwitch(e.target.value)}
        disabled={switching}
        className="w-full rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
      >
        {DEMO_CLINICS.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.label} — {c.description}
          </option>
        ))}
      </select>
    </div>
  );
}
