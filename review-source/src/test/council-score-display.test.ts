import { expect, it } from "vitest";
import { EVALUATIONS, templateResult, cqttTotal, saveDraft, transition } from "@/lib/evaluation";
it("distinguishes inherited CQTT scores from actual council evaluation", () => {
  const e = EVALUATIONS[1]!;
  expect(cqttTotal(e)).toBe(4.1);
  expect(e.councilScore).toBe(4.1);
  expect(templateResult(e).score).toBeNull();
  expect(templateResult(e).ki).toBe("—");
  const saved = saveDraft(e, "council", { councilScore: 4.3, ki: "A" }, "now");
  expect(saved.councilScore).toBe(4.3);
  expect(templateResult(saved).score).toBeNull();
  const finished = transition(saved, "council", "finish", {}, "now");
  expect(templateResult(finished).score).toBe(4.3);
  expect(templateResult(finished).ki).toBe("A");
});
