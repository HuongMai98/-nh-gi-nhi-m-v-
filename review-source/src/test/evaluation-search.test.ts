import { expect, it } from "vitest";
import { EVALUATIONS } from "@/lib/evaluation";
import { matchesAdvancedSearch } from "@/lib/evaluation-search";

it("combines partial text, block and grouped workflow status", () => {
  const e = { ...EVALUATIONS[0]!, employeeId: "091599", owner: "Đinh Ngọc Tuấn", step: "done" as const };
  const filter = { employeeId: " 9159 ", owner: "ngỌc", id: e.id.toLowerCase(), block: e.block, status: "approved" };
  expect(matchesAdvancedSearch(e, filter)).toBe(true);
  for (const key of ["employeeId", "owner", "id", "block", "status"] as const) {
    expect(matchesAdvancedSearch(e, { ...filter, [key]: "no-match" })).toBe(false);
  }
  expect(matchesAdvancedSearch(e, { employeeId: "", owner: "", id: "", block: "", status: "" })).toBe(true);
  expect(matchesAdvancedSearch({ ...e, step: "response" }, { ...filter, status: "response" })).toBe(true);
});
