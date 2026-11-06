import { expect, it } from "vitest";
import { EVALUATIONS, responseScoreLimits, cqttTotal, saveDraft, transition, type Evaluation } from "@/lib/evaluation";

const returned = (): Evaluation => {
  let e = structuredClone(EVALUATIONS.find((x) => x.step === "cqtt")!);
  e = saveDraft(e, "cqtt", { cqttKey: 0.8, cqttFunction: 2.5 }, "now");
  return transition(e, "cqtt", "request", { note: "Bổ sung minh chứng" }, "now");
};

it("CQTT gửi điều chỉnh: lưu bản dữ liệu gốc để bảo lưu", () => {
  const e = returned();
  expect(e.step).toBe("response");
  expect(e.responseBaseline).toEqual(e.criteria);
});

it("Tiếp thu: cập nhật toàn bộ dữ liệu và gửi CQTT rà soát, chấm lại", () => {
  const e = returned();
  const limits = responseScoreLimits(e);
  const criteria = e.criteria.map((c, i) => ({ ...c, self: limits[i]!, ...(i === 0 ? { result: "Đã bổ sung" } : {}) }));
  const next = transition(saveDraft(e, "performer", { criteria, response: "Tiếp thu" }, "now"), "performer", "respond", {}, "now");
  expect(next.step).toBe("cqtt");
  expect(next.criteria[0]).toMatchObject({ self: limits[0], result: "Đã bổ sung" });
  expect(next.history?.at(-1)?.action).toBe("Tiếp thu");
});

it("Bảo lưu: bắt buộc lý do, giữ nguyên dữ liệu cá nhân và điểm CQTT, chuyển Tổng hợp báo cáo", () => {
  const e = returned();
  const edited = saveDraft(e, "performer", { criteria: e.criteria.map((c) => ({ ...c, self: 1 })) }, "now");
  expect(() => transition(saveDraft(edited, "performer", { response: "Bảo lưu" }, "now"), "performer", "respond", {}, "now")).toThrow(/lý do bảo lưu/);
  const next = transition(saveDraft(edited, "performer", { response: "Bảo lưu", responseNote: "Đã có hồ sơ" }, "now"), "performer", "respond", {}, "now");
  expect(next.step).toBe("cqtt_report");
  expect(next.criteria).toEqual(e.responseBaseline);
  expect(cqttTotal(next)).toBe(3.3);
  expect(next.history?.at(-1)).toMatchObject({ action: "Bảo lưu", note: "Đã có hồ sơ" });
});
