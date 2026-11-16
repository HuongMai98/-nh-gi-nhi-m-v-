import { expect, it } from "vitest";
import { EVALUATIONS } from "@/lib/evaluation";
import { CURRENT_USER, canActOnSelf, canSubmitEvaluation } from "@/lib/users";
it("CQ/CQĐV được chỉnh sửa phiếu Văn phòng gửi điều chỉnh, kể cả khác đơn vị", () => {
  const other = { ...EVALUATIONS.find((e) => e.step === "office")!, step: "self" as const, employeeId: "000000", unit: "Đơn vị khác" };
  expect(canSubmitEvaluation(other, CURRENT_USER)).toBe(false);
  expect(canActOnSelf(other, CURRENT_USER)).toBe(false);
  expect(canActOnSelf({ ...other, officeReturnPending: true }, CURRENT_USER)).toBe(true);
});
