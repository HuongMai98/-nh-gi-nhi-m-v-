import type { Evaluation } from "./evaluation";
import { buildEvaluationPdf, type EvaluationPdfMode } from "./evaluation-pdf";

type Row = string[];
function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) return value.map(cellText).join("");
  const node = value as Record<string, unknown>;
  if (node['text'] !== undefined) return cellText(node['text']);
  if (Array.isArray(node['stack'])) return node['stack'].map(cellText).join("\n");
  return "";
}
// Use the PDF content itself so headers, groups, totals and scores cannot drift.
export function evaluationCsvRows(evaluations: Evaluation[], mode: EvaluationPdfMode): Row[] {
  const rows: Row[] = [];
  function visit(value: unknown): void {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (value == null) return;
    if (typeof value !== "object") { rows.push([String(value)]); return; }
    const node = value as Record<string, unknown>;
    if (node['table']) {
      const body = (node['table'] as { body: unknown[][] }).body;
      rows.push(...body.map(row => row.map(cellText)));
    } else if (Array.isArray(node['columns'])) {
      rows.push(node['columns'].map(cellText));
    } else if (node['stack']) visit(node['stack']);
    else if (node['text'] !== undefined) rows.push([cellText(node['text'])]);
  }
  visit(buildEvaluationPdf(evaluations, mode).content);
  return rows;
}
export const assessmentCsvRows = (evaluations: Evaluation[]) => evaluationCsvRows(evaluations, "kpi");