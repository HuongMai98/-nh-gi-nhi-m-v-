import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
import { AggregateForm } from "@/components/AggregateForm";
import { EvaluationProvider } from "@/components/EvaluationProvider";
import { useEvaluations } from "@/components/evaluation-context";

function Probe() {
  const { evaluations, setPreviewRole } = useEvaluations();
  const e = evaluations.find((e) => e.id === "DG-2026-Q3-002")!;
  return (
    <>
      <button onClick={() => setPreviewRole("council")}>Chọn vai trò</button>
      <output data-testid="reviewed">{String(!!e.councilReviewed)}</output>
      <AggregateForm mode="ki" evaluations={[e]} />
    </>
  );
}

it("Hội đồng bấm Lưu một dòng chỉ lưu nháp, chưa hoàn tất đánh giá", () => {
  render(<EvaluationProvider><Probe /></EvaluationProvider>);
  fireEvent.click(screen.getByText("Chọn vai trò"));
  expect(screen.getByTestId("reviewed").textContent).toBe("false");
  expect(screen.getByText(/Hội đồng đã chấm/).textContent).toContain("0/1");
  fireEvent.click(screen.getByRole("button", { name: "Lưu DG-2026-Q3-002" }));
  expect(screen.getByTestId("reviewed").textContent).toBe("false");
  expect(screen.getByText(/Hội đồng đã chấm/).textContent).toContain("0/1");
});

function CeoProbe() {
  const { evaluations, setPreviewRole } = useEvaluations();
  const e = evaluations.find((e) => e.step === "ceo")!;
  return (
    <>
      <button onClick={() => setPreviewRole("ceo")}>TGĐ</button>
      <AggregateForm mode="ki" evaluations={[e]} />
    </>
  );
}

it("TGĐ không thấy cột Điểm CQTT và nút sao chép", () => {
  render(<EvaluationProvider><CeoProbe /></EvaluationProvider>);
  fireEvent.click(screen.getByText("TGĐ"));
  expect(screen.queryByRole("columnheader", { name: "Điểm CQTT" })).not.toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Điểm đánh giá" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Sao chép điểm CQTT/ })).not.toBeInTheDocument();
});
