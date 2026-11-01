import type { Evaluation } from "./evaluation";
export type OfficeStatus = "pending" | "completed";
export function officeAggregationStatus(e: Evaluation): OfficeStatus | null {
  if (e.step === "self") return null;
  return e.step === "office" ? "pending" : "completed";
}
