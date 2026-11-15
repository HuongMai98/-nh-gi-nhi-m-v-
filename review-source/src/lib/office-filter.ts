import type { Evaluation } from "./evaluation";
export type OfficeStatus = "pending" | "completed";
/** Văn phòng thẩm định: Chờ thẩm định → Đã gửi tổ giúp việc. */
export function officeAggregationStatus(e: Evaluation): OfficeStatus | null {
  if (e.step === "self") return null;
  return e.step === "office" ? "pending" : "completed";
}
/** Văn phòng (Tổ giúp việc): Chờ tổng hợp (bước Tổ giúp việc) → Đã gửi CQTT. */
export function supportOfficeStatus(e: Evaluation): OfficeStatus | null {
  if (["self", "office"].includes(e.step)) return null;
  return e.step === "support" ? "pending" : "completed";
}
/** Cơ quan Chính trị / Tổ chức Nhân lực / Ban Chiến lược: chờ cho ý kiến hoặc đã cho ý kiến. */
export type SupportStatus = "pending" | "commented" | "sent";
export function supportStatus(e: Evaluation, role: string): SupportStatus | null {
  const mine = e.supportOpinions?.some((o) => o.role === role);
  if (e.step === "support") return mine ? "commented" : "pending";
  if (["self", "office"].includes(e.step)) return null;
  return mine ? "sent" : null;
}

/** Tiến độ cá nhân gửi tự đánh giá, độc lập với bộ lọc trạng thái/tìm kiếm. */
export function officeSubmissionSummary(
  evaluations: Evaluation[],
  period: string,
  block: "all" | Evaluation["block"],
  unit = "",
) {
  const scope = evaluations.filter((e) =>
    e.period === period && (block === "all" || e.block === block) && (!unit || e.unit === unit),
  );
  return {
    unassessed: scope.filter((e) => e.step === "self").length,
    total: scope.length,
  };
}

export function officeUnassessedEvaluations(
  evaluations: Evaluation[],
  period: string,
  block: "all" | Evaluation["block"],
  unit = "",
) {
  return evaluations.filter((e) => e.step === "self" && e.period === period &&
    (block === "all" || e.block === block) && (!unit || e.unit === unit));
}
