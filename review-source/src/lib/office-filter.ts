import type { Evaluation } from "./evaluation";
export type OfficeStatus = "pending" | "completed";
export function officeAggregationStatus(e: Evaluation): OfficeStatus | null {
  if (e.step === "self") return null;
  return e.step === "office" ? "pending" : "completed";
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
