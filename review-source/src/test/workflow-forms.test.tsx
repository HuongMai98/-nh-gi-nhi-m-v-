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
    screen.getAllByRole("combobox", { name: /Hội đồng đánh giá mục tiêu/ }).forEach(input => fireEvent.change(input,{target:{value:"5"}}));
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tất đánh giá" }));
    expect(record().step).toBe("council");
    expect(record().councilScore).toBe(5);
    fireEvent.click(screen.getByRole("tab", { name: "Phiếu đánh giá" }));
    expect(screen.getAllByText("5.00")).toHaveLength(2);
    expect(screen.getByRole("columnheader", { name: "QLTT đánh giá (1-5)" })).toBeInTheDocument();
    expect(screen.getAllByLabelText(/^QLTT đánh giá \d/)).toHaveLength(8);
    expect(
      record().criteria.reduce(
        (sum: number, c: { weight: number; council: number }) => sum + c.weight * c.council,
        0,
      ),
    ).toBeCloseTo(5, 10);
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

it("Ki counts display the saved council results without editable summary fields", () => {
  render(<EvaluationProvider><Screen id="DG-2026-Q3-002" /></EvaluationProvider>);
  role("council");
  expect(screen.getByTestId("ki-count-A")).toHaveTextContent("1");
  expect(screen.getByLabelText("Xếp Ki DG-2026-Q3-002").tagName).toBe("SPAN");
  expect(screen.getByTestId("ki-count-B")).toHaveTextContent("0");
  expect(screen.getByTestId("ki-count-K")).toHaveTextContent("0");
});

it("đang trình ký: điểm chỉ đọc, không còn thao tác duyệt của GĐ trong module Đánh giá", () => {
 render(<EvaluationProvider><Screen id="DG-2026-Q3-001" /></EvaluationProvider>); role("ceo");
 expect(screen.getByLabelText("Điểm đánh giá DG-2026-Q3-001")).toBeDisabled();
 expect(screen.queryByRole("button",{name:"Phê duyệt"})).not.toBeInTheDocument();
 expect(screen.queryByRole("button",{name:"Trả lại Hội đồng"})).not.toBeInTheDocument();
 expect(screen.queryByRole("button",{name:"Lưu tất cả"})).not.toBeInTheDocument();
 expect(screen.queryByText("Mở luồng trình ký GĐ")).not.toBeInTheDocument();
});
