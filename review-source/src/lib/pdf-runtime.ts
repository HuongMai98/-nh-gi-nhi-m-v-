import type { TDocumentDefinitions } from "pdfmake/interfaces";
export async function createPdfBlob(definition: TDocumentDefinitions): Promise<Blob> {
  const [{ default: pdfMake }, { default: regular }, { default: bold }] = await Promise.all([
    import("pdfmake/build/pdfmake"), import("@/assets/pdf-fonts/Tinos-Regular.base64?raw"), import("@/assets/pdf-fonts/Tinos-Bold.base64?raw"),
  ]);
  pdfMake.vfs = { "Tinos-Regular.ttf": regular, "Tinos-Bold.ttf": bold };
  pdfMake.fonts = { Tinos: { normal: "Tinos-Regular.ttf", bold: "Tinos-Bold.ttf", italics: "Tinos-Regular.ttf", bolditalics: "Tinos-Bold.ttf" } };
  return new Promise((resolve, reject) => { try { pdfMake.createPdf(definition).getBlob(resolve); } catch (e) { reject(e); } });
}