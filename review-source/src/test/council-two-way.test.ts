import { expect, it } from "vitest";
import { councilAutoKi, councilKiDraft, EVALUATIONS } from "@/lib/evaluation";
it("calculates council Ki both ways while preserving actual compliance", () => {
  const e = EVALUATIONS[1]!;
  for (const [ki, score] of [["A+", 4.5], ["A", 3.5], ["B", 2.5], ["C", 2], ["D", 1]] as const) {
    expect(councilKiDraft(ki).councilScore).toBe(score);
    expect(councilAutoKi({ ...e, councilScore: score })).toBe(ki);
  }
  expect(councilKiDraft("K").councilScore).toBeUndefined();
  expect(councilAutoKi({ ...e, councilScore: 4.8, locationCompliance: "Không tuân thủ" })).toBe("D");
  expect(councilAutoKi({ ...e, councilScore: 4.8, laborCompliance: "Vi phạm nhưng chưa đến mức bị xử lý kỷ luật" })).toBe("B");
});
