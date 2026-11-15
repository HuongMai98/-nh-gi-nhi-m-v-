import { expect, it } from "vitest";
import { EVALUATIONS, allocatedTotal, saveDraft, transition } from "@/lib/evaluation";

const atCeo = () => structuredClone(EVALUATIONS.find((x) => x.step === "ceo")!);

it("GĐ ký theo kết quả CQTT, không được điều chỉnh điểm trực tiếp", () => {
 const e=atCeo(); expect(() => saveDraft(e,"ceo",{councilScore:4.6,ki:"A+"},"now")).toThrow();
 const approved=transition(e,"ceo","approve",{},"now");
 expect(approved).toMatchObject({step:"done",approvedScore:e.councilScore,approvedKi:e.ki});
});

it("TGĐ không được điều chỉnh trái điều kiện Ki", () => {
  expect(() => saveDraft(atCeo(), "ceo", { councilScore: 3, ki: "A+" }, "now")).toThrow();
});

it("TGĐ comment yêu cầu CQTT điều chỉnh theo nội dung", () => {
  const next = transition(atCeo(), "ceo", "return", { note: "Rà soát lại căn cứ xếp Ki" }, "now");
  expect(next).toMatchObject({ step: "council", note: "Rà soát lại căn cứ xếp Ki" });
});
