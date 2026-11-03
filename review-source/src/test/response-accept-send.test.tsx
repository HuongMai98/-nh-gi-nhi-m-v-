import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CreateEvaluationDialog } from "@/components/CreateEvaluationDialog";
import { EvaluationProvider } from "@/components/EvaluationProvider";
import { EVALUATIONS } from "@/lib/evaluation";

it("Chờ CQ/CQĐV phản hồi: Tiếp thu chỉ lưu, Gửi CQTT mới gửi đi", () => {
  const existing = EVALUATIONS.find((e) => e.step === "response" && e.id === "DG-2026-Q3-009")!;
  const onCreated = vi.fn();
  render(<EvaluationProvider><CreateEvaluationDialog existing={existing} open onOpenChange={vi.fn()} onCreated={onCreated} /></EvaluationProvider>);
  const send = screen.getByRole("button", { name: "Gửi CQTT" });
  expect(send).toBeDisabled();
  expect(screen.queryByRole("button", { name: /Tiếp thu & gửi CQTT/ })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Tiếp thu" }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Đã tiếp thu");
  expect(onCreated).not.toHaveBeenCalled();
  expect(send).toBeEnabled();

  fireEvent.click(send);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(onCreated).toHaveBeenCalled();
});
