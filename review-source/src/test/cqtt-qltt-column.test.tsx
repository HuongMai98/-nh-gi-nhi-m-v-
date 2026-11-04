import { EVALUATIONS, saveDraft, cqttGroupsFromTasks, summarizeCqtt, transition, cqttInSummary, cqttSummarizable } from "@/lib/evaluation";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
  createFileRoute: () => (config: unknown) => config,
}));
import { EvaluationProvider } from "@/components/EvaluationProvider";
import { useEvaluations } from "@/components/evaluation-context";
import { EvaluationDetail } from "@/routes/danh-gia.$id";

const cqttRecord = EVALUATIONS.find((e) => e.step === "cqtt")!;
function Screen({ id, onFinished }: { id: string; onFinished?: () => void }) {
  const { evaluations, previewRole } = useEvaluations();
  const e = evaluations.find((x) => x.id === id)!;
  return (
    <>
      <output data-testid="record">{JSON.stringify(e)}</output>
      <EvaluationDetail key={`${e.id}-${e.updated}-${e.step}-${previewRole}-${e.history?.length ?? 0}`} ev={e} onCqttFinished={onFinished} />
    </>
  );
}
const record = () => JSON.parse(screen.getByTestId("record").textContent ?? "{}");

describe("CQTT đánh giá từng công việc", () => {
  it("lưu điểm và nhận xét từng công việc; chấm đủ thì tính điểm nhóm CQTT", () => {
    const e = structuredClone(cqttRecord);
    const scores = e.criteria.map((_, i) => (i % 2 ? 4 : 3));
    const saved = saveDraft(e, "cqtt", { criteria: e.criteria.map((c, i) => ({ ...c, cqtt: scores[i], self: 1, result: "x" })) }, "now");
    expect(saved.criteria.map((c) => c.cqtt)).toEqual(scores);
    expect(saved.criteria[0]!.self).toBe(e.criteria[0]!.self);
    expect(saved.criteria[0]!.result).toBe(e.criteria[0]!.result);
    // Lưu chi tiết chưa đổi điểm Thường trực; Tổng hợp mới lấy điểm nhóm từ chi tiết.
    expect(saved.cqttKey).toBe(e.cqttKey);
    const sum = summarizeCqtt(saved, "cqtt", "now");
    expect({ cqttKey: sum.cqttKey, cqttFunction: sum.cqttFunction }).toEqual(cqttGroupsFromTasks(saved.criteria));
    expect(sum.cqttSummarized).toBe(true);
    expect(sum.history?.at(-1)?.action).toBe("Tổng hợp đánh giá");
    expect(saveDraft(sum, "cqtt", { criteria: sum.criteria.map((c, i) => ({ ...c, cqtt: i ? c.cqtt : 5 })) }, "now").cqttSummarized).toBe(false);
    expect(() => summarizeCqtt({ ...saved, criteria: saved.criteria.map((c, i) => ({ ...c, cqtt: i ? c.cqtt : undefined })) }, "cqtt", "now")).toThrow(/chưa đánh giá đủ/);
    expect(() => summarizeCqtt(saved, "council", "now")).toThrow();
    // Hoàn tất đánh giá khi đủ điểm từng công việc, Tổng hợp sau rồi mới gửi Hội đồng được.
    const fresh = { ...saved, cqttKey: undefined, cqttFunction: undefined };
    const finished = transition(fresh, "cqtt", "finish", {}, "now");
    expect(finished.step).toBe("cqtt_report");
    expect(() => transition(finished, "cqtt", "send", {}, "now")).toThrow(/Chưa tổng hợp/);
    const summed = summarizeCqtt(finished, "cqtt", "now");
    expect(summed.cqttSummarized).toBe(true);
    expect(transition(summed, "cqtt", "send", {}, "now").step).not.toBe("cqtt_report");
    // Gửi điều chỉnh từ màn Tổng hợp cho phiếu đã Hoàn tất đánh giá (cần lý do).
    expect(transition(summed, "cqtt", "request", { note: "Bổ sung minh chứng" }, "now").step).toBe("response");
    expect(() => saveDraft(e, "cqtt", { criteria: e.criteria.map((c) => ({ ...c, cqtt: 6 })) }, "now")).toThrow(/1 đến 5/);
    expect(() => saveDraft(e, "cqtt", { criteria: e.criteria.map((c) => ({ ...c, cqtt: 0.5 })) }, "now")).toThrow(/1 đến 5/);
    expect(saveDraft(e, "cqtt", { criteria: e.criteria.map((c) => ({ ...c, cqtt: 3.75 })) }, "now").criteria[0]!.cqtt).toBe(3.75);
    const partial = saveDraft(e, "cqtt", { criteria: e.criteria.map((c, i) => ({ ...c, cqtt: i ? undefined : 4 })) }, "now");
    expect(partial.cqttKey).toBe(e.cqttKey);
  });

  it("Tổng hợp đánh giá chỉ có dữ liệu sau khi bấm Tổng hợp; hồ sơ cũ đã có điểm nhóm vẫn tổng hợp được", () => {
    const legacy = structuredClone(EVALUATIONS.find((e) => e.step === "cqtt_report" && e.cqttKey !== undefined)!);
    expect(cqttInSummary(legacy)).toBe(false);
    expect(cqttSummarizable(legacy)).toBe(true);
    const sum = summarizeCqtt(legacy, "cqtt", "now");
    expect(cqttInSummary(sum)).toBe(true);
    expect([sum.cqttKey, sum.cqttFunction]).toEqual([legacy.cqttKey, legacy.cqttFunction]);
    expect(cqttInSummary(structuredClone(EVALUATIONS.find((e) => e.step === "council")!))).toBe(true);
  });

  it("Hoàn tất đánh giá lưu luôn điểm QLTT đánh giá (1-5) vừa nhập rồi về danh sách đã hoàn tất", () => {
    const onFinished = vi.fn();
    render(<EvaluationProvider><Screen id={cqttRecord.id} onFinished={onFinished} /></EvaluationProvider>);
    fireEvent.change(screen.getByLabelText("Vai trò xem mẫu"), { target: { value: "cqtt" } });
    cqttRecord.criteria.forEach((_, i) =>
      fireEvent.change(screen.getByLabelText(`QLTT đánh giá mục tiêu ${i + 1}`), { target: { value: "3.5" } }));
    expect(screen.queryByRole("button", { name: /Gửi điều chỉnh CQ/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tất đánh giá" }));
    const r = record();
    expect(r.step).toBe("cqtt_report");
    expect(r.criteria.every((c: { cqtt: number }) => c.cqtt === 3.5)).toBe(true);
    expect(onFinished).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("tab", { name: "Phiếu đánh giá" }));
    expect(screen.getByRole("columnheader", { name: "QLTT đánh giá (1-5)" })).toBeInTheDocument();
  });

  it("Lưu xong điểm QLTT chỉ đọc; Chỉnh sửa để sửa tiếp rồi Hoàn tất đánh giá", () => {
    render(<EvaluationProvider><Screen id={cqttRecord.id} /></EvaluationProvider>);
    fireEvent.change(screen.getByLabelText("Vai trò xem mẫu"), { target: { value: "cqtt" } });
    expect(screen.queryByRole("button", { name: "Chỉnh sửa" })).toBeNull();
    cqttRecord.criteria.forEach((_, i) =>
      fireEvent.change(screen.getByLabelText(`QLTT đánh giá mục tiêu ${i + 1}`), { target: { value: "3" } }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(screen.queryByLabelText("QLTT đánh giá mục tiêu 1")).toBeNull();
    expect(screen.queryByRole("button", { name: "Lưu" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    fireEvent.change(screen.getByLabelText("QLTT đánh giá mục tiêu 1"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(record().criteria[0].cqtt).toBe(5);
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tất đánh giá" }));
    expect(record().step).toBe("cqtt_report");
  });

  it("Sao chép điểm CBNV tự đánh giá sang cột QLTT đánh giá (1-5)", () => {
    render(<EvaluationProvider><Screen id={cqttRecord.id} /></EvaluationProvider>);
    fireEvent.change(screen.getByLabelText("Vai trò xem mẫu"), { target: { value: "cqtt" } });
    fireEvent.click(screen.getByRole("button", { name: "Sao chép điểm CBNV tự đánh giá" }));
    cqttRecord.criteria.forEach((c, i) =>
      expect(screen.getByLabelText(`QLTT đánh giá mục tiêu ${i + 1}`)).toHaveValue(c.self || null));
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(record().criteria.map((c: { cqtt?: number }) => c.cqtt)).toEqual(cqttRecord.criteria.map((c) => c.self || undefined));
  });

  it("form Phiếu đánh giá: CQTT chấm cột QLTT đánh giá từng công việc rồi lưu", () => {
    render(<EvaluationProvider><Screen id={cqttRecord.id} /></EvaluationProvider>);
    fireEvent.change(screen.getByLabelText("Vai trò xem mẫu"), { target: { value: "cqtt" } });
    expect(screen.getByRole("tab", { name: "Phiếu đánh giá" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "CQTT đánh giá" })).toBeNull();
    cqttRecord.criteria.forEach((_, i) =>
      fireEvent.change(screen.getByLabelText(`QLTT đánh giá mục tiêu ${i + 1}`), { target: { value: "4" } }));
    expect(screen.getByTestId("qltt-total")).toHaveTextContent("4.00");
    expect(screen.getByTestId("qltt-rating")).toHaveTextContent("Vượt yêu cầu");
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    const r = record();
    expect(r.criteria.every((c: { cqtt: number }) => c.cqtt === 4)).toBe(true);
    expect(r.cqttKey).toBe(cqttRecord.cqttKey);
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tất đánh giá" }));
    // Hoàn tất đánh giá: chuyển chờ báo cáo, chưa tổng hợp điểm Thường trực.
    const done = record();
    expect(done.step).toBe("cqtt_report");
    expect(done.criteria.every((c: { cqtt: number }) => c.cqtt === 4)).toBe(true);
    expect(done.cqttSummarized).toBeFalsy();
  });
});


describe("Chờ CQ/CQĐV phản hồi: QLTT đánh giá (1-5) lấy điểm CQTT từng công việc", () => {
  it("màn chi tiết của CQĐV/CQ hiển thị đúng điểm CQTT đã chấm", () => {
    function Seed() {
      const { updateEvaluation, setPreviewRole } = useEvaluations();
      return <>
        <button onClick={() => setPreviewRole("cqtt")}>cqtt</button>
        <button onClick={() => updateEvaluation(cqttRecord.id, { criteria: cqttRecord.criteria.map((c, i) => ({ ...c, cqtt: i % 2 ? 4 : 3.5 })) })}>score</button>
        <button onClick={() => updateEvaluation(cqttRecord.id, { note: "Bổ sung minh chứng", cqttKey: 1, cqttFunction: 2.9 }, "request")}>request</button>
        <button onClick={() => setPreviewRole("performer")}>performer</button>
      </>;
    }
    render(<EvaluationProvider><Seed /><Screen id={cqttRecord.id} /></EvaluationProvider>);
    ["cqtt", "score", "request", "performer"].forEach((t) => fireEvent.click(screen.getByText(t)));
    expect(record().step).toBe("response");
    fireEvent.click(screen.getByRole("tab", { name: "Phiếu đánh giá" }));
    expect(screen.getByRole("columnheader", { name: "QLTT đánh giá (1-5)" })).toBeInTheDocument();
    expect(screen.getByLabelText("QLTT đánh giá 1")).toHaveTextContent("3.5");
    expect(screen.getByLabelText("QLTT đánh giá 2")).toHaveTextContent("4");
  });
});
