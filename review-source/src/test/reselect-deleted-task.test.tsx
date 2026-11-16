import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { CreateEvaluationTable, type FormCriterion } from "@/components/CreateEvaluationTable";
import { SOURCE_TASKS, quarterTasks } from "@/lib/source-tasks";
it("a deleted system task can be selected again", () => {
  const unit = SOURCE_TASKS[0]!.unit;
  const tasksFor = (group: FormCriterion["group"]) => quarterTasks(SOURCE_TASKS, unit, "III", "2026", group);
  const initial: FormCriterion[] = quarterTasks(SOURCE_TASKS, unit, "III", "2026").map((t) => ({ ...t.criterion, self: 0, sourceTaskId: t.id }));
  const deleted = initial[0]!;
  function Probe() {
    const [items, setItems] = useState<FormCriterion[]>(initial);
    return <CreateEvaluationTable items={items} tasksFor={tasksFor} onChange={setItems} />;
  }
  render(<Probe />);
  fireEvent.click(screen.getByRole("button", { name: "Xóa nhiệm vụ 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Đồng ý" }));
  const option = within(screen.getAllByRole("combobox")[0]!).queryAllByRole("option").find((o) => o.textContent?.startsWith(deleted.goal));
  expect(option).toBeDefined();
  expect(option).not.toHaveAttribute("disabled");
});
it("lists removed system tasks and restores one with Khôi phục", () => {
  const unit = SOURCE_TASKS[0]!.unit;
  const tasksFor = (group: FormCriterion["group"]) => quarterTasks(SOURCE_TASKS, unit, "III", "2026", group);
  const initial: FormCriterion[] = quarterTasks(SOURCE_TASKS, unit, "III", "2026").map((t) => ({ ...t.criterion, self: 0, sourceTaskId: t.id }));
  function Probe() {
    const [items, setItems] = useState<FormCriterion[]>(initial);
    return <><output data-testid="count">{items.length}</output><CreateEvaluationTable items={items} tasksFor={tasksFor} onChange={setItems} /></>;
  }
  render(<Probe />);
  const total = tasksFor("A").length + tasksFor("B-I").length + tasksFor("B-II").length;
  expect(document.body.textContent).toContain("Đã loại: 0");
  fireEvent.click(screen.getByRole("button", { name: "Xóa nhiệm vụ 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Đồng ý" }));
  expect(document.body.textContent).toContain("Đã loại: 1");
  expect(document.body.textContent).toContain(`Cần đánh giá: ${total}`);
  fireEvent.click(screen.getByRole("button", { name: "Khôi phục" }));
  expect(document.body.textContent).toContain("Đã loại: 0");
  expect(Number(screen.getByTestId("count").textContent)).toBe(initial.length);
});
it("opens task detail for a selected system task from the create form", () => {
  const unit = SOURCE_TASKS[0]!.unit;
  const tasksFor = (group: FormCriterion["group"]) => quarterTasks(SOURCE_TASKS, unit, "III", "2026", group);
  const initial: FormCriterion[] = quarterTasks(SOURCE_TASKS, unit, "III", "2026").map((t) => ({ ...t.criterion, self: 0, sourceTaskId: t.id }));
  render(<CreateEvaluationTable items={initial} tasksFor={tasksFor} onChange={() => {}} detailContext={{ id: "", unit, owner: "Người tạo" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết nhiệm vụ 1" }));
  expect(screen.getAllByText(initial[0]!.goal).length).toBeGreaterThan(0);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
