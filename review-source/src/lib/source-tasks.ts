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
export const SOURCE_TASKS: SourceTask[] = EVALUATIONS.flatMap((e) => e.criteria.map((criterion, index) => ({
  id: `${e.assignmentRef}-${index + 1}`,
  employeeId: e.employeeId!,
  status: index % 2 === 0 ? "Đã kết thúc" : "Đã đóng",
  criterion,
})));

export const completedKeyTasks = (tasks: SourceTask[], employeeId: string) => completedTasks(tasks, employeeId, "A");
