import { expect, it } from "vitest";
import { assessmentCsvRows } from "@/lib/evaluation-csv";
import { EVALUATIONS } from "@/lib/evaluation";
it("exports the two template header rows and all fourteen assessment columns", () => {
  const e = { ...EVALUATIONS[0]!, reviewAssistant: "Trợ lý thử", reviewRemark: "Ghi chú thử" };
  const rows = assessmentCsvRows([e]);
  expect(rows[0]![0]).toContain("CỦA CHỈ HUY CƠ QUAN TẬP ĐOÀN");
  expect(rows[1]![0]).toContain(e.period);
  expect(rows[3]).toHaveLength(14);
  expect(rows[4]).toHaveLength(14);
  expect(rows[5]).toHaveLength(14);
  expect(rows[5]!.slice(12)).toEqual([e.reviewAssistant, e.reviewRemark]);
  expect(rows[3]).not.toContain("Phản hồi");
});