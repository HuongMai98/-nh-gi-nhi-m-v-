import { expect, it } from "vitest";
import { EVALUATIONS, MAIN_STEPS, statusLabelOf } from "@/lib/evaluation";
it.each(["self", "office", "cqtt", "council", "ceo"] as const)("uses the same %s label in list, detail and edit views", step => {
  const label = MAIN_STEPS.find(s => s.key === step)!.label;
  expect(statusLabelOf({ ...EVALUATIONS[0]!, step })).toBe(label);
});