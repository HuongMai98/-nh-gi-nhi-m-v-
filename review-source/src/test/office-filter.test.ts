import { expect, it } from "vitest";
import { EVALUATIONS } from "@/lib/evaluation";
import { officeAggregationStatus } from "@/lib/office-filter";
it("only lists submitted individuals as pending or completed office aggregation", () => {
  const e = EVALUATIONS[0]!;
  expect(officeAggregationStatus({ ...e, step: "self" })).toBeNull();
  expect(officeAggregationStatus({ ...e, step: "office" })).toBe("pending");
  for (const step of ["cqtt", "response", "cqtt_report", "council", "ceo", "done"] as const)
    expect(officeAggregationStatus({ ...e, step })).toBe("completed");
});
