import { expect, it } from "vitest";
import { quarterTasks, SOURCE_TASKS } from "@/lib/source-tasks";
it("lấy mọi trạng thái nhiệm vụ của người thực hiện trong quý đánh giá", () => {
  const first = SOURCE_TASKS[0]!;
  const tasks = [first, { ...first, id: "closed", status: "Đã đóng" as const },
    { ...first, id: "active", status: "Đang thực hiện" as const },
    { ...first, id: "other", employeeId: "other" },
    { ...first, id: "function", criterion: { ...first.criterion, group: "B-I" as const } },
    { ...first, id: "q4", criterion: { ...first.criterion, startDate: "2026-10-01", endDate: "2026-12-15" } }];
  expect(quarterTasks(tasks, first.employeeId, "III", "2026", "A").map((t) => t.id)).toEqual([first.id, "closed", "active"]);
  expect(quarterTasks(tasks, first.employeeId, "IV", "2026", "A").map((t) => t.id)).toEqual(["q4"]);
  expect(quarterTasks(tasks, "missing", "III", "2026")).toEqual([]);
  expect(new Set(SOURCE_TASKS.map((t) => t.status))).toEqual(new Set(["Đã kết thúc", "Đã đóng", "Đang thực hiện"]));
});
