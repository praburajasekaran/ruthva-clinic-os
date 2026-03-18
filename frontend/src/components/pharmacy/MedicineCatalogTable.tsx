"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Search } from "lucide-react";
import type { Medicine, PaginatedResponse } from "@/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  kashayam: "Kashayam", choornam: "Choornam", lehyam: "Lehyam",
  tailam: "Tailam", arishtam: "Arishtam", asavam: "Asavam",
  gulika: "Gulika", parpam: "Parpam", chenduram: "Chenduram",
  nei: "Nei", tablet: "Tablet", capsule: "Capsule",
  syrup: "Syrup", external: "External", other: "Other",
  mother_tincture: "Mother Tincture (Q)", trituration: "Trituration",
  centesimal: "Centesimal (C)", lm_potency: "LM Potency", biochemic: "Biochemic",
};

type Props = {
  data: PaginatedResponse<Medicine> | undefined;
  onRefresh: () => void;
};

export function MedicineCatalogTable({ data }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const medicines = data?.results ?? [];
  const filtered = medicines.filter((m) => {
    if (!showInactive && !m.is_active) return false;
    if (categoryFilter && m.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.name_ta.toLowerCase().includes(q) || m.brand_name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search medicines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border py-2 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show inactive
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table aria-label="Medicine catalog" className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-500">
              <th scope="col" className="px-4 py-3">Name</th>
              <th scope="col" className="px-4 py-3">Category</th>
              <th scope="col" className="px-4 py-3">Form</th>
              <th scope="col" className="px-4 py-3 text-right">Stock</th>
              <th scope="col" className="px-4 py-3 text-right">Reorder</th>
              <th scope="col" className="px-4 py-3 text-right">Price</th>
              <th scope="col" className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No medicines found.
                </td>
              </tr>
            ) : (
              filtered.map((med) => (
                <tr
                  key={med.id}
                  onClick={() => router.push(`/pharmacy/${med.id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/pharmacy/${med.id}`);
                    }
                  }}
                  className={`cursor-pointer border-b last:border-0 transition-colors hover:bg-gray-50 ${
                    med.is_low_stock ? "bg-amber-50/50" : ""
                  } ${!med.is_active ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{med.name}</span>
                      {med.is_low_stock && (
                        <AlertTriangle aria-label="Low stock" className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    {med.brand_name && (
                      <span className="text-xs text-gray-400">{med.brand_name}</span>
                    )}
                    {med.name_ta && (
                      <span className="text-xs text-emerald-600">{med.name_ta}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {CATEGORY_LABELS[med.category] || med.category}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{med.dosage_form}</td>
                  <td className={`px-4 py-3 text-right font-mono ${
                    med.is_low_stock ? "font-semibold text-amber-700" : "text-gray-700"
                  }`}>
                    {med.current_stock}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-500">
                    {med.reorder_level}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">₹{med.unit_price}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      med.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {med.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
