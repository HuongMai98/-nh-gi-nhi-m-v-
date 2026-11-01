import type { Evaluation } from "./evaluation";
export type CqttStatus = "pending" | "waiting" | "submitted";
export function cqttStatus(e: Evaluation): CqttStatus | null {
  if (e.step === "cqtt" || e.step === "cqtt_report") return "pending";
  if (e.step === "response") return "waiting";
  if (["council", "council_adjust", "ceo", "approved", "dispatch", "sign", "done"].includes(e.step)) return "submitted";
  return null;
}
