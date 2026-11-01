import { expect, it } from "vitest";
import { sameUnitPerformers, type User } from "@/lib/users";
it("includes current user and only colleagues from their unit, deduplicated by ID", () => {
  const current: User = { employeeId: "01", name: "A", unit: "Ban A", block: "Khối Cơ quan" };
  const colleague = { ...current, employeeId: "02", name: "B" };
  expect(sameUnitPerformers([current, colleague, { ...current, employeeId: "03", unit: "Ban B" }], current)).toEqual([current, colleague]);
  expect(sameUnitPerformers([], current)).toEqual([current]);
});
