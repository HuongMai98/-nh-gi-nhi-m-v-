import { EVALUATIONS, saveDraft } from "@/lib/evaluation";
import { defaultWorkflow, setWorkflows } from "@/lib/workflow";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
  createFileRoute: () => (config: unknown) => config,
}));
import { EvaluationProvider } from "@/components/EvaluationProvider";
import { useEvaluations } from "@/components/evaluation-context";
import { EvaluationDetail } from "@/routes/danh-gia.$id";

afterEach(() => setWorkflows([defaultWorkflow("Khối Cơ quan"), defaultWorkflow("Khối Đơn vị")]));
const cqttRecord = EVALUATIONS.find((e) => e.step === "cqtt")!;
function Screen({ id }: { id: string }) {
  const { evaluations, previewRole } = useEvaluations();
  const e = evaluations.find((x) => x.id === id)!;
  return (
    <>
      <output data-testid="record">{JSON.stringify(e)}</output>
      <EvaluationDetail key={`${e.id}-${e.updated}-${e.step}-${previewRole}-${e.history?.length ?? 0}`} ev={e} />
    </>
  );
}

describe("Đánh giá tuân thủ: CQTT, Hội đồng, TGĐ", () => {
  it("CQTT, Hội đồng và TGĐ đều lưu được đánh giá tuân thủ ở bước của mình", () => {
    const cqtt = saveDraft(structuredClone(cqttRecord), "cqtt", { laborCompliance: "Vi phạm nhưng chưa đến mức bị xử lý kỷ luật" }, "now");
    expect(cqtt.laborCompliance).toBe("Vi phạm nhưng chưa đến mức bị xử lý kỷ luật");
    const council = structuredClone(EVALUATIONS.find((e) => e.step === "council")!);
    expect(saveDraft(council, "council", { cultureCompliance: "Không tuân thủ" }, "now").cultureCompliance).toBe("Không tuân thủ");
    const ceo = structuredClone(EVALUATIONS.find((e) => e.step === "ceo")!);
    const c = defaultWorkflow(ceo.block);
    c.branches.ceoDirectAdjust = false;
    setWorkflows([c]);
    const saved = saveDraft(ceo, "ceo", { cultureCompliance: "Tuân thủ" }, "now");
    expect(saved.cultureCompliance).toBe("Tuân thủ");
    expect(saved.ceoAdjusted).toBeFalsy();
    expect(() => saveDraft(ceo, "ceo", { councilScore: 4.2 }, "now")).toThrow();
  });

  it("màn chi tiết: CQTT chọn tuân thủ rồi Lưu nháp", () => {
    render(<EvaluationProvider><Screen id={cqttRecord.id} /></EvaluationProvider>);
    fireEvent.change(screen.getByLabelText("Vai trò xem mẫu"), { target: { value: "cqtt" } });
    fireEvent.change(screen.getByLabelText("Nội quy lao động"), { target: { value: "Vi phạm nhưng chưa đến mức bị xử lý kỷ luật" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(JSON.parse(screen.getByTestId("record").textContent!).laborCompliance).toBe("Vi phạm nhưng chưa đến mức bị xử lý kỷ luật");
  });
});
