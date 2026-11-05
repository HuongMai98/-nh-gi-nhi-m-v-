import { ExportEvaluationPdf } from "@/components/ExportEvaluationPdf";
import { STAGES, returnLabel, type StageKey } from "@/lib/workflow";
import { Check, Copy, Download, Save, Send, Undo2 } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AssessmentSummary } from "@/components/AssessmentSummary";
import { Button } from "@/components/ui/button";
import { useEvaluations } from "@/components/evaluation-context";
import {
  cqttTotal,
  councilAutoKi,
  councilCopyFromCqtt,
  councilKiDraft,
  KI_SCORE_RANGES,
  groupScore,
  templateResult,
  rating,
  kiError,
  type Evaluation,
  type Draft,
  type Ki,
} from "@/lib/evaluation";

export const fieldClass =
  "h-9 rounded-md border border-input bg-card px-2 text-sm disabled:bg-muted disabled:text-muted-foreground";
const number = (v: number | undefined | null) => (v == null ? "—" : v.toFixed(2));
const KI: Ki[] = ["A+", "A", "B", "C", "D", "K"];
export const LABOR = [
  "Tuân thủ",
  "Vi phạm nhưng chưa đến mức bị xử lý kỷ luật",
  "Bị xử lý kỷ luật lao động",
];
export function exportCsv(name: string, rows: (string | number | null | undefined)[][]) {
  const csv =
    "\ufeff" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value ?? "");
            if (/^[=+@-]/.test(text)) text = "'" + text;
            return '"' + text.replaceAll('"', '""') + '"';
          })
          .join(","),
      )
      .join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name + ".csv";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Màu nhận diện mức Ki (dùng chung cho thẻ, thanh phân bố, nhãn). */
