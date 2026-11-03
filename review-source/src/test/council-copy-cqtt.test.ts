import { expect, it } from "vitest";
import { EVALUATIONS, councilCopyFromCqtt, kiError, type Evaluation } from "@/lib/evaluation";

const base = EVALUATIONS[0]!;
const copy = (cqttKey: number, cqttFunction: number, proposedKi?: Evaluation["proposedKi"]) => {
  const e = { ...base, cqttKey, cqttFunction, ...(proposedKi ? { proposedKi } : {}) } as Evaluation;
  const draft = councilCopyFromCqtt(e);
  return { draft, error: kiError({ ...e, ...draft } as Evaluation) };
};

it("sao chép CQTT điền Tuân thủ khớp Ki", () => {
  expect(copy(0.9, 3.2).draft).toMatchObject({ councilScore: 4.1, ki: "A", locationCompliance: "Tuân thủ", laborCompliance: "Tuân thủ" });
  // CQTT đề xuất Ki thấp hơn mức điểm → vi phạm nội quy (Ki tối đa B).
  expect(copy(0.9, 3.2, "B").draft.laborCompliance).toBe("Vi phạm nhưng chưa đến mức bị xử lý kỷ luật");
  // CQTT đề xuất Ki D khi điểm ≥ 2 → bị xử lý kỷ luật.
  expect(copy(0.9, 3.2, "D").draft.laborCompliance).toBe("Bị xử lý kỷ luật lao động");
  // Điểm < 2 → Ki D, tuân thủ đầy đủ.
  expect(copy(0.4, 1.2).draft).toMatchObject({ ki: "D", laborCompliance: "Tuân thủ" });
  for (const c of [copy(0.9, 3.2), copy(0.9, 3.2, "B"), copy(0.9, 3.2, "C"), copy(0.9, 3.2, "D"), copy(0.4, 1.2), copy(1, 4)]) expect(c.error).toBe("");
});
