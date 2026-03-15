"use client";

import dynamic from "next/dynamic";
import type { EnvagaiTool } from "@/lib/constants/envagai-options";
import type { Discipline, DiagnosticData } from "@/lib/types";
import type { HomeopathyCaseData } from "./HomeopathyCaseTakingForm";
import { EMPTY_HOMEOPATHY_CASE } from "./HomeopathyCaseTakingForm";

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
const HomeopathyCaseTakingForm = dynamic(() =>
  import("./HomeopathyCaseTakingForm").then((m) => ({
    default: m.HomeopathyCaseTakingForm,
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
    case "homeopathy":
      return (
        <HomeopathyCaseTakingForm
          value={(value.homeopathy_case as HomeopathyCaseData) ?? EMPTY_HOMEOPATHY_CASE}
          onChange={(updated) => onChange({ homeopathy_case: updated })}
        />
      );
    case "yoga_naturopathy":
    case "unani":
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
