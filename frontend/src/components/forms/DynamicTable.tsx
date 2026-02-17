"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Column = {
  key: string;
  label: string;
  placeholder?: string;
};

type DynamicTableProps = {
  columns: Column[];
  rows: Record<string, string>[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, key: string, value: string) => void;
  addLabel?: string;
};

export function DynamicTable({
  columns,
  rows,
  onAdd,
  onRemove,
  onChange,
  addLabel = "Add Row",
}: DynamicTableProps) {
  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <div className="space-y-2">
          {/* Header - hidden on mobile */}
          <div className="hidden grid-cols-[1fr_auto] gap-2 md:grid">
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
              }}
            >
              {columns.map((col) => (
                <span
                  key={col.key}
                  className="text-sm font-medium text-gray-700"
                >
                  {col.label}
                </span>
              ))}
            </div>
            <div className="w-9" />
          </div>

          {/* Rows */}
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_auto] items-start gap-2"
            >
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
                }}
              >
                {columns.map((col) => (
                  <Input
                    key={col.key}
                    value={row[col.key] ?? ""}
                    onChange={(e) => onChange(idx, col.key, e.target.value)}
                    placeholder={col.placeholder ?? col.label}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="mt-2 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Remove row ${idx + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onAdd}
        className="text-emerald-700"
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  );
}
