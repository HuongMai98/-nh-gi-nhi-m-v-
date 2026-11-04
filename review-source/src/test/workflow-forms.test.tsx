import { EVALUATIONS } from "@/lib/evaluation";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
const role = (value: string) => {
  fireEvent.change(screen.getByLabelText("Vai trò xem mẫu"), { target: { value } });
  if (value === "council") fireEvent.click(screen.getByRole("tab", { name: "Tổng hợp KPI" }));
};
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
    expect(screen.getByLabelText("Điểm đánh giá DG-2026-Q3-002")).toHaveValue(4.5);
    fireEvent.change(screen.getByLabelText("Điểm đánh giá DG-2026-Q3-002"), { target: { value: "3.8" } });
    expect(screen.getByLabelText("Xếp Ki DG-2026-Q3-002")).toHaveValue("A");
    fireEvent.change(screen.getByLabelText("Điểm đánh giá DG-2026-Q3-002"), { target: { value: "4.8" } });
    fireEvent.click(screen.getByRole("button", { name: "Trình TGĐ" }));
    expect(record().step).toBe("ceo");
    expect(record().councilScore).toBe(4.8);
    fireEvent.click(screen.getByRole("tab", { name: "Phiếu đánh giá" }));
    expect(screen.getAllByText("4.80")).toHaveLength(2);
    expect(screen.getByRole("columnheader", { name: "Hội đồng đánh giá (1-5)" })).toBeInTheDocument();
    expect(screen.getAllByLabelText(/^QLTT đánh giá \d/)).toHaveLength(8);
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
  expect(screen.queryByRole("button", { name: "Lưu" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Gửi đánh giá" })).toBeInTheDocument();
  expect(screen.getByLabelText("Kết quả thực hiện mục tiêu 1")).toHaveAttribute("readonly");
  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
  expect(onEdit).toHaveBeenCalledOnce();
});

it("saves council edits using the save-all action", () => {
  render(<EvaluationProvider><Screen id="DG-2026-Q3-002" /></EvaluationProvider>);
  role("council");
  fireEvent.change(screen.getByLabelText("Xếp Ki DG-2026-Q3-002"), { target: { value: "B" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu tất cả" }));
  expect(record().councilScore).toBe(2.5);
  expect(record().ki).toBe("B");
  expect(record().councilReviewed).toBe(true);
});

it("saves pending council edits and sends them to the CEO", () => {
  render(<EvaluationProvider><Screen id="DG-2026-Q3-002" /></EvaluationProvider>);
  role("council");
  fireEvent.change(screen.getByLabelText("Điểm đánh giá DG-2026-Q3-002"), { target: { value: "4.6" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi TGĐ" }));
  expect(record().step).toBe("ceo");
  expect(record().councilScore).toBe(4.6);
  expect(record().ki).toBe("A+");
});
it("updates Ki counts from unsaved council edits", () => {
  render(<EvaluationProvider><Screen id="DG-2026-Q3-002" /></EvaluationProvider>);
  role("council");
  expect(screen.getByTestId("ki-count-A")).toHaveTextContent("1");
  fireEvent.change(screen.getByLabelText("Điểm đánh giá DG-2026-Q3-002"), { target: { value: "3" } });
  expect(screen.getByTestId("ki-count-A")).toHaveTextContent("0");
  expect(screen.getByTestId("ki-count-B")).toHaveTextContent("1");
  fireEvent.change(screen.getByLabelText("Xếp Ki DG-2026-Q3-002"), { target: { value: "K" } });
  expect(screen.getByTestId("ki-count-B")).toHaveTextContent("0");
  expect(screen.getByTestId("ki-count-K")).toHaveTextContent("1");
});
it("lets CEO adjust totals directly or return to council with a required reason", () => {
  render(<EvaluationProvider><Screen id="DG-2026-Q3-001" /></EvaluationProvider>);
  role("ceo");
  expect(screen.getByLabelText("Điểm đánh giá DG-2026-Q3-001")).toBeEnabled();
  fireEvent.click(within(screen.getByRole("region", { name: "Tổng hợp KPI — BM01" })).getByRole("button", { name: "Yêu cầu Hội đồng điều chỉnh" }));
  expect(screen.getByRole("button", { name: "Gửi điều chỉnh" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Yêu cầu điều chỉnh của TGĐ"), { target: { value: "Rà soát căn cứ xếp Ki" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi điều chỉnh" }));
  expect(record().step).toBe("council_adjust");
  expect(record().note).toBe("Rà soát căn cứ xếp Ki");
});
it("lets CEO save all direct adjustments without approving", () => {
  render(<EvaluationProvider><Screen id="DG-2026-Q3-001" /></EvaluationProvider>);
  role("ceo");
  const region = within(screen.getByRole("region", { name: "Tổng hợp KPI — BM01" }));
  fireEvent.click(region.getByRole("button", { name: "Lưu tất cả" }));
  expect(screen.getByText("Chưa có thay đổi để lưu.")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Điểm đánh giá DG-2026-Q3-001"), { target: { value: "4.3" } });
  fireEvent.click(region.getByRole("button", { name: "Lưu tất cả" }));
  expect(record().step).toBe("ceo");
  expect(record().councilScore).toBe(4.3);
  expect(record().ceoAdjusted).toBe(true);
});
it("lets CEO approve the council results from the summary", () => {
  render(<EvaluationProvider><Screen id="DG-2026-Q3-001" /></EvaluationProvider>);
  role("ceo");
  fireEvent.click(within(screen.getByRole("region", { name: "Tổng hợp KPI — BM01" })).getByRole("button", { name: "Phê duyệt" }));
  expect(record().step).toBe("approved");
  expect(record().approvedScore).toBe(4.1);
});
