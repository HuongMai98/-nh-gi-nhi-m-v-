import { expect, it } from "vitest";
import { EVALUATIONS, processCqttBatch } from "@/lib/evaluation";
const rows = EVALUATIONS.filter((e) => e.step === "cqtt");
const drafts = Object.fromEntries(rows.map((e) => [e.id, { cqttKey: 0.9, cqttFunction: 2.6, note: "Bổ sung chứng minh kết quả" }]));
it("saves all CQTT drafts and requests adjustment atomically", () => {
  const saved = processCqttBatch(EVALUATIONS, "cqtt", rows.map((e) => e.id), drafts, false, "now");
  expect(saved.filter((e) => e.step === "cqtt").every((e) => e.cqttKey === 0.9)).toBe(true);
  const requested = processCqttBatch(EVALUATIONS, "cqtt", rows.map((e) => e.id), drafts, true, "now");
  expect(requested.filter((e) => rows.some((r) => r.id === e.id) && e.step === "response")).toHaveLength(rows.length);
  expect(() => processCqttBatch(EVALUATIONS, "cqtt", rows.map((e) => e.id), { ...drafts, [rows[1]!.id]: { cqttKey: 0.9, cqttFunction: 2.6, note: "" } }, true, "now")).toThrow();
  expect(rows.every((e) => e.step === "cqtt" && e.cqttKey === undefined)).toBe(true);
});
