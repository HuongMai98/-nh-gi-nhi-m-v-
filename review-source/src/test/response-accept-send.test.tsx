import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CreateEvaluationDialog } from "@/components/CreateEvaluationDialog";
import { EvaluationProvider } from "@/components/EvaluationProvider";
import { EVALUATIONS, allocateCouncilScores, cqttTotal } from "@/lib/evaluation";

it("Chờ CQ/CQĐV phản hồi: Tiếp thu điền điểm CQTT → Lưu cập nhật → Gửi CQTT", () => {
  const existing = EVALUATIONS.find((e) => e.id === "DG-2026-Q3-009")!;
  const onCreated = vi.fn();
  render(<EvaluationProvider><CreateEvaluationDialog existing={existing} open onOpenChange={vi.fn()} onCreated={onCreated} /></EvaluationProvider>);
  const save = screen.getByRole("button", { name: "Lưu cập nhật" });
  const send = screen.getByRole("button", { name: "Gửi CQTT" });
  expect(save).toBeDisabled();
  expect(send).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "Tiếp thu" }));
  const expected = allocateCouncilScores(existing.criteria, cqttTotal(existing)!).map((c) => Math.round(c.council! * 100) / 100);
  expect(expected.some((v) => !Number.isInteger(v))).toBe(true);
  const selfInputs = screen.getAllByRole("spinbutton", { name: /^Điểm tự đánh giá nhiệm vụ/ });
  expect(selfInputs.map((input) => Number((input as HTMLInputElement).value))).toEqual(expected);
  expect(save).toBeEnabled();
  expect(send).toBeDisabled();

  fireEvent.click(save);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(onCreated).not.toHaveBeenCalled();
  expect(send).toBeEnabled();

  // Sửa sau khi lưu → phải lưu lại mới được gửi.
  fireEvent.change(selfInputs[0]!, { target: { value: "5" } });
  expect(send).toBeDisabled();
  fireEvent.click(save);
  expect(send).toBeEnabled();

  fireEvent.click(send);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(onCreated).toHaveBeenCalled();
});
