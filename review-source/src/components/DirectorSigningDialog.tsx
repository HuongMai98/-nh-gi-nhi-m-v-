import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEvaluations } from "@/components/evaluation-context";
import { buildEvaluationPdf } from "@/lib/evaluation-pdf";
import { createPdfBlob } from "@/lib/pdf-runtime";
import { downloadSigningAttachment, type SigningAttachment } from "@/lib/director-signing";
import type { Evaluation } from "@/lib/evaluation";

const QUARTERS = ["I", "II", "III", "IV"];
/** Kỳ tới của "Quý III/2026" là "Quý IV/2026"; sau Quý IV là Quý I năm sau. */
export function nextPeriod(period: string): { label: string; year: string; q: number } {
  const [quarter = "I", year = "2026"] = period.replace("Quý ", "").split("/");
  const i = QUARTERS.indexOf(quarter);
  const q = i === 3 ? 1 : i + 2;
  const y = i === 3 ? String(Number(year) + 1) : year;
  return { label: `Quý ${QUARTERS[q - 1]}/${y}`, year: y, q };
}
// shortcut: phiếu GNV kỳ tới suy ra từ phiếu GNV hiện tại; thay bằng API danh sách phiếu giao nhiệm vụ khi tích hợp.
export function nextAssignmentRef(e: Evaluation): string {
  const { year, q } = nextPeriod(e.period);
  const suffix = (e.assignmentRef ?? e.id).split("-").pop();
  return `GNV-${year}-Q${q}-${suffix}`;
}

type Doc = SigningAttachment & { url: string; label: string };

/** Hội đồng trình ký GĐ: xem PDF phiếu đánh giá từng cá nhân + Tổng hợp KI, chọn phiếu GNV kỳ tới rồi gửi. */
export function DirectorSigningDialog({ evaluations, open, onOpenChange, onSubmitted }: {
  evaluations: Evaluation[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: (message: string) => void;
}) {
  const { submitDirectorSigning } = useEvaluations();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const options = useMemo(() => evaluations.map((e) => ({ id: e.id, ref: nextAssignmentRef(e), owner: e.owner, unit: e.unit })), [evaluations]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const key = evaluations.map((e) => e.id).join(",");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const urls: string[] = [];
    setDocs([]); setActive(0); setError(""); setLoading(true);
    setChosen(new Set(options.map((o) => o.ref)));
    (async () => {
      try {
        const specs = [
          ...evaluations.map((e) => ({ name: `Phieu-danh-gia-${e.id}.pdf`, label: `Phiếu đánh giá · ${e.owner}`, def: buildEvaluationPdf([e], "personal") })),
          { name: "Tong-hop-KI.pdf", label: `Tổng hợp KI · ${evaluations.length} cá nhân`, def: buildEvaluationPdf(evaluations, "ki") },
        ];
        const built: Doc[] = [];
        for (const s of specs) {
          const blob = await createPdfBlob(s.def);
          const url = URL.createObjectURL(blob);
          urls.push(url);
          built.push({ name: s.name, label: s.label, blob, url });
        }
        if (!cancelled) setDocs(built);
      } catch (issue) {
        if (!cancelled) setError(issue instanceof Error ? issue.message : "Không tạo được file PDF.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; urls.forEach((u) => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  async function send() {
    setBusy(true); setError("");
    const refs = options.filter((o) => chosen.has(o.ref)).map((o) => o.ref);
    const issue = await submitDirectorSigning(evaluations.map((e) => e.id), {
      files: docs.map(({ name, blob }) => ({ name, blob })),
      note: `Phiếu GNV kỳ tới (${nextPeriod(evaluations[0]!.period).label}): ${refs.join(", ")}`,
    });
    setBusy(false);
    if (issue) { setError(issue); return; }
    onSubmitted(`Đã trình ký GĐ ${evaluations.length} phiếu kèm ${docs.length} file PDF và ${refs.length} phiếu GNV kỳ tới.`);
    onOpenChange(false);
  }

  const current = docs[active];
  const period = evaluations[0] ? nextPeriod(evaluations[0].period).label : "";
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex max-h-[95dvh] w-[calc(100%-2rem)] max-w-[1400px] flex-col gap-0 overflow-hidden bg-card p-0" aria-describedby={undefined}>
      <DialogHeader className="border-b px-6 py-4 pr-12"><DialogTitle>Trình ký GĐ</DialogTitle></DialogHeader>
      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Tài liệu trình ký</h3>
            {loading && <p className="text-sm text-muted-foreground">Đang tạo file PDF…</p>}
            <ul className="space-y-1" aria-label="Tài liệu trình ký">
              {docs.map((d, i) => <li key={d.name} className={"flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm " + (i === active ? "border-primary bg-accent" : "bg-card")}>
                <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setActive(i)} aria-pressed={i === active}>
                  <FileText className="size-4 shrink-0 text-primary" /><span className="min-w-0"><span className="block truncate font-medium">{d.label}</span><span className="block truncate text-xs text-muted-foreground">{d.name}</span></span>
                </button>
                <Button type="button" variant="ghost" size="action" title="Tải xuống" aria-label={`Tải xuống ${d.name}`} onClick={() => downloadSigningAttachment(d)}><Download /></Button>
              </li>)}
            </ul>
          </section>
          <section className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-semibold">Phiếu GNV kỳ tới <span className="font-normal text-muted-foreground">({period})</span></h3>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={chosen.size === options.length} onChange={(event) => setChosen(new Set(event.target.checked ? options.map((o) => o.ref) : []))} />Chọn tất cả</label>
            <ul className="space-y-1.5" aria-label="Phiếu GNV kỳ tới">
              {options.map((o) => <li key={o.ref}><label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5 size-4 accent-primary" aria-label={`Chọn ${o.ref}`} checked={chosen.has(o.ref)} onChange={() => setChosen((c) => { const n = new Set(c); if (n.has(o.ref)) n.delete(o.ref); else n.add(o.ref); return n; })} />
                <span><span className="font-medium">{o.ref}</span><span className="block text-xs text-muted-foreground">{o.owner} · {o.unit}</span></span>
              </label></li>)}
            </ul>
          </section>
        </div>
        <div className="flex min-h-[60vh] flex-col overflow-hidden rounded-lg border bg-muted/40">
          {current ? <iframe title={`Xem ${current.name}`} src={current.url} className="h-full min-h-[60vh] w-full flex-1 bg-card" /> : <p className="m-auto text-sm text-muted-foreground">{loading ? "Đang tạo bản xem trước…" : "Chưa có file để xem."}</p>}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
        {error && <p role="alert" className="mr-auto text-sm text-primary">{error}</p>}
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
        <Button type="button" disabled={busy || loading || !docs.length || !chosen.size} title={!chosen.size ? "Chọn ít nhất một phiếu GNV kỳ tới" : undefined} onClick={() => void send()}><Send />{busy ? "Đang gửi…" : "Gửi trình ký"}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
