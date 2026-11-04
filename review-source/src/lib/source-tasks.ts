import { EVALUATIONS, type Criterion } from "./evaluation";
export type SourceTask = {
  id: string;
  employeeId: string;
  /** Đơn vị của nhiệm vụ: form Tạo đánh giá lấy mọi nhiệm vụ của đơn vị người được đánh giá. */
  unit: string;
  status: "Đã kết thúc" | "Đã đóng" | "Đang thực hiện";
  criterion: Criterion;
};
/** Nhiệm vụ của đơn vị trong quý đánh giá (mọi trạng thái); nhiệm vụ chưa có ngày vẫn được lấy. */
export function quarterTasks(tasks: SourceTask[], unit: string, quarter: string, year: string, group?: Criterion["group"]) {
  const q = ["I", "II", "III", "IV"].indexOf(quarter);
  const from = `${year}-${String(q * 3 + 1).padStart(2, "0")}-01`;
  const to = `${year}-${String(q * 3 + 3).padStart(2, "0")}-31`;
  return tasks.filter((task) => task.unit === unit && (!group || task.criterion.group === group) &&
    (task.criterion.startDate ?? from) <= to && (task.criterion.endDate ?? to) >= from);
}
// shortcut: nhiệm vụ mẫu, thay bằng API danh sách nhiệm vụ khi tích hợp QLTT.
// Phiếu mẫu sao chép (vd. DG-2026-Q3-009) không được sinh nhiệm vụ trùng trong cùng đơn vị.
const seenTasks = new Set<string>();
export const SOURCE_TASKS: SourceTask[] = EVALUATIONS.flatMap((e) => e.criteria.map((criterion, index): SourceTask => ({
  id: `${e.assignmentRef}-${index + 1}`,
  employeeId: e.employeeId!,
  unit: e.unit,
  status: (["Đã kết thúc", "Đã đóng", "Đang thực hiện"] as const)[index % 3]!,
  criterion,
}))).filter((task) => {
  const key = `${task.unit}|${task.criterion.group}|${task.criterion.goal}`;
  if (seenTasks.has(key)) return false;
  seenTasks.add(key);
  return true;
});

