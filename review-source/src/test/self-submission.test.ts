import { expect, it } from "vitest";
import { canSubmitEvaluation, CURRENT_USER, validateSelfSubmission } from "@/lib/users";
import { EVALUATIONS } from "@/lib/evaluation";
it("allows the performer or a colleague in the same unit to submit", () => {
  const e = EVALUATIONS.find((e) => e.employeeId === CURRENT_USER.employeeId)!;
  expect(canSubmitEvaluation(e, CURRENT_USER)).toBe(true);
  expect(canSubmitEvaluation(e, { ...CURRENT_USER, employeeId: "colleague" })).toBe(true);
  expect(canSubmitEvaluation(e, { ...CURRENT_USER, employeeId: "other", unit: "Other unit" })).toBe(false);
});
it("requires complete self scores/results and 20/80 weights only when sending", () => {
  const e = EVALUATIONS[0]!;
  expect(validateSelfSubmission(e)).toBeNull();
  expect(validateSelfSubmission({ ...e, criteria: e.criteria.map((c, i) => i ? c : { ...c, self: 0 }) })).toMatch(/điểm/);
  expect(validateSelfSubmission({ ...e, criteria: e.criteria.map((c, i) => i ? c : { ...c, result: "" }) })).toMatch(/kết quả/);
  expect(validateSelfSubmission({ ...e, criteria: e.criteria.map((c) => ({ ...c, group: "B-I" })) })).toMatch(/20%/);
});
