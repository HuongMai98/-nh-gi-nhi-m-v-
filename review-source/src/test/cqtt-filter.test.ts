import { expect, it } from "vitest";
import { EVALUATIONS } from "@/lib/evaluation";
import { cqttStatus } from "@/lib/cqtt-filter";
it("limits CQTT to received summaries and distinguishes submitted council records", () => {
  const e = EVALUATIONS[0]!;
  expect(cqttStatus({ ...e, step: "self" })).toBeNull();
  expect(cqttStatus({ ...e, step: "office" })).toBeNull();
  expect(cqttStatus({ ...e, step: "cqtt" })).toBe("pending");
  expect(cqttStatus({ ...e, step: "cqtt_report" })).toBe("report");
  expect(cqttStatus({ ...e, step: "response" })).toBe("waiting");
  expect(cqttStatus({ ...e, step: "council" })).toBe("submitted");
});
