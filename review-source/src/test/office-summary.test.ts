import { expect, it } from "vitest";
import { EVALUATIONS, officeInSummary, summarizeOffice } from "@/lib/evaluation";

it("Văn phòng thẩm định: phiếu chỉ vào Tổng hợp đánh giá sau khi bấm Tổng hợp", () => {
  const e = { ...EVALUATIONS[0]!, step: "office" as const, officeSummarized: false };
  expect(officeInSummary(e)).toBe(false);
  const done = summarizeOffice(e, "office", "now");
  expect(done.officeSummarized).toBe(true);
  expect(officeInSummary(done)).toBe(true);
  expect(done.history?.at(-1)?.action).toBe("Tổng hợp đánh giá");
  expect(() => summarizeOffice(e, "support_office", "now")).toThrow();
  expect(officeInSummary({ ...e, step: "support" })).toBe(true);
});
