"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { pharmacyApi } from "@/lib/api";
import type { Medicine, MedicineCategory, DosageForm } from "@/lib/types";

const CATEGORY_OPTIONS: { value: MedicineCategory; label: string }[] = [
  { value: "kashayam", label: "Kashayam / கஷாயம்" },
  { value: "choornam", label: "Choornam / சூரணம்" },
  { value: "lehyam", label: "Lehyam / லேகியம்" },
  { value: "tailam", label: "Tailam / தைலம்" },
  { value: "arishtam", label: "Arishtam / அரிஷ்டம்" },
  { value: "asavam", label: "Asavam / ஆசவம்" },
  { value: "gulika", label: "Gulika / குளிகை" },
  { value: "parpam", label: "Parpam / பற்பம்" },
  { value: "chenduram", label: "Chenduram / செந்தூரம்" },
  { value: "nei", label: "Nei / நெய்" },
  { value: "tablet", label: "Tablet" },
  { value: "capsule", label: "Capsule" },
  { value: "syrup", label: "Syrup" },
  { value: "external", label: "External Application" },
  { value: "other", label: "Other" },
];

const DOSAGE_FORM_OPTIONS: { value: DosageForm; label: string }[] = [
  { value: "ml", label: "Millilitres (ml)" },
  { value: "g", label: "Grams (g)" },
  { value: "tablets", label: "Tablets" },
  { value: "capsules", label: "Capsules" },
  { value: "drops", label: "Drops" },
  { value: "pinch", label: "Pinch / சிட்டிகை" },
  { value: "spoon", label: "Spoon / கரண்டி" },
  { value: "other", label: "Other" },
];

type Props = {
  medicine?: Medicine;
  onClose: () => void;
  onSaved: () => void;
};

export function MedicineForm({ medicine, onClose, onSaved }: Props) {
  const isEdit = !!medicine;
  const [form, setForm] = useState({
    name: medicine?.name ?? "",
    name_ta: medicine?.name_ta ?? "",
    category: medicine?.category ?? ("kashayam" as MedicineCategory),
    dosage_form: medicine?.dosage_form ?? ("ml" as DosageForm),
    unit_price: medicine?.unit_price ?? "0",
    reorder_level: String(medicine?.reorder_level ?? 10),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        unit_price: form.unit_price,
        reorder_level: Number(form.reorder_level),
      };
      if (isEdit) {
        await pharmacyApi.updateMedicine(medicine!.id, payload);
      } else {
        await pharmacyApi.createMedicine(payload);
      }
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; name?: string[] } } })
          ?.response?.data?.name?.[0] ??
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ??
        "Failed to save medicine.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="mb-6 rounded-lg border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEdit ? "Edit Medicine" : "Add Medicine"}
        </h2>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tamil Name</label>
          <input
            type="text"
            value={form.name_ta}
            onChange={(e) => update("name_ta", e.target.value)}
            className="w-full rounded-lg border border-emerald-200 bg-emerald-50/30 px-3 py-2 text-sm focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Category *</label>
          <select
            required
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Dosage Form *</label>
          <select
            required
            value={form.dosage_form}
            onChange={(e) => update("dosage_form", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            {DOSAGE_FORM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Unit Price (₹)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.unit_price}
            onChange={(e) => update("unit_price", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Reorder Level</label>
          <input
            type="number"
            min="0"
            value={form.reorder_level}
            onChange={(e) => update("reorder_level", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          />
        </div>

        <div className="sm:col-span-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
