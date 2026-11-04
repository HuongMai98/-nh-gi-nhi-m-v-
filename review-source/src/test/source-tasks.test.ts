import { expect, it } from "vitest";
import { quarterTasks, SOURCE_TASKS, TASK_STATUSES } from "@/lib/source-tasks";
it("lấy mọi công việc của đơn vị người được đánh giá trong quý, mọi trạng thái", () => {
  const first = SOURCE_TASKS[0]!;
  const tasks = [first, { ...first, id: "closed", status: "Đã đóng" as const },
    { ...first, id: "active", status: "Đang thực hiện" as const },
    { ...first, id: "colleague", employeeId: "colleague" },
    { ...first, id: "other-unit", unit: "Đơn vị khác" },
    { ...first, id: "function", criterion: { ...first.criterion, group: "B-I" as const } },
    { ...first, id: "q4", criterion: { ...first.criterion, startDate: "2026-10-01", endDate: "2026-12-15" } }];
  expect(quarterTasks(tasks, first.unit, "III", "2026", "A").map((t) => t.id)).toEqual([first.id, "closed", "active", "colleague"]);
  expect(quarterTasks(tasks, first.unit, "IV", "2026", "A").map((t) => t.id)).toEqual(["q4"]);
  expect(quarterTasks(tasks, "missing", "III", "2026")).toEqual([]);
  // Dữ liệu mẫu phủ đủ các trạng thái nhiệm vụ của VOffice.
  expect(new Set(SOURCE_TASKS.map((t) => t.status))).toEqual(new Set(TASK_STATUSES));
});
