import { afterEach, expect, it } from "vitest";
import { EVALUATIONS, roleOf, statusLabelOf, transition, type Evaluation } from "@/lib/evaluation";
import { cloneWorkflow, defaultWorkflow, normalizeBranches, setWorkflows, slaFor, validateWorkflow, type CustomStage } from "@/lib/workflow";

const block = "Khối Cơ quan" as const;
const step = (over: Partial<CustomStage> = {}): CustomStage => ({
  id: "pho-tgd", name: "Phó TGĐ duyệt", after: "council", role: "ceo", handler: "Phó TGĐ phụ trách", slaDays: 2, enabled: true, returnTo: ["council"], ...over,
});
const withCustom = (...cs: CustomStage[]) => {
  const c = cloneWorkflow(defaultWorkflow(block));
  c.customStages = cs;
  setWorkflows([normalizeBranches(c)]);
};
const atCouncil = (): Evaluation => ({ ...structuredClone(EVALUATIONS.find((x) => x.step === "council" && x.block === block)!), locationCompliance: "Tuân thủ", laborCompliance: "Tuân thủ" });
afterEach(() => setWorkflows([defaultWorkflow("Khối Cơ quan"), defaultWorkflow("Khối Đơn vị")]));

it("bước tùy chỉnh hợp lệ / thiếu tên bị chặn", () => {
  const c = cloneWorkflow(defaultWorkflow(block));
  c.customStages = [step()];
  expect(validateWorkflow(c)).toEqual([]);
  c.customStages = [step({ name: " " })];
  expect(validateWorkflow(c).join(" ")).toMatch(/tên cho bước bổ sung/);
});

it("hồ sơ đi qua bước tùy chỉnh rồi tiếp tục bước kế", () => {
  withCustom(step());
  const atCustom = transition(atCouncil(), "council", "submit", {}, "now");
  expect(atCustom).toMatchObject({ step: "custom", customStageId: "pho-tgd" });
  expect(roleOf(atCustom)).toBe("ceo");
  expect(statusLabelOf(atCustom)).toBe("Phó TGĐ duyệt");
  expect(slaFor(atCustom)?.slaDays).toBe(2);
  expect(() => transition(atCustom, "council", "send", {}, "now")).toThrow(/Vai trò/);
  const after = transition(atCustom, "ceo", "send", {}, "now");
  expect(after.step).toBe("ceo");
  expect(after.customStageId).toBeUndefined();
  expect(after.history?.at(-1)?.action).toBe("Duyệt — Phó TGĐ duyệt");
});

it("bước tùy chỉnh trả về theo cấu hình, bắt buộc lý do", () => {
  withCustom(step());
  const atCustom = transition(atCouncil(), "council", "submit", {}, "now");
  expect(() => transition(atCustom, "ceo", "return", { note: "" }, "now")).toThrow(/lý do/);
  expect(transition(atCustom, "ceo", "return", { note: "Xem lại Ki" }, "now").step).toBe("council_adjust");
});

it("bước tùy chỉnh đang tắt bị bỏ qua; hai bước liên tiếp đi đúng thứ tự", () => {
  withCustom(step({ enabled: false }));
  expect(transition(atCouncil(), "council", "submit", {}, "now").step).toBe("ceo");
  withCustom(step({ id: "a", name: "A", role: "office" }), step({ id: "b", name: "B", role: "cqtt" }));
  const a = transition(atCouncil(), "council", "submit", {}, "now");
  expect(a.customStageId).toBe("a");
  const b = transition(a, "office", "send", {}, "now");
  expect(b.customStageId).toBe("b");
  expect(transition(b, "cqtt", "send", {}, "now").step).toBe("ceo");
});
