import { describe, expect, it } from "vitest";
import {
  ASSIGNING_UNIT,
  EVALUATIONS,
  canSelfEvaluate,
  mockPerformerFor,
  rating,
  totalScore,
  type Criterion,
} from "@/lib/evaluation";
describe("evaluation scoring", () => {
  it("previews the performer for pending self-evaluation", () => {
    const e = EVALUATIONS[3]!;
    expect(mockPerformerFor(e)).toBe(e.owner);
    expect(canSelfEvaluate(e, e.owner)).toBe(true);
  });
  it("provides task dates and assigning unit", () => {
    expect(EVALUATIONS).toHaveLength(85);
    for (const e of EVALUATIONS)
      for (const c of e.criteria) {
        expect(c.startDate).toMatch(/^2026-07-/);
        expect(Date.parse(c.endDate!)).toBeGreaterThan(Date.parse(c.startDate!));
      }
    expect(ASSIGNING_UNIT.label).toBe("Tập đoàn");
  });
  it("calculates weighted self scores", () => {
    expect(
      totalScore([
        { weight: 0.4, self: 5 },
        { weight: 0.6, self: 3 },
      ] as Criterion[]),
    ).toBe(3.8);
  });
  it("matches BM01 rating boundaries", () => {
    expect(rating(1.99).ki).toBe("D");
    expect(rating(2).label).toBe("Gần đạt yêu cầu");
    expect(rating(2.5).ki).toBe("B");
    expect(rating(3.5).ki).toBe("A");
    expect(rating(4.5).ki).toBe("A+");
  });
});
