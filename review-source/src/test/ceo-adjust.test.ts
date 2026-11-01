import { expect, it } from "vitest";
import { EVALUATIONS, allocatedTotal, saveDraft, transition } from "@/lib/evaluation";

const atCeo = () => structuredClone(EVALUATIONS.find((x) => x.step === "ceo")!);

it("TGĐ điều chỉnh trực tiếp điểm/Ki, phân bổ lại và phê duyệt theo điểm đã chỉnh", () => {
  const e = atCeo();
  const adjusted = saveDraft(e, "ceo", { councilScore: 4.6, ki: "A+" }, "now");
  expect(adjusted.step).toBe("ceo");
  expect(adjusted.ceoAdjusted).toBe(true);
  expect(allocatedTotal(adjusted.criteria)).toBe(4.6);
  expect(adjusted.history?.at(-1)).toMatchObject({ role: "ceo", action: "TGĐ điều chỉnh trực tiếp" });
  const approved = transition(adjusted, "ceo", "approve", {}, "now");
  expect(approved).toMatchObject({ step: "approved", approvedScore: 4.6, approvedKi: "A+" });
});

it("TGĐ không được điều chỉnh trái điều kiện Ki", () => {
  expect(() => saveDraft(atCeo(), "ceo", { councilScore: 3, ki: "A+" }, "now")).toThrow();
});

it("TGĐ comment yêu cầu Hội đồng điều chỉnh theo nội dung", () => {
  const next = transition(atCeo(), "ceo", "return", { note: "Rà soát lại căn cứ xếp Ki" }, "now");
  expect(next).toMatchObject({ step: "council_adjust", note: "Rà soát lại căn cứ xếp Ki" });
});
