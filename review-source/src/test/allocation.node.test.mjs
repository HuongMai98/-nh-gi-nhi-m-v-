import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allocateCouncilScores,
  allocatedTotal,
  EVALUATIONS,
  saveDraft,
  transition,
} from "../lib/evaluation.ts";
const rows = () =>
  [3, 4, 5].map((self, i) => ({ ...EVALUATIONS[3].criteria[i], weight: [0.2, 0.3, 0.5][i], self }));
const rawTotal = (items) => items.reduce((n, c) => n + c.weight * c.council, 0);
test("preserves relative self scores when no limit is reached", () => {
  const input = rows();
  const result = allocateCouncilScores(input, 3.44);
  assert.ok(Math.abs(rawTotal(result) - 3.44) < 1e-10);
  result.forEach((c, i) => assert.ok(Math.abs(c.council - input[i].self * 0.8) < 1e-10));
  assert.ok(input.every((c) => c.council === undefined));
});
test("caps at five and redistributes until weighted total matches", () => {
  const result = allocateCouncilScores(rows(), 4.8);
  assert.ok(Math.abs(rawTotal(result) - 4.8) < 1e-10);
  assert.equal(result[2].council, 5);
  assert.ok(result[0].council < result[1].council);
  assert.equal(allocatedTotal(result), 4.8);
});
test("uses floor one; handles endpoints and no-evaluation", () => {
  for (const target of [1, 1.05, 2.65, 3.99, 4.95, 5]) {
    const result = allocateCouncilScores(rows(), target);
    assert.ok(result.every((c) => c.council >= 1 && c.council <= 5));
    assert.ok(Math.abs(rawTotal(result) - target) < 1e-10);
    assert.equal(allocatedTotal(result), target);
  }
  const cleared = allocateCouncilScores(allocateCouncilScores(rows(), 4), undefined);
  assert.equal(allocatedTotal(cleared), null);
  assert.ok(cleared.every((c) => c.council === undefined));
});
test("rejects invalid source or target instead of inventing weights and scores", () => {
  for (const target of [NaN, Infinity, 0, 5.1])
    assert.throws(() => allocateCouncilScores(rows(), target));
  assert.throws(() => allocateCouncilScores([], 4));
  assert.throws(() =>
    allocateCouncilScores(
      rows().map((c) => ({ ...c, weight: 0.1 })),
      4,
    ),
  );
  assert.throws(() =>
    allocateCouncilScores(
      rows().map((c) => ({ ...c, self: 0 })),
      4,
    ),
  );
});
test("allocation follows council save, inheritance, revision and history without changing self or CQTT", () => {
  const e = {
    ...EVALUATIONS[3],
    step: "council",
    cqttKey: 0.8,
    cqttFunction: 3.3,
    councilScore: 4.1,
    ki: "A",
  };
  const result = saveDraft(e, "council", { councilScore: 4.8, ki: "A+" }, "now");
  assert.equal(allocatedTotal(result.criteria), 4.8);
  assert.deepEqual(
    result.criteria.map((c) => c.self),
    e.criteria.map((c) => c.self),
  );
  assert.equal(result.cqttKey, 0.8);
  assert.equal(result.cqttFunction, 3.3);
  assert.equal(allocatedTotal(JSON.parse(result.history.at(-1).after).criteria), 4.8);
  const cleared = saveDraft(result, "council", { councilScore: undefined, ki: "K" }, "next");
  assert.equal(allocatedTotal(cleared.criteria), null);
  const inherited = transition({ ...e, step: "cqtt_report" }, "cqtt", "send", {}, "now");
  assert.equal(allocatedTotal(inherited.criteria), 4.1);
});
