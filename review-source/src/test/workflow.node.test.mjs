import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EVALUATIONS,
  transition,
  saveDraft,
  templateResult,
  kiError,
  mainStage,
  MAIN_STEPS,
  STEPS,
} from "../lib/evaluation.ts";

const source = () => structuredClone(EVALUATIONS[3]);
const move = (e, role, action, patch = {}) => transition(e, role, action, patch, "now");

test("self sends to office and office can only aggregate and forward", () => {
  const e = move(source(), "performer", "submit");
  assert.equal(e.step, "office");
  assert.throws(() => move(e, "office", "return", { note: "Bổ sung hồ sơ" }));
  assert.equal(move(e, "office", "send").step, "cqtt");
});

test("CQTT preserves its score through a reservation, council inherits and overrides only total", () => {
  let e = move(move(source(), "performer", "submit"), "office", "send");
  e = saveDraft(e, "cqtt", { cqttKey: 0.9, cqttFunction: 3.2, note: "Đề nghị bổ sung" }, "now");
  e = move(e, "cqtt", "request");
  e = move(e, "performer", "respond", { response: "Bảo lưu", responseNote: "Có hồ sơ nghiệm thu" });
  assert.equal(e.step, "cqtt_report");
  e = move(e, "cqtt", "send");
  assert.equal(e.councilScore, 4.1);
  const before = structuredClone(e.criteria);
  e = saveDraft(e, "council", { councilScore: 4.7, ki: "A+" }, "now");
  assert.equal(templateResult(e).score, 4.7);
  assert.ok(Math.abs(e.cqttKey + e.cqttFunction - 4.1) < 1e-10);
  assert.deepEqual(
    e.criteria.map(({ council, ...c }) => c),
    before.map(({ council, ...c }) => c),
  );
  assert.ok(Math.abs(e.criteria.reduce((sum, c) => sum + c.weight * c.council, 0) - 4.7) < 1e-10);
});

test("CEO correction, approval and delivery preserve council result", () => {
  let e = {
    ...source(),
    step: "council",
    cqttKey: 1,
    cqttFunction: 3,
    councilScore: 4,
    ki: "A",
    locationCompliance: "Tuân thủ",
    laborCompliance: "Tuân thủ",
  };
  e = move(e, "council", "submit");
  e = move(e, "ceo", "return", { note: "Kiểm tra lại" });
  assert.equal(e.step, "council_adjust");
  e = saveDraft(e, "council", { councilScore: 4.4 }, "now");
  e = move(e, "council", "submit");
  e = move(e, "ceo", "approve");
  assert.equal(e.approvedScore, 4.4);
  assert.throws(() => saveDraft(e, "council", { councilScore: 5 }, "now"));
  e = move(e, "council", "send");
  e = move(e, "office", "send");
  e = move(e, "performer", "sign");
  assert.equal(e.step, "done");
  assert.equal(templateResult(e).score, 4.4);
});

test("wrong roles, incomplete self scores and invalid council scores are rejected", () => {
  assert.throws(() => move(source(), "council", "submit"));
  assert.throws(() =>
    move(
      { ...source(), criteria: source().criteria.map((c) => ({ ...c, self: 0 })) },
      "performer",
      "submit",
    ),
  );
  const e = { ...source(), step: "council", councilScore: 4, ki: "A" };
  for (const score of [NaN, -1, 5.1])
    assert.throws(() => saveDraft(e, "council", { councilScore: score }, "now"));
  assert.throws(() => saveDraft(e, "performer", { councilScore: 5 }, "now"));
  assert.ok(kiError({ ...e, locationCompliance: "Không tuân thủ" }));
});

test("history retains weighted CQTT group scores even when total is unchanged", () => {
  const e = { ...source(), step: "cqtt", cqttKey: 0.8, cqttFunction: 3.3 };
  const next = saveDraft(e, "cqtt", { cqttKey: 0.9, cqttFunction: 3.2 }, "now");
  const entry = next.history.at(-1);
  assert.equal(JSON.parse(entry.before).cqttKey, 0.8);
  assert.equal(JSON.parse(entry.after).cqttKey, 0.9);
  assert.equal(JSON.parse(entry.before).cqttFunction, 3.3);
  assert.equal(JSON.parse(entry.after).cqttFunction, 3.2);
});

test("main stages group every branch without losing records", () => {
  assert.equal(MAIN_STEPS.length, 6);
  assert.equal(mainStage("response"), "cqtt");
  assert.equal(mainStage("cqtt_report"), "cqtt");
  assert.equal(mainStage("council_adjust"), "council");
  for (const key of ["approved", "dispatch", "sign", "done"])
    assert.equal(mainStage(key), "approved");
  for (const { key } of STEPS) assert.ok(MAIN_STEPS.some((s) => s.key === mainStage(key)));
});

test("sample goals use two key tasks at ten percent and eighty percent functional tasks", () => {
  for (const e of EVALUATIONS) {
    const key = e.criteria.filter((c) => c.group === "A");
    assert.equal(key.length, 2);
    assert.ok(key.every((c) => c.weight === 0.1));
    assert.ok(Math.abs(e.criteria.reduce((sum, c) => sum + c.weight, 0) - 1) < 1e-10);
    assert.ok(
      Math.abs(
        e.criteria.filter((c) => c.group !== "A").reduce((sum, c) => sum + c.weight, 0) - 0.8,
      ) < 1e-10,
    );
  }
});
