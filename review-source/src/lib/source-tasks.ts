import { EVALUATIONS, type Criterion } from "./evaluation";

/**
 * Trạng thái nhiệm vụ theo VOffice (API /missionAction/getListMissionStatus, bảng MISSION):
 * Quá hạn / Sắp đến hạn / Đang thực hiện: STATUS in (1,2,7) xét theo hạn hoàn thành;
 * 3 Hoàn thành chờ phê duyệt · 4 Đã kết thúc · 5 Đề xuất đóng · 6 Đã đóng · 7 Đề xuất gia hạn;
 * Đã chuyển: IS_TRANSFER_ORG_PERFORM = 1.
 */
export const TASK_STATUSES = [
  "Quá hạn chưa hoàn thành",
  "Sắp đến hạn",
  "Đang thực hiện",
  "Hoàn thành chờ phê duyệt",
  "Đã kết thúc",
  "Đề xuất đóng",
  "Đã đóng",
  "Đề xuất gia hạn",
  "Đã chuyển",
] as const;

/**
 * Nhiệm vụ nguồn (VOffice) dùng để điền phiếu đánh giá. Ánh xạ khi tích hợp:
 * - id: MISSION.MISSION_ID · employeeId: người thực hiện · unit: MISSION.ORG_PERFORM_ID (đơn vị thực hiện)
 * - criterion.goal: MISSION.MISSION_NAME · criterion.result: MISSION.MISSION_RESULT (kết quả thực hiện, điền sẵn)
 * - criterion.startDate: MISSION.DATE_START · criterion.endDate: MISSION.DATE_COMPLETE (hạn hoàn thành)
 * - criterion.group: A khi nhóm nhiệm vụ (MISSION.MISSION_GROUP) thuộc danh mục trọng điểm, còn lại B
 * - VOffice không có KPI, phương pháp đo, đơn vị đo, mức T/B/S, tỷ trọng %: lấy từ phiếu giao nhiệm vụ.
 */
export type SourceTask = {
  id: string;
  employeeId: string;
  /** Đơn vị của nhiệm vụ: form Tạo đánh giá lấy mọi nhiệm vụ của đơn vị người được đánh giá. */
  unit: string;
  status: (typeof TASK_STATUSES)[number];
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
// shortcut: nhiệm vụ mẫu (trạng thái xoay vòng theo danh sách VOffice), thay bằng API
// /missionAction/findMissionByCondition khi tích hợp.
// Phiếu mẫu sao chép (vd. DG-2026-Q3-009) không được sinh nhiệm vụ trùng trong cùng đơn vị.
const seenTasks = new Set<string>();
export const SOURCE_TASKS: SourceTask[] = EVALUATIONS.flatMap((e) => e.criteria.map((criterion, index) => ({
  id: `${e.assignmentRef}-${index + 1}`,
  employeeId: e.employeeId!,
  unit: e.unit,
  criterion,
}))).filter((task) => {
  const key = `${task.unit}|${task.criterion.group}|${task.criterion.goal}`;
  if (seenTasks.has(key)) return false;
  seenTasks.add(key);
  return true;
}).map((task, i): SourceTask => ({ ...task, status: TASK_STATUSES[i % TASK_STATUSES.length]! }));
