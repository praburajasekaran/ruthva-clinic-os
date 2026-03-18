"use client";

import { ENVAGAI_OPTIONS, type EnvagaiTool } from "@/lib/constants/envagai-options";
import type { DiagnosticData, Discipline } from "@/lib/types";

function parseEnvagaiValue(raw: string): Record<string, string> {
  if (!raw) return {};
  const result: Record<string, string> = {};
  for (const part of raw.split("|")) {
    const [k, ...v] = part.split(":");
    if (k) result[k] = v.join(":");
  }
  return result;
}

type DiagnosticDataDisplayProps = {
  discipline: Discipline;
  data: DiagnosticData;
};

export function DiagnosticDataDisplay({
  discipline,
  data,
}: DiagnosticDataDisplayProps) {
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-sm text-gray-400">No diagnostic data recorded.</p>;
  }

  switch (discipline) {
    case "siddha":
      return <EnvagaiDisplay data={(data.envagai_thervu as Record<string, string>) ?? {}} />;
    case "ayurveda":
      return <PrakritiDisplay data={(data.prakriti as Record<string, string>) ?? {}} />;
    case "yoga_naturopathy":
    case "unani":
    case "homeopathy":
      return <NotesDisplay notes={(data.notes as string) ?? ""} />;
    default:
      return <GenericJsonDisplay data={data} />;
  }
}

function EnvagaiDisplay({ data }: { data: Record<string, string> }) {
  if (Object.keys(data).length === 0) {
    return <p className="text-sm text-gray-400">No Envagai Thervu data recorded.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {(
        Object.entries(ENVAGAI_OPTIONS) as [
          EnvagaiTool,
          (typeof ENVAGAI_OPTIONS)[EnvagaiTool],
        ][]
      ).map(([key, tool]) => {
        const raw = data[key] ?? "";
        const values = parseEnvagaiValue(raw);
        const hasData = Object.keys(values).length > 0;
        return (
          <div key={key} className="rounded-lg border border-gray-100 p-3">
            <h4 className="text-sm font-medium text-gray-900">
              {tool.label}{" "}
              <span lang="ta" className="text-xs text-gray-400">
                ({tool.labelTamil})
              </span>
            </h4>
            {hasData ? (
              <dl className="mt-2 space-y-1 text-xs">
                {Object.entries(values).map(([field, val]) => (
                  <div key={field}>
                    <dt className="inline capitalize text-gray-500">
                      {field.replace(/_/g, " ")}:
                    </dt>{" "}
                    <dd className="inline text-gray-700">{val}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-xs text-gray-400">Not assessed</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PrakritiDisplay({ data }: { data: Record<string, string> }) {
  if (Object.keys(data).length === 0) {
    return <p className="text-sm text-gray-400">No Prakriti data recorded.</p>;
  }

  const labels: Record<string, string> = {
    dosha_type: "Dosha Type",
    body_frame: "Body Frame",
    skin_type: "Skin Type",
    digestion: "Agni (Digestive Fire)",
    mental_tendency: "Mental Tendency",
    notes: "Notes",
  };

  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
      {Object.entries(data).map(([key, val]) => {
        if (!val) return null;
        return (
          <div key={key} className="rounded-lg border border-gray-100 p-3">
            <dt className="text-gray-500">{labels[key] ?? key.replace(/_/g, " ")}</dt>
            <dd className="mt-1 font-medium text-gray-900">{val}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function NotesDisplay({ notes }: { notes: string }) {
  if (!notes) {
    return <p className="text-sm text-gray-400">No diagnostic notes recorded.</p>;
  }

  return (
    <div className="text-sm text-gray-900 whitespace-pre-wrap">{notes}</div>
  );
}

function GenericJsonDisplay({ data }: { data: DiagnosticData }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
