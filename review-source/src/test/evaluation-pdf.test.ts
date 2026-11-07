import { mkdirSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import pdfMake from "pdfmake/build/pdfmake";
import regular from "@/assets/pdf-fonts/Tinos-Regular.base64?raw";
import bold from "@/assets/pdf-fonts/Tinos-Bold.base64?raw";
import { buildEvaluationPdf, buildSigningDossierPdf, type EvaluationPdfMode } from "@/lib/evaluation-pdf";
import { EVALUATIONS } from "@/lib/evaluation";

pdfMake.vfs = { "Tinos-Regular.ttf": regular, "Tinos-Bold.ttf": bold };
pdfMake.fonts = { Tinos: { normal: "Tinos-Regular.ttf", bold: "Tinos-Bold.ttf", italics: "Tinos-Regular.ttf", bolditalics: "Tinos-Bold.ttf" } };
it.each(["personal", "kpi", "ki"] as EvaluationPdfMode[])("renders %s as a real PDF with Vietnamese fonts and template data", async mode => {
  const e = EVALUATIONS.find(e => e.step === "ceo")!;
  const definition = buildEvaluationPdf([e], mode);
  expect(definition.pageOrientation).toBe("landscape");
  const content = JSON.stringify(definition.content);
  expect(content).toContain(e.owner);
  expect(content).toContain(e.employeeId);
  expect(content).not.toContain("Nguyễn Văn A");
  if (mode === "kpi") {
    expect(content).toContain("CỦA CHỈ HUY CƠ QUAN TẬP ĐOÀN");
    expect(content).not.toContain("Tỷ lệ xếp loại Ki");
    expect(content).not.toContain("Danh sách chi tiết");
    expect(content).not.toContain("CHÁNH VĂN PHÒNG");
    expect(content).not.toContain("Số người");
    expect(content).not.toContain("PHÊ DUYỆT");
  }
  const buffer = await new Promise<Buffer>(resolve => pdfMake.createPdf(definition).getBuffer(resolve));
  expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  mkdirSync(".test-tmp/pdfs", { recursive: true });
  writeFileSync(`.test-tmp/pdfs/${mode}.pdf`, buffer);
}, 20000);

it("renders many records across pages and rejects an empty export", async () => {
  expect(() => buildEvaluationPdf([], "ki")).toThrow(/Không có dữ liệu/);
  const definition = buildEvaluationPdf(EVALUATIONS, "ki");
  const buffer = await new Promise<Buffer>(resolve => pdfMake.createPdf(definition).getBuffer(resolve));
  expect(buffer.byteLength).toBeGreaterThan(10000);
  writeFileSync(".test-tmp/pdfs/ki-many.pdf", buffer);
}, 20000);

it("builds a signing PDF containing GNV, evaluation and KI from actual records", async () => {
  const e = EVALUATIONS.find(e => e.step === "ceo")!;
  const definition = buildSigningDossierPdf([e]);
  const contents = JSON.stringify(definition.content);
  expect(contents).toContain("PHIẾU GIAO NHIỆM VỤ/CÔNG VIỆC");
  expect(contents).toContain("PHIẾU ĐÁNH GIÁ KẾT QUẢ");
  expect(contents).toContain("TỔNG HỢP KẾT QUẢ");
  expect(contents).toContain(e.owner);
  expect(contents).not.toContain("Nguyễn Văn A");
  const buffer = await new Promise<Buffer>(resolve => pdfMake.createPdf(definition).getBuffer(resolve));
  writeFileSync(".test-tmp/pdfs/signing-dossier.pdf",buffer);
  expect(buffer.subarray(0,5).toString()).toBe("%PDF-");
},20000);