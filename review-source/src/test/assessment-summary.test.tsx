import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
import { AggregateForm } from "@/components/AggregateForm";
import { EvaluationProvider } from "@/components/EvaluationProvider";
import { useEvaluations } from "@/components/evaluation-context";
import type { PreviewRole } from "@/lib/evaluation";
function Probe({ id, role }: { id: string; role: PreviewRole }) {
  const { evaluations, setPreviewRole } = useEvaluations();
  const e = evaluations.find((e) => e.id === id)!;
  return (
    <>
      <button onClick={() => setPreviewRole(role)}>Chọn vai trò</button>
      <output data-testid="record">{JSON.stringify(e)}</output>
      <AggregateForm mode="kpi" evaluations={[e]} />
    </>
  );
}
const record = () => JSON.parse(screen.getByTestId("record").textContent ?? "{}");
describe("assessment summary template", () => {
  it("groups self and standing-office scores and saves CQTT proposal separately from council", () => {
    render(
      <EvaluationProvider>
        <Probe id="DG-2026-Q3-003" role="cqtt" />
      </EvaluationProvider>,
    );
    fireEvent.click(screen.getByText("Chọn vai trò"));
    expect(screen.getByLabelText("Điểm CQTT trọng tâm DG-2026-Q3-003")).toHaveValue(null);
    expect(screen.getByLabelText("Điểm CQTT chức năng DG-2026-Q3-003")).toHaveValue(null);
    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa DG-2026-Q3-003" }));
    expect(screen.getByRole("columnheader", { name: "Điểm CQ tự đánh giá" })).toHaveAttribute(
      "colspan",
      "3",
    );
    expect(screen.getByRole("columnheader", { name: "Thường trực đánh giá" })).toHaveAttribute(
      "colspan",
      "3",
    );
    fireEvent.change(screen.getByLabelText("Đề xuất xếp hạng Ki DG-2026-Q3-003"), {
      target: { value: "B" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu DG-2026-Q3-003" }));
    expect(record().proposedKi).toBe("B");
    expect(record().councilScore).toBeUndefined();
    expect(record().ki).toBeUndefined();
    expect(record().history.at(-1).after).toContain('"proposedKi":"B"');
  });
});

function BatchProbe() {
  const [hideFirst, setHideFirst] = useState(false);
  const { evaluations, setPreviewRole, addEvaluation } = useEvaluations();
  const scoped = evaluations.filter(
    (e) => ["DG-2026-Q3-005", "BATCH-002", "DG-2026-Q3-002"].includes(e.id),
  );
  return (
    <>
      <button
        onClick={() => {
          setPreviewRole("office");
          addEvaluation({
            ...evaluations.find((e) => e.id === "DG-2026-Q3-005")!,
            id: "BATCH-002",
          });
        }}
      >
        Chuẩn bị gửi chung
      </button>
      <output data-testid="batch-records">{JSON.stringify(evaluations)}</output>
      <button onClick={() => setHideFirst(true)}>Lọc hồ sơ khác</button>
      <button onClick={() => setHideFirst(false)}>Hiển thị tất cả</button>
      <AggregateForm
        mode="kpi"
        evaluations={hideFirst ? scoped.filter((e) => e.id !== "DG-2026-Q3-005") : scoped}
        batchCandidates={scoped}
      />
    </>
  );
}
it("office sends all pending records together", () => {
  render(
    <EvaluationProvider>
      <BatchProbe />
    </EvaluationProvider>,
  );
  fireEvent.click(screen.getByText("Chuẩn bị gửi chung"));
  fireEvent.click(screen.getByText("Lọc hồ sơ khác"));
  fireEvent.click(screen.getByText("Hiển thị tất cả"));
  fireEvent.click(screen.getByRole("button", { name: "Gửi CQTT" }));
  const all = JSON.parse(screen.getByTestId("batch-records").textContent ?? "[]");
  expect(all.find((e: { id: string }) => e.id === "DG-2026-Q3-005")).toMatchObject({
    step: "cqtt",
  });
  expect(all.find((e: { id: string }) => e.id === "BATCH-002").step).toBe("cqtt");
  expect(all.find((e: { id: string }) => e.id === "DG-2026-Q3-002").step).toBe("council");
  expect(screen.getByRole("button", { name: "Gửi CQTT" })).toBeDisabled();
  expect(screen.getByText("Đã gửi 2 phiếu đến CQTT rà soát.")).toBeInTheDocument();
});

it("saves and requests adjustment from the table toolbar", () => {
  render(<EvaluationProvider><Probe id="DG-2026-Q3-003" role="cqtt" /></EvaluationProvider>);
  fireEvent.click(screen.getByText("Chọn vai trò"));
  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa DG-2026-Q3-003" }));
  fireEvent.change(screen.getByLabelText("Điểm CQTT trọng tâm DG-2026-Q3-003"), { target: { value: "0.9" } });
  fireEvent.change(screen.getByLabelText("Điểm CQTT chức năng DG-2026-Q3-003"), { target: { value: "2.55" } });
  fireEvent.change(screen.getByLabelText("Góp ý CQTT DG-2026-Q3-003"), { target: { value: "Bổ sung kết quả" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu tất cả" }));
  expect(record().cqttKey).toBe(0.9);
  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa DG-2026-Q3-003" }));
  fireEvent.change(screen.getByLabelText("Điểm CQTT chức năng DG-2026-Q3-003"), { target: { value: "2.7" } });
  fireEvent.click(screen.getByLabelText("Chọn gửi điều chỉnh DG-2026-Q3-003"));
  fireEvent.click(screen.getByRole("button", { name: "Gửi điều chỉnh (1)" }));
  // Đã nhập lý do ở cột Lý do → gửi luôn, lịch sử ghi đích danh cá nhân nhận điều chỉnh.
  expect(screen.queryByRole("dialog")).toBeNull();
  const r = record();
  expect(r.step).toBe("response");
  expect(r.note).toBe("Bổ sung kết quả");
  expect(r.history.at(-1).action).toBe("Gửi điều chỉnh cho CQĐV/CQ");
  expect(r.history.at(-1).note).toContain(r.owner);
});

it("enables row adjustment request only when CQTT total differs from self total", () => {
  render(<EvaluationProvider><Probe id="DG-2026-Q3-003" role="cqtt" /></EvaluationProvider>);
  fireEvent.click(screen.getByText("Chọn vai trò"));
  const menu = screen.getByRole("button", { name: "Thao tác gửi DG-2026-Q3-003" });
  fireEvent.click(menu);
  let send = screen.getByRole("button", { name: "Gửi điều chỉnh DG-2026-Q3-003" });
  expect(send).toBeDisabled();
  fireEvent.click(menu);
  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa DG-2026-Q3-003" }));
  fireEvent.change(screen.getByLabelText("Điểm CQTT trọng tâm DG-2026-Q3-003"), { target: { value: "0.9" } });
  fireEvent.change(screen.getByLabelText("Điểm CQTT chức năng DG-2026-Q3-003"), { target: { value: "2.55" } });
  fireEvent.click(menu);
  send = screen.getByRole("button", { name: "Gửi điều chỉnh DG-2026-Q3-003" });
  expect(send).toBeDisabled();
  fireEvent.click(menu);
  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa DG-2026-Q3-003" }));
  fireEvent.change(screen.getByLabelText("Điểm CQTT chức năng DG-2026-Q3-003"), { target: { value: "2.8" } });
  fireEvent.click(menu);
  send = screen.getByRole("button", { name: "Gửi điều chỉnh DG-2026-Q3-003" });
  expect(send).toHaveAttribute("title", "Gửi điều chỉnh");
  expect(send).not.toBeDisabled();
  fireEvent.click(send);
  // Chưa có lý do → hộp nhập lý do (bắt buộc); lý do được lưu vào trường Lý do.
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent("DG-2026-Q3-003");
  fireEvent.click(within(dialog).getByRole("button", { name: "Gửi điều chỉnh" }));
  expect(within(dialog).getByRole("alert")).toHaveTextContent("lý do");
  fireEvent.change(within(dialog).getByLabelText("Lý do điều chỉnh"), { target: { value: "Bổ sung minh chứng" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Gửi điều chỉnh" }));
  expect(record().step).toBe("response");
  expect(record().note).toBe("Bổ sung minh chứng");
});

it("Gửi điều chỉnh trên thanh công cụ bắt buộc có Lý do ở danh sách, không mở hộp nhập", () => {
  render(<EvaluationProvider><Probe id="DG-2026-Q3-003" role="cqtt" /></EvaluationProvider>);
  fireEvent.click(screen.getByText("Chọn vai trò"));
  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa DG-2026-Q3-003" }));
  fireEvent.change(screen.getByLabelText("Điểm CQTT trọng tâm DG-2026-Q3-003"), { target: { value: "0.9" } });
  fireEvent.change(screen.getByLabelText("Điểm CQTT chức năng DG-2026-Q3-003"), { target: { value: "2.55" } });
  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa DG-2026-Q3-003" }));
  fireEvent.change(screen.getByLabelText("Điểm CQTT chức năng DG-2026-Q3-003"), { target: { value: "2.7" } });
  fireEvent.click(screen.getByLabelText("Chọn gửi điều chỉnh DG-2026-Q3-003"));
  fireEvent.click(screen.getByRole("button", { name: "Gửi điều chỉnh (1)" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByText("Bắt buộc nhập lý do điều chỉnh")).toBeInTheDocument();
  expect(screen.getByLabelText("Góp ý CQTT DG-2026-Q3-003")).toHaveAttribute("aria-invalid", "true");
  expect(record().step).toBe("cqtt");
  fireEvent.change(screen.getByLabelText("Góp ý CQTT DG-2026-Q3-003"), { target: { value: "Giải trình chênh lệch" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi điều chỉnh (1)" }));
  expect(record().step).toBe("response");
  expect(record().note).toBe("Giải trình chênh lệch");
});

it("CQTT lưu Lý do trước khi gửi điều chỉnh và bấm Chỉnh sửa để sửa lại", () => {
  render(<EvaluationProvider><Probe id="DG-2026-Q3-018" role="cqtt" /></EvaluationProvider>);
  fireEvent.click(screen.getByText("Chọn vai trò"));
  expect(record().step).toBe("cqtt_report");
  fireEvent.change(screen.getByLabelText("Góp ý CQTT DG-2026-Q3-018"), { target: { value: "Bổ sung minh chứng" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu DG-2026-Q3-018" }));
  expect(record().note).toBe("Bổ sung minh chứng");
  expect(record().step).toBe("cqtt_report");
  // Đã lưu: chỉ đọc, có nút Chỉnh sửa.
  expect(screen.queryByLabelText("Góp ý CQTT DG-2026-Q3-018")).toBeNull();
  expect(screen.getByTestId("ly-do-DG-2026-Q3-018")).toHaveTextContent("Bổ sung minh chứng");
  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa DG-2026-Q3-018" }));
  fireEvent.change(screen.getByLabelText("Góp ý CQTT DG-2026-Q3-018"), { target: { value: "Bổ sung minh chứng KPI B.I" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu tất cả" }));
  expect(record().note).toBe("Bổ sung minh chứng KPI B.I");
  expect(screen.getByTestId("ly-do-DG-2026-Q3-018")).toHaveTextContent("Bổ sung minh chứng KPI B.I");
});

it("Chỉnh sửa tất cả mở lại Lý do đã lưu; Lưu tất cả khoá lại", () => {
  render(<EvaluationProvider><Probe id="DG-2026-Q3-018" role="cqtt" /></EvaluationProvider>);
  fireEvent.click(screen.getByText("Chọn vai trò"));
  fireEvent.change(screen.getByLabelText("Góp ý CQTT DG-2026-Q3-018"), { target: { value: "Lý do A" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu tất cả" }));
  expect(screen.queryByLabelText("Góp ý CQTT DG-2026-Q3-018")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa tất cả" }));
  fireEvent.change(screen.getByLabelText("Góp ý CQTT DG-2026-Q3-018"), { target: { value: "Lý do B" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu tất cả" }));
  expect(record().note).toBe("Lý do B");
  expect(screen.queryByLabelText("Góp ý CQTT DG-2026-Q3-018")).toBeNull();
});
