import { MoreVertical, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ExportEvaluationPdf } from "@/components/ExportEvaluationPdf";
import type { Evaluation } from "@/lib/evaluation";
import type { EvaluationPdfMode } from "@/lib/evaluation-pdf";

export function EvaluationExportMenu({ evaluations, mode, onCsv }: { evaluations: Evaluation[]; mode: EvaluationPdfMode; onCsv: () => void }) {
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="icon" aria-label="Xuất file tổng hợp" title="Xuất file"><MoreVertical /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <ExportEvaluationPdf menuItem evaluations={evaluations} mode={mode} />
      <DropdownMenuItem disabled={!evaluations.length} className="gap-2" onSelect={onCsv}><Download className="size-4" />Xuất CSV</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}