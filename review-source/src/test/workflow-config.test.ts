import { afterEach, expect, it } from "vitest";
import { EVALUATIONS, officeFor, saveDraft, transition, type Evaluation } from "@/lib/evaluation";
import {
  cloneWorkflow,
  defaultWorkflow,
  normalizeBranches,
  upgradeWorkflow,
  setWorkflows,
  slaFor,
  validateWorkflow,
  type StageKey,
  type WorkflowConfig,
} from "@/lib/workflow";

const block = "Khối Cơ quan" as const;
const configure = (change: (c: WorkflowConfig) => void) => {
  const c = cloneWorkflow(defaultWorkflow(block));
  change(c);
  setWorkflows([normalizeBranches(c)]);
};
const off = (c: WorkflowConfig, ...keys: StageKey[]) =>
  c.stages.forEach((s) => { if (keys.includes(s.key)) s.enabled = false; });
const selfStep = (): Evaluation => {
  const e = structuredClone(EVALUATIONS.find((x) => x.step === "self" && x.block === block)!);
  return { ...e, criteria: e.criteria.map((c) => ({ ...c, self: c.self || 4, result: c.result || "Đạt" })) };
};
afterEach(() => setWorkflows([defaultWorkflow("Khối Cơ quan"), defaultWorkflow("Khối Đơn vị")]));

it("cấu hình mặc định hợp lệ cho cả hai khối", () => {
  expect(validateWorkflow(defaultWorkflow("Khối Cơ quan"))).toEqual([]);
  expect(validateWorkflow(defaultWorkflow("Khối Đơn vị"))).toEqual([]);
});

it("chặn cấu hình sai: tắt bước bắt buộc, không còn bước chấm điểm, SLA sai", () => {
  const c = cloneWorkflow(defaultWorkflow(block));
  off(c, "self", "cqtt", "council", "ceo");
  c.stages[1]!.slaDays = -1;
  const errors = validateWorkflow(c);
  expect(errors.join(" ")).toMatch(/bắt buộc/);
  expect(errors.join(" ")).toMatch(/ít nhất một bước chấm điểm/);
  expect(errors.join(" ")).toMatch(/0–60/);
});

it("tắt bước Tổng hợp: tự đánh giá gửi thẳng CQTT", () => {
  configure((c) => off(c, "office"));
  expect(transition(selfStep(), "performer", "submit", {}, "now").step).toBe("cqtt");
});

it("tắt CQTT và Hội đồng: TGĐ nhận điểm tự đánh giá để phê duyệt", () => {
  configure((c) => off(c, "office", "cqtt", "council"));
  const e = transition(selfStep(), "performer", "submit", {}, "now");
  expect(e.step).toBe("ceo");
  expect(e.councilScore).toBeGreaterThan(0);
  expect(e.ki).toBeTruthy();
});

it("trình ký GĐ bắt buộc, cấu hình cũ không được bỏ qua kết quả ký", () => {
  configure((c) => off(c, "ceo", "dispatch"));
  const e = structuredClone(EVALUATIONS.find((x) => x.step === "council" && x.block === block)!);
  const next = transition({ ...e, locationCompliance: "Tuân thủ", laborCompliance: "Tuân thủ" }, "council", "submit", {}, "now");
  expect(next.step).toBe("ceo");
  expect(next.councilScore).toBe(e.councilScore);
});

it("không cấu hình trả về: CQTT/TGĐ không được trả về, TGĐ không được tự điều chỉnh khi tắt", () => {
  configure((c) => { c.stages.forEach((s) => { s.returnTo = []; }); c.branches.ceoDirectAdjust = false; });
  const cqtt = saveDraft(structuredClone(EVALUATIONS.find((x) => x.step === "cqtt" && x.block === block)!), "cqtt", { cqttKey: 0.8, cqttFunction: 2.5 }, "now");
  expect(() => transition(cqtt, "cqtt", "request", { note: "x" }, "now")).toThrow(/không cho phép/);
  const ceo = structuredClone(EVALUATIONS.find((x) => x.step === "ceo")!);
  const c = cloneWorkflow(defaultWorkflow(ceo.block));
  c.stages.forEach((s) => { s.returnTo = []; }); c.branches.ceoDirectAdjust = false;
  setWorkflows([c]);
  expect(transition(ceo, "ceo", "return", { note: "x" }, "now").step).toBe("council_adjust");
  expect(() => saveDraft(ceo, "ceo", { councilScore: 4.2 }, "now")).toThrow();
});

