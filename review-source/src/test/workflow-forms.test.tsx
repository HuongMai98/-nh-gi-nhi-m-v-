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
  it("council edits task scores in the detail and the aggregate total remains read-only", () => {
    render(
      <EvaluationProvider>
        <Screen id="DG-2026-Q3-002" />
      </EvaluationProvider>,
    );
    role("council");
    expect(screen.getByLabelText("Điểm đánh giá DG-2026-Q3-002")).toHaveTextContent("4.10");
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Phiếu đánh giá" }));
    screen.getAllByRole("spinbutton", { name: /Hội đồng đánh giá mục tiêu/ }).forEach(input => fireEvent.change(input,{target:{value:"4.8"}}));
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tất đánh giá" }));
    expect(record().step).toBe("council");
    expect(record().councilScore).toBe(4.8);
    fireEvent.click(screen.getByRole("tab", { name: "Phiếu đánh giá" }));
    expect(screen.getAllByText("4.80")).toHaveLength(2);
    expect(screen.getByRole("columnheader", { name: "QLTT đánh giá (1-5)" })).toBeInTheDocument();
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

it("sends the saved council summary to the CEO without changing its assessment", () => {
  render(<EvaluationProvider><Screen id="DG-2026-Q3-002" /></EvaluationProvider>);
  role("council");
  const before=record();
  fireEvent.click(screen.getByRole("button", { name: "Gửi TGĐ" }));
  expect(record().step).toBe("ceo");
  expect(record().councilScore).toBe(4.1);
  expect(record().ki).toBe("A");
  expect(record().criteria).toEqual(before.criteria);
  expect(record().locationCompliance).toBe(before.locationCompliance);
  expect(record().laborCompliance).toBe(before.laborCompliance);
});
it("Ki counts display the saved council results without editable summary fields", () => {
  render(<EvaluationProvider><Screen id="DG-2026-Q3-002" /></EvaluationProvider>);
  role("council");
  expect(screen.getByTestId("ki-count-A")).toHaveTextContent("1");
  expect(screen.getByLabelText("Xếp Ki DG-2026-Q3-002").tagName).toBe("SPAN");
  expect(screen.getByTestId("ki-count-B")).toHaveTextContent("0");
  expect(screen.getByTestId("ki-count-K")).toHaveTextContent("0");
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
