import { expect, it } from "vitest";
import { EVALUATIONS, templateResult, cqttTotal, saveDraft } from "@/lib/evaluation";
it("distinguishes inherited CQTT scores from actual council evaluation", () => {
  const e = EVALUATIONS[1]!;
  expect(cqttTotal(e)).toBe(4.1);
  expect(e.councilScore).toBe(4.1);
  expect(templateResult(e).score).toBeNull();
  expect(templateResult(e).ki).toBe("—");
  const saved = saveDraft(e, "council", { councilScore: 4.3, ki: "A" }, "now");
  expect(templateResult(saved).score).toBe(4.3);
  expect(templateResult(saved).ki).toBe("A");
});
