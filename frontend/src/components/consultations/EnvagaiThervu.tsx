"use client";

import { PillGroup } from "@/components/ui/PillGroup";
import { DoshaChip, isDoshaType } from "@/components/ui/DoshaChip";
import { ENVAGAI_OPTIONS, type EnvagaiTool } from "@/lib/constants/envagai-options";

type EnvagaiThervuProps = {
  values: Record<string, string>;
  onChange: (tool: EnvagaiTool, value: string) => void;
};

export function EnvagaiThervu({ values, onChange }: EnvagaiThervuProps) {
  const tools = Object.entries(ENVAGAI_OPTIONS) as [
    EnvagaiTool,
    (typeof ENVAGAI_OPTIONS)[EnvagaiTool],
  ][];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {tools.map(([key, tool]) => (
        <div
          key={key}
          className="rounded-lg border border-border p-4"
        >
          <div className="mb-3 flex items-baseline gap-2">
            <h4 className="font-semibold text-foreground">{tool.label}</h4>
            <span lang="ta" className="text-xs text-muted-foreground">
              ({tool.labelTamil})
            </span>
            <span className="text-xs text-muted-foreground/60">{tool.translation}</span>
            {key === "nadi" && (() => {
              const nadiType = getFieldValue(values[key] ?? "", "type").toLowerCase();
              return isDoshaType(nadiType) ? (
                <DoshaChip dosha={nadiType as "vatham" | "pitham" | "kapham"} />
              ) : null;
            })()}
          </div>

          <div className="space-y-5">
            {Object.entries(tool.fields).map(([fieldKey, options]) => (
              <div key={fieldKey}>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {fieldKey.replace(/_/g, " ")}
                </label>
                <PillGroup
                  label={fieldKey.replace(/_/g, " ")}
                  options={options as readonly string[]}
                  value={getFieldValue(values[key] ?? "", fieldKey)}
                  onChange={(val) => {
                    const updated = setFieldValue(
                      values[key] ?? "",
                      fieldKey,
                      val,
                    );
                    onChange(key, updated);
                  }}
                />
              </div>
            ))}

            {/* Notes field */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Notes
              </label>
              <textarea
                value={getFieldValue(values[key] ?? "", "notes")}
                onChange={(e) => {
                  const updated = setFieldValue(
                    values[key] ?? "",
                    "notes",
                    e.target.value,
                  );
                  onChange(key, updated);
                }}
                placeholder="Additional observations..."
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Envagai data is stored as pipe-separated key:value pairs in a text field
// e.g. "color:Pink|coating:None|notes:Some observation"
function getFieldValue(raw: string, field: string): string {
  if (!raw) return "";
  const parts = raw.split("|");
  for (const part of parts) {
    const [k, ...v] = part.split(":");
    if (k === field) return v.join(":");
  }
  return "";
}

function setFieldValue(raw: string, field: string, value: string): string {
  const parts = raw ? raw.split("|").filter(Boolean) : [];
  const existing = parts.findIndex((p) => p.startsWith(`${field}:`));
  if (existing >= 0) {
    if (value) {
      parts[existing] = `${field}:${value}`;
    } else {
      parts.splice(existing, 1);
    }
  } else if (value) {
    parts.push(`${field}:${value}`);
  }
  return parts.join("|");
}
