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

it("Hội đồng bấm Lưu một dòng (giữ nguyên giá trị điền sẵn) là đã chấm", () => {
  render(<EvaluationProvider><Probe /></EvaluationProvider>);
  fireEvent.click(screen.getByText("Chọn vai trò"));
  expect(screen.getByTestId("reviewed").textContent).toBe("false");
  expect(screen.getByText(/Hội đồng đã chấm/).textContent).toContain("0/1");
  fireEvent.click(screen.getByRole("button", { name: "Lưu DG-2026-Q3-002" }));
  expect(screen.getByTestId("reviewed").textContent).toBe("true");
  expect(screen.getByText(/Hội đồng đã chấm/).textContent).toContain("1/1");
});

function SummaryProbe() {
  const { evaluations, setPreviewRole, createCouncilSummary } = useEvaluations();
  const e = evaluations.find((e) => e.id === "DG-2026-Q3-002")!;
  return (
    <>
      <button onClick={() => setPreviewRole("council")}>Chọn vai trò</button>
      <button onClick={() => createCouncilSummary([e.id])}>Tổng hợp</button>
      <AggregateForm mode="ki" evaluations={[e]} />
    </>
  );
}

it("Tổng hợp KI để trống Điểm đánh giá; nút Sao chép điền Điểm CQTT", () => {
  render(<EvaluationProvider><SummaryProbe /></EvaluationProvider>);
  fireEvent.click(screen.getByText("Chọn vai trò"));
  fireEvent.click(screen.getByText("Tổng hợp"));
  const score = screen.getByRole("spinbutton", { name: "Điểm đánh giá DG-2026-Q3-002" }) as HTMLInputElement;
  expect(score.value).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Sao chép điểm CQTT DG-2026-Q3-002" }));
  expect(score.value).toBe("4.1");
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
