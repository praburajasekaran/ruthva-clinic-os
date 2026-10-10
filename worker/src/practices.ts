import { isEnabledDiscipline } from "../../shared/practices";
import { check } from "./data";

export function requireEnabledDiscipline(value: unknown, status = 400): void {
  check(
    isEnabledDiscipline(value),
    "Ruthva currently supports Siddha practices only. Other practices are paused.",
    status,
  );
}
