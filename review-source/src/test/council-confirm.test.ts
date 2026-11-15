import { afterEach, expect, it } from "vitest";
import { EVALUATIONS, confirmCouncilSummary, councilConfirmState, needsCouncilConfirm, requestCouncilAdjust, saveDraft, transition, type Evaluation } from "@/lib/evaluation";
import { defaultWorkflow, setWorkflows } from "@/lib/workflow";

afterEach(() => setWorkflows([defaultWorkflow("Khối Cơ quan"), defaultWorkflow("Khối Đơn vị")]));
const ready = (): Evaluation => {
  const e = structuredClone(EVALUATIONS.find((x) => x.step === "council")!);
  return { ...e, councilReviewed: true, councilSummaryCreated: true, councilTaskScored: true, councilScore: 4, ki: "A", locationCompliance: "Tuân thủ", laborCompliance: "Tuân thủ", criteria: e.criteria.map((c) => ({ ...c, council: 4 })) };
};

it("Cơ quan Chính trị phải xác nhận Tổng hợp KI thì Văn phòng (CQTT) mới trình ký GĐ", () => {
  const e = ready();
  expect(councilConfirmState(e)).toBe("pending");
  expect(() => transition(e, "council", "submit", {}, "t1")).toThrow(/Cơ quan Chính trị xác nhận/);
  expect(() => confirmCouncilSummary(e, "hr", "t1")).toThrow(/không có quyền/);
  expect(() => confirmCouncilSummary(e, "council", "t1")).toThrow(/không có quyền/);
  const ok = confirmCouncilSummary(e, "politics", "t1");
  expect(needsCouncilConfirm(ok)).toBe(false);
  expect(ok.history?.at(-1)?.action).toBe("Xác nhận Tổng hợp KI — Cơ quan Chính trị");
  expect(transition(ok, "council", "submit", {}, "t2").step).toBe("ceo");
});

it("CQCT gửi điều chỉnh cho Văn phòng (CQTT): phiếu vẫn ở bước CQTT, cần xác nhận lại", () => {
  const confirmed = confirmCouncilSummary(ready(), "politics", "t1");
  expect(() => requestCouncilAdjust(confirmed, "politics", " ", "t2")).toThrow(/nội dung/);
  const adjust = requestCouncilAdjust(confirmed, "politics", "Xem lại Ki phiếu này", "t2");
  expect(adjust.step).toBe("council");
  expect(councilConfirmState(adjust)).toBe("adjust");
  expect(() => transition(adjust, "council", "submit", {}, "t3")).toThrow(/xác nhận/);
  const again = confirmCouncilSummary(adjust, "politics", "t4");
  expect(again.councilAdjustRequest).toBeUndefined();
  expect(councilConfirmState(again)).toBe("confirmed");
});

it("Văn phòng (CQTT) sửa điểm sau khi đã xác nhận thì phải xác nhận lại", () => {
  const confirmed = confirmCouncilSummary(ready(), "politics", "t1");
  const edited = saveDraft(confirmed, "council", { criteria: confirmed.criteria.map((c, i) => ({ ...c, council: i ? 4 : 3 })) }, "t2");
  expect(needsCouncilConfirm(edited)).toBe(true);
});

it("cấu hình: bỏ bộ phận xác nhận thì trình ký ngay; tắt quyền gửi điều chỉnh thì bị chặn", () => {
  const c = defaultWorkflow(ready().block);
  c.stages = c.stages.map((s) => (s.key === "council" ? { ...s, confirmBy: [], confirmCanAdjust: false } : s));
  setWorkflows([c]);
  expect(councilConfirmState(ready())).toBe("none");
  expect(transition(ready(), "council", "submit", {}, "t1").step).toBe("ceo");
  const c2 = defaultWorkflow(ready().block);
  c2.stages = c2.stages.map((s) => (s.key === "council" ? { ...s, confirmCanAdjust: false } : s));
  setWorkflows([c2]);
  expect(() => requestCouncilAdjust(ready(), "politics", "abc", "t1")).toThrow(/gửi điều chỉnh/);
});

it("cấu hình nhiều bộ phận xác nhận: đủ tất cả mới được trình ký", () => {
  const c = defaultWorkflow(ready().block);
  c.stages = c.stages.map((s) => (s.key === "council" ? { ...s, roles: ["council", "politics", "hr"], confirmBy: ["politics", "hr"] } : s));
  setWorkflows([c]);
  const one = confirmCouncilSummary(ready(), "politics", "t1");
  expect(needsCouncilConfirm(one)).toBe(true);
  expect(() => transition(one, "council", "submit", {}, "t2")).toThrow(/xác nhận/);
  const both = confirmCouncilSummary(one, "hr", "t2");
  expect(needsCouncilConfirm(both)).toBe(false);
  expect(transition(both, "council", "submit", {}, "t3").step).toBe("ceo");
});