const KI_TONES = [
  { ki: "A+", label: "Vượt xa yêu cầu", badge: "bg-emerald-600 text-white", bar: "bg-emerald-500", text: "text-emerald-600", card: "border-emerald-200 bg-emerald-50/60" },
  { ki: "A", label: "Vượt yêu cầu", badge: "bg-blue-600 text-white", bar: "bg-blue-500", text: "text-blue-600", card: "border-blue-200 bg-blue-50/60" },
  { ki: "B", label: "Đạt yêu cầu", badge: "bg-violet-600 text-white", bar: "bg-violet-500", text: "text-violet-600", card: "border-violet-200 bg-violet-50/60" },
  { ki: "C", label: "Gần đạt yêu cầu", badge: "bg-amber-500 text-white", bar: "bg-amber-500", text: "text-amber-600", card: "border-amber-200 bg-amber-50/60" },
  { ki: "D", label: "Không đạt yêu cầu", badge: "bg-rose-600 text-white", bar: "bg-rose-500", text: "text-rose-600", card: "border-rose-200 bg-rose-50/60" },
  { ki: "K", label: "Không đánh giá", badge: "bg-slate-500 text-white", bar: "bg-slate-400", text: "text-slate-600", card: "border-slate-200 bg-slate-50" },
] as const;
export function AggregateForm({
  allowPdfExport = true,
  evaluations,
  mode,
  onDraftChange,
  batchCandidates,
  onCouncilSummary,
  onCqttReturned,
}: {
  allowPdfExport?: boolean;
  onCqttReturned?: ((count: number) => void) | undefined;
  onCouncilSummary?: (() => void) | undefined;
  batchCandidates?: Evaluation[] | undefined;
  onDraftChange?: ((draft: Draft) => void) | undefined;
  evaluations: Evaluation[];
  mode: "kpi" | "ki" | "appendix";
}) {
  const { previewRole, saveCouncilBatch, processCeoBatch, workflows } = useEvaluations();
  // Nhánh TGĐ theo cấu hình luồng duyệt của các khối đang hiển thị.
  const ceoBlocks = [...new Set(evaluations.map((e) => e.block))];
  const ceoTargets = ceoBlocks.length
    ? ceoBlocks.map((b) => workflows[b].stages.find((s) => s.key === "ceo")?.returnTo ?? []).reduce((a, l) => a.filter((x) => l.includes(x)))
    : [];
  const ceoReturnOn = ceoTargets.length > 0;
  const [ceoReturnStage, setCeoReturnStage] = useState<StageKey | "">("");
  const ceoChosen = ceoTargets.includes(ceoReturnStage as StageKey) ? (ceoReturnStage as StageKey) : ceoTargets[0];
  const ceoReturnText = ceoTargets.length === 1 && ceoBlocks[0] ? returnLabel(ceoBlocks[0], "ceo", ceoTargets[0]!) : "Trả về / yêu cầu điều chỉnh";
  const ceoAdjustOn = ceoBlocks.some((b) => workflows[b].branches.ceoDirectAdjust);
  const [councilDrafts, setCouncilDrafts] = useState<Record<string, Draft>>({});
  const [ceoReturnOpen, setCeoReturnOpen] = useState(false);
  const [ceoReason, setCeoReason] = useState("");
  const [batchMessage, setBatchMessage] = useState("");
  const title =
    mode === "kpi"
      ? "Tổng hợp đánh giá"
      : mode === "ki"
        ? "Tổng hợp kết quả đánh giá và xếp hạng KI"
        : "Phụ lục Kết quả";
  const isKpi = mode === "kpi";
  // Tổng hợp KI sử dụng điểm Hội đồng đã chấm ở chi tiết công việc.
  const hideCqtt = mode === "ki" || previewRole === "ceo";
  const summaryRecords = evaluations.map((e) => ({ ...e, ...councilDrafts[e.id], ...(mode === "ki" ? { councilReviewed: true } : {}) }));
  const counts = KI.map((ki) => ({
    ki,
    n: summaryRecords.filter((e) => templateResult(e).ki === ki).length,
  }));
  const classified = counts.reduce((sum, c) => sum + c.n, 0);
  const denominator = counts.filter((c) => c.ki !== "K").reduce((n, c) => n + c.n, 0);
  function exportData() {
    exportCsv(title, [
      isKpi
        ? [
            "TT",
            "Mã nhân viên",
            "Họ và tên",
            "Đơn vị",
            "Tự ĐG trọng tâm",
            "Tự ĐG chức năng",
            "Tổng tự ĐG",
            "CQTT trọng tâm",
            "CQTT chức năng",
            "Tổng CQTT",
            "Lý do",
            "Đề xuất xếp hạng Ki",
            "Phản hồi",
          ]
        : [
            "Mã nhân viên",
            "Họ tên",
            "Chức danh",
            "Đơn vị",
            ...(hideCqtt ? [] : ["Điểm CQTT"]),
            "Điểm đánh giá",
            "Xếp loại",
            "Địa điểm làm việc",
            "Nội quy",
            "Xếp hạng Ki",
            "Mức độ hoàn thành",
          ],
      ...evaluations.map((e, index) => {
        const result = templateResult(e);
        return isKpi
          ? [
              index + 1,
              e.employeeId,
              e.owner,
              e.unit,
              groupScore(e, true),
              groupScore(e, false),
              groupScore(e, true) + groupScore(e, false),
              e.cqttKey,
              e.cqttFunction,
              cqttTotal(e),
              e.note,
              e.proposedKi,
              e.responseNote,
            ]
          : [
              e.employeeId,
              e.owner,
              e.jobTitle,
              e.unit,
              ...(hideCqtt ? [] : [cqttTotal(e)]),
              result.score,
              result.rating,
              e.locationCompliance,
              e.laborCompliance,
              result.ki,
              result.completion,
            ];
      }),
    ]);
  }
  if (isKpi)
    return (
      <AssessmentSummary
        key={previewRole}
        onCouncilSummary={onCouncilSummary}
        onCqttReturned={onCqttReturned}
        batchCandidates={batchCandidates}
        evaluations={evaluations}
        allowPdfExport={allowPdfExport}
        onExport={exportData}
        onDraftChange={onDraftChange}
      />
    );
  return (
    <section className="space-y-4" aria-label={title}>
      <div className="space-y-3">
      <div className={"flex flex-wrap items-center justify-between gap-3" + (mode === "ki" ? " sticky z-30 bg-card py-2 " + (previewRole === "council" ? "top-14" : "top-0") : "")}>
        <div className="min-w-0 flex-1 basis-40">
          <h2 className="font-semibold">{title}</h2>
          {isKpi && <p className="mt-1 truncate text-xs text-muted-foreground">{"Điểm nhóm là phần điểm đã nhân tỷ trọng theo phiếu giao nhiệm vụ. CQTT chấm trên bảng tổng hợp."}</p>}
        </div>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">{allowPdfExport && <ExportEvaluationPdf evaluations={summaryRecords} mode="ki" />}<Button variant="outline" onClick={exportData}><Download />Xuất CSV</Button>{mode === "ki" && previewRole === "council" && <Button disabled={!evaluations.length || evaluations.some((e) => !["council", "council_adjust"].includes(e.step))} onClick={() => {
          const issue = saveCouncilBatch(evaluations.map((e) => e.id), {}, true);
          setBatchMessage(issue ?? "Đã gửi tất cả đánh giá lên TGĐ.");
          if (!issue) setCouncilDrafts({});
        }}><Send />Gửi TGĐ</Button>}{mode === "ki" && previewRole === "ceo" && <>{ceoAdjustOn && <Button variant="outline" disabled={!evaluations.some((e) => e.step === "ceo")} onClick={() => {
          const issue = processCeoBatch(evaluations.filter((e) => e.step === "ceo").map((e) => e.id), "save", "", councilDrafts);
          setBatchMessage(issue ?? "Đã lưu tất cả điều chỉnh của TGĐ.");
          if (!issue) setCouncilDrafts({});
        }}><Save />Lưu tất cả</Button>}{ceoReturnOn && <Button variant="return" disabled={!evaluations.length || evaluations.some((e) => e.step !== "ceo")} onClick={() => setCeoReturnOpen((open) => !open)}><Undo2 />{ceoReturnText}</Button>}<Button disabled={!evaluations.length || evaluations.some((e) => e.step !== "ceo")} onClick={() => { const issue = processCeoBatch(evaluations.map((e) => e.id), "approve", "", councilDrafts); setBatchMessage(issue ?? "Đã phê duyệt kết quả."); if (!issue) setCouncilDrafts({}); }}><Check />Phê duyệt</Button></>}</div>
      </div>
      {previewRole === "ceo" && ceoReturnOpen && <div className="space-y-3 rounded-lg border bg-muted/30 p-4">{ceoTargets.length > 1 && <label className="block space-y-2 text-sm font-medium">Trả về bước<select aria-label="Trả về bước" className="block h-9 w-64 rounded-md border bg-card px-2 text-sm font-normal" value={ceoChosen} onChange={(e) => setCeoReturnStage(e.target.value as StageKey)}>{ceoTargets.map((k) => <option key={k} value={k}>{STAGES[k].name}</option>)}</select></label>}<label className="block space-y-2 text-sm font-medium">{ceoChosen === "council" ? "Nội dung yêu cầu Hội đồng điều chỉnh" : "Lý do trả về"}<textarea aria-label="Yêu cầu điều chỉnh của TGĐ" className="block min-h-20 w-full rounded-md border bg-card p-2 text-sm font-normal" value={ceoReason} onChange={(e) => setCeoReason(e.target.value)} /></label><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCeoReturnOpen(false)}>Hủy</Button><Button disabled={!ceoReason.trim() || !evaluations.length || evaluations.some((e) => e.step !== "ceo")} onClick={() => { const issue = processCeoBatch(evaluations.map((e) => e.id), "return", ceoReason, undefined, ceoChosen); setBatchMessage(issue ?? "Đã gửi Hội đồng điều chỉnh."); if (!issue) { setCeoReturnOpen(false); setCeoReason(""); } }}>Gửi điều chỉnh</Button></div></div>}
      {batchMessage && <p role="status" className="text-sm">{batchMessage}</p>}
      {!isKpi && <section aria-label="Phân bố xếp hạng Ki" className="rounded-xl border bg-card p-3 shadow-sm 2xl:p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h3 className="text-sm font-semibold">Phân bố xếp hạng Ki</h3>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Tổng <b className="tabular-nums text-foreground">{evaluations.length}</b></span>
          </div>
          <span className="ml-auto text-[11px] text-muted-foreground">Tỷ lệ tính trên số cá nhân có Ki (không gồm K)</span>
        </div>
        {/* Thanh phân bố tổng: mỗi đoạn là tỷ lệ một mức Ki. */}
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={"Tỷ lệ Ki: " + KI_TONES.filter((x) => x.ki !== "K").map((x) => x.ki + " " + (denominator ? Math.round((counts.find((c) => c.ki === x.ki)?.n ?? 0) / denominator * 100) : 0) + "%").join(", ")}>
          {KI_TONES.filter((x) => x.ki !== "K").map((x) => {
            const n = counts.find((c) => c.ki === x.ki)?.n ?? 0;
            return n && denominator ? <div key={x.ki} className={"h-full transition-[width] first:rounded-l-full last:rounded-r-full " + x.bar} style={{ width: (n / denominator) * 100 + "%" }} title={`${x.ki}: ${Math.round((n / denominator) * 100)}%`} /> : null;
          })}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-6 2xl:gap-3">
          {counts.map((c) => {
            const percent = c.ki === "K" || !denominator ? 0 : Math.round(c.n / denominator * 100);
            const tone = KI_TONES.find((x) => x.ki === c.ki)!;
            const active = c.n > 0;
            return <div key={c.ki} className={"relative overflow-hidden rounded-lg border px-3 py-2.5 transition-colors " + (active ? tone.card : "bg-card opacity-70")}>
              <span aria-hidden className={"absolute inset-y-0 left-0 w-1 " + (active ? tone.bar : "bg-transparent")} />
              <div className="flex items-center justify-between gap-2">
                <span className={"inline-flex min-w-9 justify-center rounded-md px-2 py-0.5 text-sm font-bold " + tone.badge}>{c.ki}</span>
                <span className="truncate text-[11px] font-medium text-muted-foreground" title={tone.label}>{tone.label}</span>
              </div>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="flex flex-col leading-none">
                  <span className={"text-2xl font-bold tabular-nums 2xl:text-3xl " + (active ? tone.text : "text-muted-foreground")}>{c.ki === "K" ? "—" : percent}<span className="ml-0.5 text-sm font-semibold">{c.ki === "K" ? "" : "%"}</span></span>
                  <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">tỷ lệ</span>
                </span>
                <span className="flex flex-col items-end leading-none">
                  <strong data-testid={`ki-count-${c.ki}`} className={"text-2xl font-bold tabular-nums 2xl:text-3xl " + (active ? "text-foreground" : "text-muted-foreground")}>{c.n}</strong>
                  <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">cá nhân</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5"><div className={"h-full rounded-full transition-[width] " + tone.bar} style={{ width: (c.ki === "K" ? 0 : percent) + "%" }} /></div>
            </div>;
          })}
        </div>
      </section>}
      </div>
      {mode === "ki" && previewRole === "council" && (
        <div aria-label="Thống kê phiếu" className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {([["Cơ quan", evaluations.filter((e) => e.block === "Khối Cơ quan").length], ["Đơn vị", evaluations.filter((e) => e.block === "Khối Đơn vị").length], ["Tổng", evaluations.length]] as const).map(([label, count]) => <span key={label} className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-1">{label}<b className="font-semibold tabular-nums text-foreground">{count}</b>phiếu</span>)}
          <span className="text-border">|</span>
          <span>Hội đồng đã chấm <b className="tabular-nums text-foreground">{evaluations.filter((e) => e.councilReviewed).length}/{evaluations.length}</b></span>
        </div>
      )}
      <div className={mode === "ki" ? "relative isolate max-h-[calc(100dvh-8rem)] overflow-auto rounded-lg border" : "overflow-x-auto rounded-lg border"}>
        <table className={"w-full text-left text-sm " + (mode === "ki" ? "min-w-[1100px]" : "min-w-[1320px]")}>
          <thead className={mode === "ki" ? "sticky top-0 z-20 bg-muted" : "bg-muted"}>
            <tr>
              {(isKpi
                ? [
                    "Mã nhân viên",
                    "Họ và tên",
                    "Đơn vị",
                    "Chức danh",
                    "Tự ĐG trọng tâm",
                    "Tự ĐG chức năng",
                    "Tổng tự ĐG",
                    "CQTT trọng tâm",
                    "CQTT chức năng",
                    "Tổng CQTT",
                    "Góp ý / Phản hồi",
                    "Thao tác",
                  ]
                : [
                    "Mã nhân viên",
                    "Họ và tên",
                    "Đơn vị",
                    "Chức danh",
                    ...(hideCqtt ? [] : ["Điểm CQTT"]),
                    "Điểm đánh giá",
                    "Xếp loại",
                    "Tuân thủ địa điểm",
                    "Tuân thủ nội quy",
                    "Xếp hạng Ki",
                    "Hoàn thành / Kiểm tra",
                    "Thao tác",
                  ]
              ).map((h) => (
                <th className={(mode === "ki" ? "px-2 py-2.5 leading-tight 2xl:py-3" : "px-3 py-3") + " whitespace-nowrap font-medium"} key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {evaluations.map((e) => (
              <AggregateRow
                key={`${mode}-${e.id}-${e.updated}-${e.step}-${e.history?.length ?? 0}`}
                evaluation={e}
                mode={mode}
                onDraftChange={(draft) => { setCouncilDrafts((current) => ({ ...current, [e.id]: draft })); onDraftChange?.(draft); }}
              />
            ))}
            {!evaluations.length && (
              <tr>
                <td colSpan={12} className="p-8 text-center text-muted-foreground">
                  Không có hồ sơ phù hợp
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function AggregateRow({
  evaluation: e,
  mode,
  onDraftChange,
}: {
  onDraftChange?: ((draft: Draft) => void) | undefined;
  evaluation: Evaluation;
  mode: "kpi" | "ki" | "appendix";
}) {
  const { previewRole, updateEvaluation, workflows } = useEvaluations();
  const isKpi = mode === "kpi";
  const editable = isKpi
    ? previewRole === "cqtt" && e.step === "cqtt"
    : mode === "ki" && previewRole === "ceo" && e.step === "ceo" && workflows[e.block].branches.ceoDirectAdjust;
  const [draft, setDraft] = useState<Draft>({});
  const [error, setError] = useState("");
  const [kiDriven, setKiDriven] = useState(false);
  const change = (patch: Draft) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onDraftChange?.(next);
  };
  const current = { ...e, ...draft, ...(mode === "ki" ? { councilReviewed: true } : {}) };
  const councilTotalReadOnly = mode === "ki" && previewRole === "council";
  const result = templateResult(current);
  const numeric = (key: "cqttKey" | "cqttFunction" | "councilScore", label: string) => councilTotalReadOnly
    ? <span aria-label={`${label} ${e.id}`} className="font-medium tabular-nums">{number(current[key])}</span> : (
    <input
      aria-label={`${label} ${e.id}`}
      className={fieldClass + (mode === "ki" ? " w-20" : " w-24")}
      type="number"
      step="0.01"
      min={key === "councilScore" ? kiDriven && current.ki && current.ki !== "K" ? KI_SCORE_RANGES[current.ki].min : 1 : 0}
      max={key === "councilScore" && kiDriven && current.ki && current.ki !== "K" ? KI_SCORE_RANGES[current.ki].max : 5}
      disabled={!editable}
      readOnly={key === "councilScore" && councilTotalReadOnly}
      value={current[key] ?? ""}
      onChange={(event) => {
        if (key === "councilScore" && councilTotalReadOnly) return;
        const value = event.target.value === "" ? undefined : Number(event.target.value);
        if (key === "councilScore") setKiDriven(false);
        setError("");
        change(key === "councilScore" ? { councilScore: value, ki: councilAutoKi({ ...current, councilScore: value }) } : { [key]: value });
      }}
    />
  );
  const choose = (
    key: "ki" | "locationCompliance" | "laborCompliance",
    choices: string[],
    label: string,
  ) => councilTotalReadOnly ? <span aria-label={`${label} ${e.id}`}>{current[key] || "—"}</span> : (
    <select
      aria-label={`${label} ${e.id}`}
      disabled={!editable}
      className={fieldClass + (key === "laborCompliance" ? " w-36" : key === "ki" ? " w-20 2xl:w-24" : " w-28 2xl:w-32")}
      value={current[key] ?? ""}
      onChange={(event) => {
        const value = event.target.value;
        if (key === "ki") { setKiDriven(!councilTotalReadOnly && !!value); setError(""); change(councilTotalReadOnly ? { ki: value ? value as Ki : undefined } : value ? councilKiDraft(value as Ki) : { ki: undefined }); return; }
        setKiDriven(false);
        const patch = { [key]: value };
        change({ ...patch, ki: councilAutoKi({ ...current, ...patch }) });
      }}
    >
      <option value="">Chọn</option>
      {choices.map((choice) => (
        <option key={choice}>{choice}</option>
      ))}
    </select>
  );
  const cell = mode === "ki" ? "px-2 py-2.5 align-top 2xl:py-3" : "px-3 py-3 align-top";
  return (
    <tr className="border-t">
      <td className={cell + " tabular-nums"}>{e.employeeId ?? "—"}</td>
      <td className={cell + " min-w-36"}>
        <Link
          to="/danh-gia/$id"
          params={{ id: e.id }}
          className="font-medium text-primary hover:underline"
        >
          {e.owner}
        </Link>
      </td>
      <td className={cell + " min-w-40"}>{e.unit}</td>
      <td className={cell + " whitespace-nowrap"}>{e.jobTitle ?? "—"}</td>
      {isKpi ? (
        <>
          <td className={cell}>{number(groupScore(e, true))}</td>
          <td className={cell}>{number(groupScore(e, false))}</td>
          <td className={cell}>{number(groupScore(e, true) + groupScore(e, false))}</td>
          <td className={cell}>{numeric("cqttKey", "Điểm CQTT trọng tâm")}</td>
          <td className={cell}>{numeric("cqttFunction", "Điểm CQTT chức năng")}</td>
          <td className={cell}>{number(cqttTotal(current))}</td>
          <td className={cell}>
            <textarea
              aria-label={`Góp ý CQTT ${e.id}`}
              disabled={!editable}
              className={fieldClass + " h-20 w-60"}
              value={current.note ?? ""}
              onChange={(event) => change({ note: event.target.value })}
            />
            <div className="mt-2 text-xs">
              {e.response ? `${e.response}: ${e.responseNote}` : "Chưa có phản hồi"}
            </div>
          </td>
        </>
      ) : (
        <>
          {mode !== "ki" && previewRole !== "ceo" && <td className={cell}>{number(cqttTotal(e))}</td>}
          <td className={cell}>
            <div className="flex items-center gap-1">
              {numeric("councilScore", "Điểm đánh giá")}
              {editable && mode !== "ki" && previewRole !== "ceo" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  title="Sao chép Điểm CQTT"
                  aria-label={`Sao chép điểm CQTT ${e.id}`}
                  disabled={cqttTotal(e) === null}
                  onClick={() => {
                    setKiDriven(false);
                    setError("");
                    change(councilCopyFromCqtt(e));
                  }}
                >
                  <Copy />
                </Button>
              )}
            </div>
          </td>
          <td className={cell + " whitespace-nowrap"}>{result.rating}</td>
          <td className={cell}>
            {choose("locationCompliance", ["Tuân thủ", "Không tuân thủ"], "Tuân thủ địa điểm")}
          </td>
          <td className={cell}>{choose("laborCompliance", LABOR, "Tuân thủ nội quy")}</td>
          <td className={cell}>{choose("ki", KI, "Xếp Ki")}{current.ki && current.ki !== "K" && <p className="mt-1 text-xs text-muted-foreground">{KI_SCORE_RANGES[current.ki].min.toFixed(2)}–{KI_SCORE_RANGES[current.ki].max.toFixed(2)} điểm</p>}{current.ki === "K" && <p className="mt-1 text-xs text-muted-foreground">Không đánh giá</p>}</td>
          <td className={cell}>
            <div className="whitespace-nowrap">{result.completion}</div>
            {["council", "council_adjust", "ceo"].includes(e.step) && (
              <p className="mt-1 text-xs text-primary">{current.ki || Object.keys(draft).length ? kiError(current) : ""}</p>
            )}
          </td>
        </>
      )}
      <td className={cell}>
        {editable && (
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            title="Lưu"
            aria-label={`Lưu ${e.id}`}
            onClick={() => {
              if (kiDriven && current.ki && current.ki !== "K") {
                const range = KI_SCORE_RANGES[current.ki];
                if (current.councilScore === undefined || current.councilScore < range.min || current.councilScore > range.max) { setError(`Điểm Ki ${current.ki} phải trong khoảng ${range.min}–${range.max}.`); return; }
              }
              // Lưu cả khi giữ nguyên giá trị điền sẵn: Hội đồng bấm Lưu là đã chấm (giống Lưu tất cả).
              const issue = updateEvaluation(e.id, previewRole === "council" ? { ...draft, ki: current.ki } : draft);
              setError(issue ?? "Đã lưu");
            }}
          >
            <Save />
          </Button>
        )}
        <Link to="/danh-gia/$id" params={{ id: e.id }} className="mt-2 block whitespace-nowrap text-xs text-primary">
          Mở hồ sơ
        </Link>
        {error && (
          <p role="status" className="mt-2 text-xs">
            {error}
          </p>
        )}
      </td>
    </tr>
  );
}
