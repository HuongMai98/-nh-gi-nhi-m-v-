import { EVALUATIONS } from "@/lib/evaluation";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
  createFileRoute: () => (config: unknown) => config,
}));
import { EvaluationProvider } from "@/components/EvaluationProvider";
import { useEvaluations } from "@/components/evaluation-context";
import { EvaluationDetail } from "@/routes/danh-gia.$id";
function Screen({ id }: { id: string }) {
  const { evaluations, previewRole } = useEvaluations();
  const e = evaluations.find((e) => e.id === id)!;
  return (
    <>
      <output data-testid="record">{JSON.stringify(e)}</output>
      <EvaluationDetail key={`${e.id}-${e.updated}-${e.step}-${previewRole}`} ev={e} />
    </>
  );
}
const record = () => JSON.parse(screen.getByTestId("record").textContent ?? "{}");
const role = (value: string) =>
  fireEvent.change(screen.getByLabelText("Vai trò xem mẫu"), { target: { value } });
describe("workflow forms", () => {
  it("submits the edited council total and auto-fills the personal template with automatically allocated task scores", () => {
    render(
      <EvaluationProvider>
        <Screen id="DG-2026-Q3-002" />
      </EvaluationProvider>,
    );
    role("council");
    fireEvent.change(screen.getByLabelText("Điểm đánh giá DG-2026-Q3-002"), {
      target: { value: "4.8" },
    });
    fireEvent.change(screen.getByLabelText("Xếp Ki DG-2026-Q3-002"), { target: { value: "A+" } });
    fireEvent.click(screen.getByRole("button", { name: "Trình TGĐ" }));
    expect(record().step).toBe("ceo");
    expect(record().councilScore).toBe(4.8);
    fireEvent.click(screen.getByRole("tab", { name: "Template cá nhân" }));
    expect(screen.getAllByText("4.80")).toHaveLength(2);
    expect(screen.getByText("QLTT đánh giá (tự phân bổ)")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/^Điểm phân bổ mục tiêu/)).toHaveLength(8);
    expect(
      record().criteria.reduce(
        (sum: number, c: { weight: number; council: number }) => sum + c.weight * c.council,
        0,
      ),
    ).toBeCloseTo(4.8, 10);
  });
  it("office detail directs to batch summary without individual handoff", () => {
    render(
      <EvaluationProvider>
        <Screen id="DG-2026-Q3-005" />
      </EvaluationProvider>,
    );
    role("office");
    expect(
      screen.queryByRole("button", { name: "Gửi lại CQĐV/CQ điều chỉnh" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Lý do điều chỉnh")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gửi CQTT rà soát" })).not.toBeInTheDocument();
    expect(screen.getByText(/Gửi chung các phiếu đang tổng hợp/)).toBeInTheDocument();
    expect(record().step).toBe("office");
    expect(screen.queryByRole("option", { name: "QLTT" })).not.toBeInTheDocument();
  });
});

it("view mode locks evaluation fields and exposes the explicit edit action", () => {
  const onEdit = vi.fn();
  const e = { ...EVALUATIONS[3]!, step: "self" as const };
  render(<EvaluationProvider><EvaluationDetail ev={e} readOnly onEdit={onEdit} /></EvaluationProvider>);
  expect(screen.queryByRole("button", { name: "Lưu nháp" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Gửi đánh giá" })).toBeInTheDocument();
  expect(screen.getByLabelText("Kết quả thực hiện mục tiêu 1")).toHaveAttribute("readonly");
  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa đánh giá" }));
  expect(onEdit).toHaveBeenCalledOnce();
});
