import { describe, expect, it } from "vitest";
import { EVALUATIONS, saveDraft, transition, templateResult, kiError } from "@/lib/evaluation";
const pending = EVALUATIONS[3]!;
const sent = () => transition(pending, "performer", "submit", {}, "now");
describe("evaluation workflow", () => {
  it("office only aggregates and sends to CQTT; it cannot return records", () => {
    const office = sent();
    expect(office.step).toBe("office");
    expect(() =>
      transition(office, "office", "return", { note: "Yêu cầu bổ sung" }, "now"),
    ).toThrow();
    expect(transition(office, "office", "send", {}, "now").step).toBe("cqtt");
  });
  it("keeps CQTT score when receiving a reservation and inherits it for council", () => {
    let e = transition(sent(), "office", "send", {}, "now");
    e = saveDraft(
      e,
      "cqtt",
      { cqttAdjustmentPercent: 25, cqttKey: 0.9, cqttFunction: 3.2, note: "Bổ sung chứng minh" },
      "now",
    );
    e = transition(e, "cqtt", "request", {}, "now");
    e = transition(
      e,
      "performer",
      "respond",
      { response: "Bảo lưu", responseNote: "Đã có hồ sơ" },
      "now",
    );
    e = transition(e, "cqtt", "send", {}, "now");
    expect(e.councilScore).toBe(4.1);
    const revised = saveDraft(e, "council", { councilScore: 4.8, ki: "A+" }, "now");
    expect(revised.councilScore).toBe(4.8);
    expect(templateResult(revised).score).toBeNull();
    expect(templateResult(transition(revised, "council", "finish", {}, "now")).score).toBe(4.8);
    expect(revised.cqttFunction).toBe(3.2);
    expect(revised.criteria.map((c) => c.self)).toEqual(e.criteria.map((c) => c.self));
    expect(revised.criteria.reduce((sum, c) => sum + c.weight * c.council!, 0)).toBeCloseTo(
      4.8,
      10,
    );
  });
  it("locks scores after approval and validates compliance", () => {
    const e = {
      ...pending,
      step: "council" as const,
      councilScore: 4.5,
      ki: "A+" as const,
      locationCompliance: "Không tuân thủ",
    };
    expect(kiError(e)).toMatch(/Ki D/);
    expect(() => transition(e, "council", "submit", {}, "now")).toThrow();
    const ready = { ...e, locationCompliance: "Tuân thủ", laborCompliance: "Tuân thủ" };
    const approved = transition(
      transition(ready, "council", "submit", {}, "now"),
      "ceo",
      "approve",
      {},
      "now",
    );
    expect(() => saveDraft(approved, "council", { councilScore: 5 }, "now")).toThrow();
    expect(templateResult(approved).score).toBe(4.5);
  });
});
