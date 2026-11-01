import { expect, it } from "vitest";
import { EVALUATIONS, cqttBounds, proposeCqttKi, cqttTotal } from "@/lib/evaluation";
it("defaults to ten percent and adjusts proposed Ki without changing self scores", () => {
  const e = EVALUATIONS[2]!;
  expect(cqttBounds(e).max).toBeCloseTo(3.795);
  const patch = proposeCqttKi(e, "A+");
  expect(cqttTotal({ ...e, ...patch })).toBe(3.5);
  expect(patch.cqttKey!).toBeLessThanOrEqual(1);
  expect(patch.cqttFunction!).toBeLessThanOrEqual(4);
  expect(e.criteria[0]!.self).toBeGreaterThan(0);
  expect(proposeCqttKi({ ...e, cqttAdjustmentPercent: 0 }, "A+").proposedKi).toBe("A+");
  expect(() => proposeCqttKi({ ...e, laborCompliance: "Bị xử lý kỷ luật lao động" }, "A+")).toThrow();
});