it("trả về theo bước người xử lý chọn trong danh sách được phép", () => {
  const ceo = structuredClone(EVALUATIONS.find((x) => x.step === "ceo")!);
  const c = cloneWorkflow(defaultWorkflow(ceo.block));
  c.stages.find((s) => s.key === "ceo")!.returnTo = ["self", "cqtt", "council"];
  setWorkflows([c]);
  expect(transition(ceo, "ceo", "return", { note: "Rà soát lại", returnStage: "council" }, "now").step).toBe("council_adjust");
  const toCqtt = transition(ceo, "ceo", "return", { note: "Chấm lại", returnStage: "cqtt" }, "now");
  expect(toCqtt).toMatchObject({ step: "council_adjust", note: "Chấm lại" });
  expect(toCqtt.history?.at(-1)?.action).toBe("GĐ trả lại trình ký");
  expect(transition(ceo, "ceo", "return", { note: "Bổ sung", returnStage: "self" }, "now").step).toBe("council_adjust");
  expect(transition(ceo, "ceo", "return", { note: "x", returnStage: "office" }, "now").step).toBe("council_adjust");
  expect(() => transition(ceo, "ceo", "return", { returnStage: "cqtt", note: "" }, "now")).toThrow(/lý do/);
});

it("Văn phòng và Hội đồng trả về khi được cấu hình; CQTT trả về Văn phòng không qua Tiếp thu/Bảo lưu", () => {
  configure((c) => {
    c.stages.find((s) => s.key === "office")!.returnTo = ["self"];
    c.stages.find((s) => s.key === "council")!.returnTo = ["cqtt"];
    c.stages.find((s) => s.key === "cqtt")!.returnTo = ["self", "office"];
  });
  const office = structuredClone(EVALUATIONS.find((x) => x.step === "office" && x.block === block)!);
  expect(transition(office, "office", "return", { note: "Thiếu minh chứng" }, "now").step).toBe("self");
  const council = structuredClone(EVALUATIONS.find((x) => x.step === "council" && x.block === block)!);
  expect(transition(council, "council", "return", { note: "Chấm lại" }, "now").step).toBe("cqtt");
  const cqtt = saveDraft(structuredClone(EVALUATIONS.find((x) => x.step === "cqtt" && x.block === block)!), "cqtt", { cqttKey: 0.8, cqttFunction: 2.5 }, "now");
  expect(transition(cqtt, "cqtt", "request", { note: "Gửi lại VP", returnStage: "office" }, "now").step).toBe("office");
  expect(transition(cqtt, "cqtt", "request", { note: "Phản hồi" }, "now").step).toBe("response");
});

it("cấu hình trả về không hợp lệ bị loại khi tắt bước đích; đọc được cấu hình cũ", () => {
  const c = cloneWorkflow(defaultWorkflow(block));
  c.stages.find((s) => s.key === "ceo")!.returnTo = ["council"];
  c.stages.find((s) => s.key === "council")!.enabled = false;
  expect(normalizeBranches(c).stages.find((s) => s.key === "ceo")!.returnTo).toEqual([]);
  const legacy = { ...defaultWorkflow(block), branches: { cqttReturn: false, ceoReturn: true, ceoDirectAdjust: true } } as never;
  const up = upgradeWorkflow({ ...(legacy as object), stages: defaultWorkflow(block).stages.map(({ returnTo: _r, ...s }) => s) } as never);
  expect(up.stages.find((s) => s.key === "cqtt")!.returnTo).toEqual([]);
  expect(up.stages.find((s) => s.key === "ceo")!.returnTo).toEqual(["council"]);
});

it("đơn vị xử lý lấy theo cấu hình", () => {
  configure((c) => { c.stages.find((s) => s.key === "office")!.handler = "Ban Tổ chức lao động"; });
  expect(officeFor(selfStep())).toBe("Ban Tổ chức lao động");
});

it("tính hạn xử lý theo SLA của bước hiện tại", () => {
  const e = { ...selfStep(), stageEnteredAt: "2026-11-01T00:00:00.000Z" };
  expect(slaFor(e, new Date("2026-11-03T00:00:00.000Z"))).toMatchObject({ overdue: false, daysLeft: 5 });
  expect(slaFor(e, new Date("2026-11-10T00:00:00.000Z"))).toMatchObject({ overdue: true });
});
