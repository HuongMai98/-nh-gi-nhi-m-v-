import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEvaluations } from "@/components/evaluation-context";
import { appendixFileName, buildAppendixPdf, buildKeyTaskAppraisalPdf, keyTaskAppraisalFileName, type KeyTaskItem } from "@/lib/evaluation-pdf";
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

const QUARTER_END = ["03-31", "06-30", "09-30", "12-31"];
// shortcut: nhiệm vụ trọng tâm của phiếu GNV kỳ tới lấy từ nhiệm vụ trọng tâm kỳ này, dời sang ngày của kỳ tới;
// thay bằng nội dung phiếu GNV kỳ tới từ API giao nhiệm vụ khi tích hợp.
export function nextKeyTasks(e: Evaluation): KeyTaskItem[] {
  const { year, q } = nextPeriod(e.period);
  const start = `${year}-${String(q * 3 - 2).padStart(2, "0")}-01`;
  const end = `${year}-${QUARTER_END[q - 1]}`;
  return e.criteria.filter((c) => c.group === "A").map((c) => ({ unit: e.unit, goal: c.goal, kpi: c.kpi, method: c.method, measure: c.unit, weight: c.weight, target: c.target, startDate: start, endDate: end }));
}

/** CQTT trình ký GĐ: xem PDF Phụ lục I / Phụ lục III, chọn phiếu GNV kỳ tới rồi gửi. */
export function DirectorSigningDialog({ evaluations, open, onOpenChange }: {
  evaluations: Evaluation[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { setDirectorSigningDraft } = useEvaluations();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const options = useMemo(() => evaluations.map((e) => ({ id: e.id, ref: nextAssignmentRef(e), owner: e.owner, unit: e.unit })), [evaluations]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const key = evaluations.map((e) => e.id).join(",");
  const [gnvDocs, setGnvDocs] = useState<Doc[]>([]);
  const chosenKey = [...chosen].sort().join(",");
  useEffect(() => {
    if (!open || !evaluations.length) return;
    let cancelled = false;
    const urls: string[] = [];
    const picked = evaluations.filter((e) => chosen.has(nextAssignmentRef(e)));
    const next = nextPeriod(evaluations[0]!.period).label;
    (async () => {
      try {
        const specs = (["co-quan", "don-vi"] as const).flatMap((kind) => {
          const items = picked.filter((e) => (e.block === "Khối Cơ quan") === (kind === "co-quan")).flatMap(nextKeyTasks);
          return items.length ? [{ name: keyTaskAppraisalFileName(kind, next), label: `${kind === "co-quan" ? "Phụ lục II" : "Phụ lục IV"} · Phiếu GNV kỳ tới · ${items.length} nhiệm vụ trọng tâm`, def: buildKeyTaskAppraisalPdf(items, kind, next) }] : [];
        });
        const built: Doc[] = [];
        for (const sp of specs) {
          const blob = await createPdfBlob(sp.def);
          const url = URL.createObjectURL(blob);
          urls.push(url);
          built.push({ name: sp.name, label: sp.label, blob, url });
        }
        if (!cancelled) setGnvDocs(built);
      } catch (issue) {
        if (!cancelled) setError(issue instanceof Error ? issue.message : "Không tạo được PDF phiếu GNV kỳ tới.");
      }
    })();
    return () => { cancelled = true; urls.forEach((u) => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key, chosenKey]);
  const allDocs = [...docs, ...gnvDocs];

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const urls: string[] = [];
    setDocs([]); setActive(0); setError(""); setLoading(true);
    setChosen(new Set(options.map((o) => o.ref)));
    (async () => {
      try {
        // Tờ trình TGĐ kèm Phụ lục I (Khối Cơ quan) và Phụ lục III (Khối Đơn vị) theo mẫu.
        const agencies = evaluations.filter((e) => e.block === "Khối Cơ quan");
        const units = evaluations.filter((e) => e.block !== "Khối Cơ quan");
        const period = evaluations[0]!.period;
        const specs = [
          ...(agencies.length ? [{ name: appendixFileName("co-quan", period), label: `Phụ lục I · Chỉ huy cơ quan · ${agencies.length} cá nhân`, def: buildAppendixPdf(agencies, "co-quan") }] : []),
          ...(units.length ? [{ name: appendixFileName("don-vi", period), label: `Phụ lục III · Chỉ huy đơn vị · ${units.length} cá nhân`, def: buildAppendixPdf(units, "don-vi") }] : []),
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

  function openDraft() {
    setDirectorSigningDraft({
      ids: evaluations.map((e) => e.id),
      files: allDocs.map(({ name, blob }) => ({ name, blob })),
      refs: options.filter((o) => chosen.has(o.ref)).map((o) => o.ref),
      period: evaluations[0]!.period,
    });
    onOpenChange(false);
    void navigate({ to: "/soan-trinh-ky-gd" });
  }

  const current = allDocs[Math.min(active, allDocs.length - 1)];
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
              {allDocs.map((d, i) => <li key={d.name} className={"flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm " + (d === current ? "border-primary bg-accent" : "bg-card")}>
                <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setActive(i)} aria-pressed={d === current}>
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
        <Button type="button" disabled={loading || !docs.length || !chosen.size} title={!chosen.size ? "Chọn ít nhất một phiếu GNV kỳ tới" : undefined} onClick={openDraft}><Send />Gửi trình ký</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
