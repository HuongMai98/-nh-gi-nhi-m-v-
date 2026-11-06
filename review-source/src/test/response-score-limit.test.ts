import { expect, it } from "vitest";
import { EVALUATIONS, responseScoreLimits, saveDraft, transition } from "@/lib/evaluation";
it("caps each response score at the fixed CQTT score across saves", () => {
  const e = EVALUATIONS.find(e => e.id === "DG-2026-Q3-009")!;
  const limits = responseScoreLimits(e);
  const criteria = e.criteria.map((c, i) => ({ ...c, self: limits[i]! }));
  const saved = saveDraft(e, "performer", { criteria }, "test");
  expect(responseScoreLimits(saved)).toEqual(limits);
  const lower = criteria.map(c => ({ ...c, self: 1 }));
  expect(() => saveDraft(saved, "performer", { criteria: lower }, "test")).not.toThrow();
  expect(() => saveDraft(saved, "performer", { criteria: criteria.map((c, i) => i ? c : { ...c, self: limits[0]! + 0.01 }) }, "test")).toThrow(/bằng hoặc nhỏ hơn/);
  const invalid = { ...saved, criteria: criteria.map((c, i) => i ? c : { ...c, self: limits[0]! + 0.01 }) };
  expect(() => transition(invalid, "performer", "respond", { response: "Tiếp thu" }, "test")).toThrow(/bằng hoặc nhỏ hơn/);
});
it("does not allow forged CQTT scores to increase the ceiling", () => {
  const e = { ...EVALUATIONS.find(e => e.id === "DG-2026-Q3-009")!, responseBaseline: undefined };
  e.criteria = e.criteria.map(c => ({ ...c, cqtt: 3 }));
  expect(() => saveDraft(e, "performer", { criteria: e.criteria.map(c => ({ ...c, cqtt: 5, self: 4 })) }, "test")).toThrow(/bằng hoặc nhỏ hơn/);
});