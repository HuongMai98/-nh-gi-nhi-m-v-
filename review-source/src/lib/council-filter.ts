import type { Step } from "./evaluation";
export const COUNCIL_FILTERS = [
  { key: "pending", label: "Chờ Hội đồng đánh giá" },
  { key: "completed", label: "Hội đồng đã đánh giá" },
  { key: "adjustment", label: "Chờ Hội đồng điều chỉnh" },
  { key: "submitted", label: "Đang trình ký" },
  { key: "approved", label: "Đã phê duyệt" },
] as const;
export type CouncilFilter = (typeof COUNCIL_FILTERS)[number]["key"];
export function councilStatus(step: Step, reviewed = false): CouncilFilter | null {
  if (["council", "council_adjust"].includes(step) && reviewed) return "completed";
  if (step === "council") return "pending";
  if (step === "council_adjust") return "adjustment";
  if (step === "ceo") return "submitted";
  if (["approved", "dispatch", "sign", "done"].includes(step)) return "approved";
  return null;
}
