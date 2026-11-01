import { test } from "node:test";
import assert from "node:assert/strict";
import { EVALUATIONS, forwardOfficeBatch } from "../lib/evaluation.ts";
const fixtures = () => {
  const a = structuredClone(EVALUATIONS[4]);
  return [a, { ...structuredClone(a), id: "BATCH-002" }, structuredClone(EVALUATIONS[2])];
};
test("office forwards the whole scoped batch atomically and saves pending metadata", () => {
  const before = fixtures();
  const after = forwardOfficeBatch(
    before,
    "office",
    [before[0].id, before[1].id],
    { [before[0].id]: { reviewAssistant: "quyendv", reviewRemark: "Đã tổng hợp" } },
    "now",
  );
  assert.equal(after[0].step, "cqtt");
  assert.equal(after[1].step, "cqtt");
  assert.equal(after[0].reviewAssistant, "quyendv");
  assert.equal(after[2], before[2]);
  assert.equal(before[0].step, "office");
  assert.equal(before[1].step, "office");
  assert.deepEqual(after[0].criteria, before[0].criteria);
});
test("batch rejects wrong role, empty, missing, advanced or mixed scope records without partial changes", () => {
  const source = fixtures();
  const ids = source.slice(0, 2).map((e) => e.id);
  assert.throws(() => forwardOfficeBatch(source, "performer", ids, {}, "now"));
  assert.throws(() => forwardOfficeBatch(source, "office", [], {}, "now"));
  assert.throws(() => forwardOfficeBatch(source, "office", [...ids, "missing"], {}, "now"));
  assert.throws(() =>
    forwardOfficeBatch(
      source,
      "office",
      source.map((e) => e.id),
      {},
      "now",
    ),
  );
  assert.throws(() =>
    forwardOfficeBatch(
      [{ ...source[0], block: "Khối Đơn vị" }, source[1]],
      "office",
      ids,
      {},
      "now",
    ),
  );
  assert.throws(() =>
    forwardOfficeBatch(
      [{ ...source[0], period: "Quý II/2026" }, source[1]],
      "office",
      ids,
      {},
      "now",
    ),
  );
  assert.equal(source[0].step, "office");
  assert.equal(source[1].step, "office");
});
test("invalid row draft blocks the entire batch", () => {
  const source = fixtures();
  assert.throws(() =>
    forwardOfficeBatch(
      source,
      "office",
      source.slice(0, 2).map((e) => e.id),
      { [source[1].id]: { councilScore: 5 } },
      "now",
    ),
  );
  assert.equal(source[0].step, "office");
  assert.equal(source[1].step, "office");
});
