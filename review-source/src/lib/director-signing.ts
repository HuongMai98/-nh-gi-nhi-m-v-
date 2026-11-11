import type { Evaluation } from "./evaluation";
import { buildSigningDossierPdf } from "./evaluation-pdf";
import { createPdfBlob } from "./pdf-runtime";
import template from "@/assets/signing/BM01-template.base64?raw";

export type SigningAttachment = { name: string; blob: Blob };

export function loadSigningTemplate(): SigningAttachment {
  const bytes = Uint8Array.from(atob(template), (character) => character.charCodeAt(0));
  return {
    name: "2025.06.11. BM 01_Phieu giao nhiem vu va danh gia ket qua (2) (1).xlsx",
    blob: new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  };
}

export async function prepareSigningAttachments(evaluations: Evaluation[]): Promise<SigningAttachment[]> {
  const pdf = await createPdfBlob(buildSigningDossierPdf(evaluations));
  return [{ name: "Ho-so-trinh-ky-GD.pdf", blob: pdf }, loadSigningTemplate()];
}

export function downloadSigningAttachment(file: SigningAttachment) {
  const url = URL.createObjectURL(file.blob); const a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
