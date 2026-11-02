import { EVALUATIONS, type Criterion } from "./evaluation";
export type SourceTask = {
  id: string;
  employeeId: string;
  status: "Đã kết thúc" | "Đã đóng" | "Đang thực hiện";
  criterion: Criterion;
};
export function completedTasks(tasks: SourceTask[], employeeId: string, group: Criterion["group"]) {
  return tasks.filter((task) => task.employeeId === employeeId && task.criterion.group === group &&
    (task.status === "Đã kết thúc" || task.status === "Đã đóng"));
}
// shortcut: nhiệm vụ mẫu, thay bằng API danh sách nhiệm vụ khi tích hợp QLTT.
// Phiếu mẫu sao chép (vd. DG-2026-Q3-009) không được sinh nhiệm vụ trùng cho cùng người.
const seenTasks = new Set<string>();
export const SOURCE_TASKS: SourceTask[] = EVALUATIONS.flatMap((e) => e.criteria.map((criterion, index): SourceTask => ({
  id: `${e.assignmentRef}-${index + 1}`,
  employeeId: e.employeeId!,
  status: index % 2 === 0 ? "Đã kết thúc" : "Đã đóng",
  criterion,
}))).filter((task) => {
  const key = `${task.employeeId}|${task.criterion.group}|${task.criterion.goal}`;
  if (seenTasks.has(key)) return false;
  seenTasks.add(key);
  return true;
});

export const completedKeyTasks = (tasks: SourceTask[], employeeId: string) => completedTasks(tasks, employeeId, "A");
