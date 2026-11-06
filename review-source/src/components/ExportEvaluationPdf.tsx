import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildEvaluationPdf, type EvaluationPdfMode } from "@/lib/evaluation-pdf";
import type { Evaluation } from "@/lib/evaluation";

export function ExportEvaluationPdf({ evaluations, mode, menuItem = false }: { evaluations: Evaluation[]; mode: EvaluationPdfMode; menuItem?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setBusy(true); setError("");
    try {
      const [{ default: pdfMake }, { default: regular }, { default: bold }] = await Promise.all([
        import("pdfmake/build/pdfmake"), import("@/assets/pdf-fonts/Tinos-Regular.base64?raw"), import("@/assets/pdf-fonts/Tinos-Bold.base64?raw"),
      ]);
      pdfMake.vfs = { "Tinos-Regular.ttf": regular, "Tinos-Bold.ttf": bold };
      pdfMake.fonts = { Tinos: { normal: "Tinos-Regular.ttf", bold: "Tinos-Bold.ttf", italics: "Tinos-Regular.ttf", bolditalics: "Tinos-Bold.ttf" } };
      const definition = buildEvaluationPdf(evaluations, mode);
      const filename = `${mode === "personal" ? "Phieu-danh-gia" : mode === "ki" ? "Tong-hop-Ki" : "Tong-hop-danh-gia"}-${evaluations.length === 1 ? evaluations[0]!.id : "danh-sach"}.pdf`;
      await new Promise<void>((resolve, reject) => {
        try { pdfMake.createPdf(definition).getBlob(blob => {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
          setTimeout(() => URL.revokeObjectURL(url), 10000); resolve();
        }); } catch (issue) { reject(issue); }
      });
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Không xuất được PDF."); }
    finally { setBusy(false); }
  }
  if (menuItem) return <><DropdownMenuItem disabled={busy || !evaluations.length} onSelect={event => { event.preventDefault(); void download(); }} className="gap-2"><FileDown className="size-4" />{busy ? "Đang xuất PDF…" : "Xuất PDF"}</DropdownMenuItem>{error && <p role="alert" className="max-w-64 px-2 py-1 text-xs text-primary">{error}</p>}</>;
  return <span className="inline-flex flex-wrap items-center gap-2"><Button type="button" variant="outline" disabled={busy || !evaluations.length} onClick={() => void download()}><FileDown />{busy ? "Đang xuất PDF…" : "Xuất PDF"}</Button>{error && <span role="alert" className="text-xs text-primary">{error}</span>}</span>;
}
