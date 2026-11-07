import type { Evaluation } from "./evaluation";
import { buildSigningDossierPdf } from "./evaluation-pdf";
import { createPdfBlob } from "./pdf-runtime";
export type SigningAttachment = { name: string; blob: Blob };
export async function prepareSigningAttachments(evaluations: Evaluation[]): Promise<SigningAttachment[]> {
  const [pdf, { default: template }] = await Promise.all([createPdfBlob(buildSigningDossierPdf(evaluations)), import("@/assets/signing/BM01-template.base64?raw")]);
  const bytes = Uint8Array.from(atob(template), c => c.charCodeAt(0));
  return [
    { name: "Ho-so-trinh-ky-GD.pdf", blob: pdf },
    { name: "2025.06.11. BM 01_Phieu giao nhiem vu va danh gia ket qua (2) (1).xlsx", blob: new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }) },
  ];
}
export function downloadSigningAttachment(file: SigningAttachment) {
  const url = URL.createObjectURL(file.blob); const a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}