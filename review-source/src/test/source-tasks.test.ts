import { expect, it } from "vitest";
import { completedKeyTasks, SOURCE_TASKS } from "@/lib/source-tasks";
it("shows all closed/finished key tasks of the selected performer only", () => {
  const first = SOURCE_TASKS[0]!;
  const tasks = [first, { ...first, id: "closed", status: "Đã đóng" as const },
    { ...first, id: "active", status: "Đang thực hiện" as const },
    { ...first, id: "other", employeeId: "other" },
    { ...first, id: "function", criterion: { ...first.criterion, group: "B-I" as const } }];
  expect(completedKeyTasks(tasks, first.employeeId).map((t) => t.id)).toEqual([first.id, "closed"]);
  expect(completedKeyTasks(tasks, "missing")).toEqual([]);
});
