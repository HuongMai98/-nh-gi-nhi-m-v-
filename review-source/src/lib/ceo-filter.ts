import type { Step } from "./evaluation";
export const CEO_FILTERS = [{ key: "pending", label: "Đang trình ký" }, { key: "approved", label: "Đã phê duyệt" }] as const;
export type CeoFilter = (typeof CEO_FILTERS)[number]["key"];
export function ceoStatus(step: Step): CeoFilter | null {
  if (step === "ceo") return "pending";
  return ["approved", "dispatch", "sign", "done"].includes(step) ? "approved" : null;
}
