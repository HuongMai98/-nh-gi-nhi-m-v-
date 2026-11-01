import { expect, it } from "vitest";
import { EVALUATIONS, processCqttBatch } from "@/lib/evaluation";
it("sends scored CQTT records to council and inherits their total atomically", () => {
  const rows = EVALUATIONS.filter((e) => e.step === "cqtt").slice(0, 2);
  const ids = rows.map((e) => e.id);
  const drafts = Object.fromEntries(ids.map((id) => [id, { cqttKey: 0.9, cqttFunction: 2.6 }]));
  const next = processCqttBatch(EVALUATIONS, "cqtt", ids, drafts, "council", "now");
  expect(next.filter((e) => ids.includes(e.id)).every((e) => e.step === "council" && e.councilScore === 3.5)).toBe(true);
  expect(() => processCqttBatch(EVALUATIONS, "cqtt", ids, { [ids[0]!]: drafts[ids[0]!]! }, "council", "now")).toThrow();
  expect(rows.every((e) => e.step === "cqtt")).toBe(true);
});
