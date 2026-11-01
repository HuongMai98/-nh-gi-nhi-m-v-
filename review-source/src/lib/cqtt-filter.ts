import type { Evaluation } from "./evaluation";
export type CqttStatus = "pending" | "report" | "waiting" | "submitted";
export function cqttStatus(e: Evaluation): CqttStatus | null {
  if (e.step === "cqtt") return "pending";
  if (e.step === "cqtt_report") return "report";
  if (e.step === "response") return "waiting";
  if (["council", "council_adjust", "ceo", "approved", "dispatch", "sign", "done"].includes(e.step)) return "submitted";
  return null;
}
