import { expect, it } from "vitest";
import { evaluationCsvRows } from "@/lib/evaluation-csv";
import { EVALUATIONS } from "@/lib/evaluation";
it.each(["personal", "kpi", "ki"] as const)("uses the %s PDF headings and data for CSV", mode => {
  const e = { ...EVALUATIONS[0]!, reviewAssistant: "Trợ lý thử", reviewRemark: "Ghi chú thử" };
  const rows = evaluationCsvRows([e], mode);
  expect(rows.flat().join(" ")).toContain(e.owner);
  expect(rows.flat().join(" ")).toContain(e.employeeId);
  if (mode === "personal") {
    expect(rows.flat()).toContain("STT");
    expect(rows.flat()).toContain("3. ĐÁNH GIÁ TUÂN THỦ");
    expect(rows.flat()).toContain("Tổng điểm (Ʃ Tỷ trọng * Điểm)");
    expect(rows.find(row => row[0] === "1" && row.length === 15)).toBeDefined();
  } else if (mode === "kpi") {
    expect(rows[2]).toHaveLength(14);
    expect(rows[3]).toHaveLength(14);
    expect(rows[4]!.slice(12)).toEqual([e.reviewAssistant, e.reviewRemark]);
    expect(rows.flat()).not.toContain("Số người");
  } else {
    expect(rows.flat()).toContain("Số người");
    expect(rows.find(row => row[0] === "TT")).toHaveLength(12);
    expect(rows.flat()).toContain("CHÁNH VĂN PHÒNG\n\n\n\n");
  }
});