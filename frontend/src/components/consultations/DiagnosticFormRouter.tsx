"use client";

import dynamic from "next/dynamic";
import type { EnvagaiTool } from "@/lib/constants/envagai-options";
import type { Discipline, DiagnosticData } from "@/lib/types";

const EnvagaiThervu = dynamic(() =>
  import("./EnvagaiThervu").then((m) => ({ default: m.EnvagaiThervu })),
);
const PrakritiForm = dynamic(() =>
  import("./PrakritiForm").then((m) => ({ default: m.PrakritiForm })),
);
const GenericDiagnosticForm = dynamic(() =>
  import("./GenericDiagnosticForm").then((m) => ({
    default: m.GenericDiagnosticForm,
  })),
);

type DiagnosticFormRouterProps = {
  discipline: Discipline;
  value: DiagnosticData;
  onChange: (data: DiagnosticData) => void;
};

export function DiagnosticFormRouter({
  discipline,
  value,
  onChange,
}: DiagnosticFormRouterProps) {
  switch (discipline) {
    case "siddha": {
      const envagai = (value.envagai_thervu as Record<string, string>) ?? {};
      return (
        <EnvagaiThervu
          values={envagai}
          onChange={(tool: EnvagaiTool, toolValue: string) =>
            onChange({
              envagai_thervu: { ...envagai, [tool]: toolValue },
            })
          }
        />
      );
    }
    case "ayurveda":
      return (
        <PrakritiForm
          value={(value.prakriti as Record<string, string>) ?? {}}
          onChange={(updated) => onChange({ prakriti: updated })}
        />
      );
    case "yoga_naturopathy":
    case "unani":
    case "homeopathy":
      return (
        <GenericDiagnosticForm
          value={(value.notes as string) ?? ""}
          onChange={(notes) => onChange({ notes })}
        />
      );
    default:
      return null;
  }
}
