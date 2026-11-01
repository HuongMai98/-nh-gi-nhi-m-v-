import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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
    fireEvent.change(screen.getByLabelText("Ghi chú DG-2026-Q3-003"), {
      target: { value: "Kiểm tra hồ sơ" },
    });
    fireEvent.blur(screen.getByLabelText("Điểm CQTT trọng tâm DG-2026-Q3-003"));
    expect(record().proposedKi).toBe("B");
    expect(record().reviewRemark).toBe("Kiểm tra hồ sơ");
    expect(record().councilScore).toBeUndefined();
    expect(record().ki).toBeUndefined();
    expect(record().history.at(-1).after).toContain('"proposedKi":"B"');
  });
  it("lets office edit batch metadata without a row save button", () => {
    render(
      <EvaluationProvider>
        <Probe id="DG-2026-Q3-005" role="office" />
      </EvaluationProvider>,
    );
    fireEvent.click(screen.getByText("Chọn vai trò"));
    expect(screen.getByLabelText("Điểm CQTT trọng tâm DG-2026-Q3-005")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Trợ lý DG-2026-Q3-005"), {
      target: { value: "quyendv" },
    });
    fireEvent.change(screen.getByLabelText("Ghi chú DG-2026-Q3-005"), {
      target: { value: "Cần bổ sung" },
    });
    expect(screen.queryByRole("button", { name: "Lưu dòng" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Trợ lý DG-2026-Q3-005")).toHaveValue("quyendv");
    expect(screen.getByLabelText("Ghi chú DG-2026-Q3-005")).toHaveValue("Cần bổ sung");
    expect(record().cqttKey).toBeUndefined();
    expect(record().step).toBe("office");
  });
});

function BatchProbe() {
  const [hideFirst, setHideFirst] = useState(false);
  const { evaluations, setPreviewRole, addEvaluation } = useEvaluations();
  const scoped = evaluations.filter(
    (e) => e.period === "Quý III/2026" && e.block === "Khối Cơ quan",
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
it("office sends all pending records together and keeps unfinished row metadata", () => {
  render(
    <EvaluationProvider>
      <BatchProbe />
    </EvaluationProvider>,
  );
  fireEvent.click(screen.getByText("Chuẩn bị gửi chung"));
  fireEvent.change(screen.getByLabelText("Trợ lý DG-2026-Q3-005"), {
    target: { value: "quyendv" },
  });
  fireEvent.click(screen.getByText("Lọc hồ sơ khác"));
  fireEvent.click(screen.getByText("Hiển thị tất cả"));
  expect(screen.getByLabelText("Trợ lý DG-2026-Q3-005")).toHaveValue("quyendv");
  fireEvent.change(screen.getByLabelText("Ghi chú DG-2026-Q3-005"), {
    target: { value: "Gửi chung" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Gửi CQTT (2 phiếu)" }));
  const all = JSON.parse(screen.getByTestId("batch-records").textContent ?? "[]");
  expect(all.find((e: { id: string }) => e.id === "DG-2026-Q3-005")).toMatchObject({
    step: "cqtt",
    reviewAssistant: "quyendv",
  });
  expect(all.find((e: { id: string }) => e.id === "BATCH-002").step).toBe("cqtt");
  expect(all.find((e: { id: string }) => e.id === "DG-2026-Q3-002").step).toBe("council");
  expect(screen.getByRole("button", { name: "Gửi CQTT (0 phiếu)" })).toBeDisabled();
  expect(screen.getByText("Đã gửi 2 phiếu đến CQTT rà soát.")).toBeInTheDocument();
});

it("copies personal scores without adjustment and allows switching to manual adjustment", () => {
  render(<EvaluationProvider><Probe id="DG-2026-Q3-003" role="cqtt" /></EvaluationProvider>);
  fireEvent.click(screen.getByText("Chọn vai trò"));
  fireEvent.click(screen.getByRole("button", { name: "Không điều chỉnh DG-2026-Q3-003" }));
  expect(screen.getByLabelText("Điểm CQTT trọng tâm DG-2026-Q3-003")).toHaveValue(0.9);
  expect(screen.getByLabelText("Điểm CQTT chức năng DG-2026-Q3-003")).toHaveValue(2.55);
  expect(screen.getByLabelText("Điểm CQTT trọng tâm DG-2026-Q3-003")).toBeDisabled();
  fireEvent.blur(screen.getByLabelText("Điểm CQTT trọng tâm DG-2026-Q3-003"));
  expect(record().cqttKey).toBe(0.9);
  expect(record().cqttFunction).toBe(2.55);
  fireEvent.click(screen.getByRole("button", { name: "Điều chỉnh DG-2026-Q3-003" }));
  expect(screen.getByLabelText("Điểm CQTT trọng tâm DG-2026-Q3-003")).not.toBeDisabled();
});
