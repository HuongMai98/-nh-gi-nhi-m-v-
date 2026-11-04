import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { EvaluationProvider } from "@/components/EvaluationProvider";
import { CreateEvaluationDialog } from "@/components/CreateEvaluationDialog";
import { CURRENT_USER } from "@/lib/users";
it("saves an incomplete self-score draft with current user metadata", () => {
  const onCreated = vi.fn();
  render(<EvaluationProvider><CreateEvaluationDialog open onOpenChange={vi.fn()} onCreated={onCreated} /></EvaluationProvider>);
  expect(screen.getByLabelText(/^Ngày đánh giá/)).toHaveValue(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
  fireEvent.change(screen.getByLabelText(/Hạn đánh giá/), { target: { value: "2026-11-20" } });
  fireEvent.click(screen.getByRole("button", { name: "Lấy tất cả nhiệm vụ" }));
  fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
  expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ owner: CURRENT_USER.name, unit: CURRENT_USER.unit, step: "self", employeeId: CURRENT_USER.employeeId, jobTitle: expect.any(String) }));
});
it("blocks incomplete sending and sends complete evaluation with actual sender history", () => {
  const onCreated = vi.fn();
  render(<EvaluationProvider><CreateEvaluationDialog open onOpenChange={vi.fn()} onCreated={onCreated} /></EvaluationProvider>);
  fireEvent.change(screen.getByLabelText(/Hạn đánh giá/), { target: { value: "2026-11-20" } });
  fireEvent.click(screen.getByRole("button", { name: "Lấy tất cả nhiệm vụ" }));
  fireEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
  expect(onCreated).not.toHaveBeenCalled();
  screen.getAllByRole("spinbutton", { name: /^Điểm tự đánh giá nhiệm vụ/ }).forEach((input) => fireEvent.change(input, { target: { value: "4" } }));
  fireEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
  expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ step: "office", history: expect.arrayContaining([expect.objectContaining({ actorName: CURRENT_USER.name, actorId: CURRENT_USER.employeeId })]) }));
});
