import { describe, expect, it } from "vitest";
import { EVALUATIONS, type Evaluation } from "@/lib/evaluation";
import { officeSubmissionSummary, officeUnassessedEvaluations } from "@/lib/office-filter";

const base = EVALUATIONS[0];
if (!base) throw new Error("Expected a sample evaluation");
const records: Evaluation[] = [
  { ...base, id: "self", period: "Quý III/2026", block: "Khối Cơ quan", unit: "Văn phòng", step: "self" },
  { ...base, id: "office", period: "Quý III/2026", block: "Khối Cơ quan", unit: "Văn phòng", step: "office" },
  { ...base, id: "cqtt", period: "Quý III/2026", block: "Khối Đơn vị", unit: "Đơn vị A", step: "cqtt" },
  { ...base, id: "done", period: "Quý III/2026", block: "Khối Đơn vị", unit: "Đơn vị A", step: "done" },
  { ...base, id: "previous", period: "Quý II/2026", block: "Khối Cơ quan", unit: "Văn phòng", step: "office" },
];

describe("Office self-evaluation submission coverage", () => {
  it("counts only pending self-evaluations over all required evaluations", () => {
    expect(officeSubmissionSummary(records, "Quý III/2026", "all")).toEqual({ unassessed: 1, total: 4 });
  });
  it("scopes the totals to the selected period and block", () => {
    expect(officeSubmissionSummary(records, "Quý III/2026", "Khối Cơ quan")).toEqual({ unassessed: 1, total: 2 });
    expect(officeSubmissionSummary(records, "Quý III/2026", "Khối Đơn vị")).toEqual({ unassessed: 0, total: 2 });
    expect(officeSubmissionSummary(records, "Quý II/2026", "all")).toEqual({ unassessed: 0, total: 1 });
  });
  it("scopes to a selected performing unit", () => {
    expect(officeSubmissionSummary(records, "Quý III/2026", "all", "Văn phòng")).toEqual({ unassessed: 1, total: 2 });
  });
  it("returns zero counts for an empty scope", () => {
    expect(officeSubmissionSummary(records, "Quý I/2026", "all")).toEqual({ unassessed: 0, total: 0 });
  });
  it("lists exactly the unassessed employees in the counter's scope", () => {
    const scope = officeUnassessedEvaluations(records, "Quý III/2026", "Khối Cơ quan", "Văn phòng");
    expect(scope.map((e) => e.id)).toEqual(["self"]);
    expect(scope.length).toBe(officeSubmissionSummary(records, "Quý III/2026", "Khối Cơ quan", "Văn phòng").unassessed);
    expect(officeUnassessedEvaluations(records, "Quý III/2026", "Khối Đơn vị")).toEqual([]);
  });
});