export const ENABLED_DISCIPLINES = ["siddha"] as const;
export const DEFAULT_DISCIPLINE = ENABLED_DISCIPLINES[0];

export function isEnabledDiscipline(value: unknown): boolean {
  return ENABLED_DISCIPLINES.some((discipline) => discipline === value);
}
