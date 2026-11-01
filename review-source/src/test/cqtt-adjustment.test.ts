import { expect, it } from "vitest";
import { EVALUATIONS, KI_SCORE_RANGES, proposeCqttKi, cqttScoreForKi, cqttTotal, saveDraft, type Ki } from "@/lib/evaluation";
it("proposes each Ki minimum and allows edits only within its range", () => {
  const e = EVALUATIONS[2]!;
  for (const ki of Object.keys(KI_SCORE_RANGES) as Exclude<Ki, "K">[]) {
    const range = KI_SCORE_RANGES[ki];
    expect(cqttTotal({ ...e, ...proposeCqttKi(e, ki) })).toBe(range.min);
    expect(cqttTotal({ ...e, ...cqttScoreForKi(e, ki, range.max) })).toBe(range.max);
    expect(() => cqttScoreForKi(e, ki, range.max + 0.01)).toThrow();
  }
  expect(() => saveDraft(e, "cqtt", { proposedKi: "A", cqttKey: 0.9, cqttFunction: 2.5 }, "now")).toThrow();
});
