import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CreateEvaluationDialog } from "@/components/CreateEvaluationDialog";
import { EvaluationProvider } from "@/components/EvaluationProvider";
import { SOURCE_TASKS, completedKeyTasks } from "@/lib/source-tasks";
import { CURRENT_USER } from "@/lib/users";
it("lists the selected performer's completed key tasks and fills task metadata", () => {
  render(<EvaluationProvider><CreateEvaluationDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} /></EvaluationProvider>);
  expect(screen.queryByRole("columnheader", { name: "QLTT đánh giá (tự phân bổ)" })).not.toBeInTheDocument();
  expect(screen.queryByText("Tuân thủ nội quy lao động")).not.toBeInTheDocument();
  expect(screen.queryByText("THỦ TRƯỞNG GIAO NHIỆM VỤ")).not.toBeInTheDocument();
  const task = completedKeyTasks(SOURCE_TASKS, CURRENT_USER.employeeId)[0]!;
  const picker = screen.getByRole("combobox", { name: "Nhiệm vụ *" });
  expect(screen.getByRole("combobox", { name: "Nhiệm vụ * 2" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Nhiệm vụ * 3" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: task.criterion.goal + " — " + task.status })).toBeInTheDocument();
  fireEvent.change(picker, { target: { value: task.id } });
  expect(screen.getByLabelText("Chỉ số đo lường KPI 1", { exact: true })).toHaveValue(task.criterion.kpi);
  expect(screen.getByLabelText("Tỷ trọng 1", { exact: true })).toHaveValue(10);
  for (const group of ["B-I", "B-II"]) {
    const row = group === "B-I" ? 2 : 3;
    const source = SOURCE_TASKS.find((t) => t.employeeId === CURRENT_USER.employeeId && t.criterion.group === group)!;
    fireEvent.change(screen.getByRole("combobox", { name: `Nhiệm vụ * ${row}` }), { target: { value: source.id } });
    expect(screen.getByLabelText(`Chỉ số đo lường KPI ${row}`, { exact: true })).toHaveValue(source.criterion.kpi);
  }
});

it("totals each functional subgroup from its detail weights", () => {
  render(<EvaluationProvider><CreateEvaluationDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} /></EvaluationProvider>);
  expect(screen.getByRole("row", { name: /^I\. Mục tiêu theo chức năng/ })).toHaveTextContent("0%");
  fireEvent.change(screen.getByLabelText("Tỷ trọng 2", { exact: true }), { target: { value: "35" } });
  fireEvent.change(screen.getByLabelText("Tỷ trọng 3", { exact: true }), { target: { value: "45" } });
  expect(screen.getByRole("row", { name: /^I\. Mục tiêu theo chức năng/ })).toHaveTextContent("35%");
  expect(screen.getByRole("row", { name: /^II\. Chỉ số kiểm soát ngành dọc/ })).toHaveTextContent("45%");
  expect(screen.getByRole("row", { name: /^B\. Nhóm mục tiêu theo chức năng/ })).toHaveTextContent("80% / 80%");
});

it("rejects detail weights that would put group B above 80 percent", () => {
  render(<EvaluationProvider><CreateEvaluationDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} /></EvaluationProvider>);
  fireEvent.change(screen.getByLabelText("Tỷ trọng 2", { exact: true }), { target: { value: "35" } });
  fireEvent.change(screen.getByLabelText("Tỷ trọng 3", { exact: true }), { target: { value: "46" } });
  expect(screen.getByLabelText("Tỷ trọng 3", { exact: true })).toHaveValue(null);
  expect(screen.getByRole("alert")).toHaveTextContent("tối đa 45%");
  fireEvent.change(screen.getByLabelText("Tỷ trọng 3", { exact: true }), { target: { value: "45" } });
  expect(screen.getByLabelText("Tỷ trọng 3", { exact: true })).toHaveValue(45);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("normalizes a leading zero in percentage input", () => {
  render(<EvaluationProvider><CreateEvaluationDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} /></EvaluationProvider>);
  const input = screen.getByLabelText("Tỷ trọng 3", { exact: true });
  fireEvent.change(input, { target: { value: "040" } });
  expect(input).toHaveValue(40);
  expect((input as HTMLInputElement).value).toBe("40");
});
