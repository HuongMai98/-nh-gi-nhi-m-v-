import type { Step } from "./evaluation";
export const COUNCIL_FILTERS = [
  { key: "pending", label: "Chờ CQTT đánh giá" },
  { key: "completed", label: "CQTT đã đánh giá" },
  { key: "submitted", label: "Đang trình ký" },
  { key: "approved", label: "Đã phê duyệt" },
] as const;
export type CouncilFilter = (typeof COUNCIL_FILTERS)[number]["key"];
export function councilStatus(step: Step, reviewed = false): CouncilFilter | null {
  if (["council", "council_adjust"].includes(step) && reviewed) return "completed";
  if (step === "council") return "pending";
  if (step === "council_adjust") return "pending";
  if (step === "ceo") return "submitted";
  if (["approved", "dispatch", "sign", "done"].includes(step)) return "approved";
  return null;
}
