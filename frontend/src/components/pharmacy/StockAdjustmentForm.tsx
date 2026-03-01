"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { pharmacyApi } from "@/lib/api";

type Props = {
  medicineId: number;
  onClose: () => void;
  onSaved: () => void;
};

export function StockAdjustmentForm({ medicineId, onClose, onSaved }: Props) {
  const [quantity, setQuantity] = useState("");
  const [entryType, setEntryType] = useState<"purchase" | "adjustment">("purchase");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await pharmacyApi.adjustStock(medicineId, {
        quantity: Number(quantity),
        entry_type: entryType,
        notes,
      });
      onSaved();
    } catch {
      setError("Failed to adjust stock.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Add Stock</h3>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Type</label>
          <select
            value={entryType}
            onChange={(e) => setEntryType(e.target.value as "purchase" | "adjustment")}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="purchase">Purchase</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Quantity *</label>
          <input
            type="number"
            min="1"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-24 rounded-lg border px-3 py-2 text-sm"
            placeholder="0"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Optional notes..."
          />
        </div>
        <button
          type="submit"
          disabled={saving || !quantity}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Add"}
        </button>
      </form>
    </div>
  );
}
