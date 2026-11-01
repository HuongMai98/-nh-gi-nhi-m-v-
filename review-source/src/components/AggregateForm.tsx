import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AssessmentSummary } from "@/components/AssessmentSummary";
import { Button } from "@/components/ui/button";
import { useEvaluations } from "@/components/evaluation-context";
import {
  cqttTotal,
  councilAutoKi,
  councilKiDraft,
  KI_SCORE_RANGES,
  groupScore,
  templateResult,
  rating,
  kiError,
  appendixFor,
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
export function AggregateForm({
  evaluations,
  mode,
  onDraftChange,
  batchCandidates,
  onCouncilSummary,
}: {
  onCouncilSummary?: (() => void) | undefined;
  batchCandidates?: Evaluation[] | undefined;
  onDraftChange?: ((draft: Draft) => void) | undefined;
  evaluations: Evaluation[];
  mode: "kpi" | "ki" | "appendix";
}) {
  const { previewRole, saveCouncilBatch, processCeoBatch } = useEvaluations();
  const [councilDrafts, setCouncilDrafts] = useState<Record<string, Draft>>({});
  const [ceoReturnOpen, setCeoReturnOpen] = useState(false);
  const [ceoReason, setCeoReason] = useState("");
  const [batchMessage, setBatchMessage] = useState("");
  const title =
    mode === "kpi"
      ? "Tổng hợp đánh giá"
      : mode === "ki"
        ? "Tổng hợp KPI — BM01"
        : "Phụ lục kết quả theo khối";
  const isKpi = mode === "kpi";
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
            "Mã số",
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
            "Trợ lý",
            "Ghi chú",
            "Phản hồi",
          ]
        : [
            "Mã nhân viên",
            "Họ tên",
            "Chức danh",
            "Đơn vị",
            "Điểm CQTT",
            "Điểm đánh giá",
            "Xếp loại",
            "Địa điểm làm việc",
            "Nội quy",
            "Ki",
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
              e.reviewAssistant,
              e.reviewRemark,
              e.responseNote,
            ]
          : [
              e.employeeId,
              e.owner,
              e.jobTitle,
              e.unit,
              cqttTotal(e),
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
        batchCandidates={batchCandidates}
        evaluations={evaluations}
        onExport={exportData}
        onDraftChange={onDraftChange}
      />
    );
  return (
    <section className="space-y-4" aria-label={title}>
      <div className={mode === "ki" ? "sticky top-14 z-30 space-y-4 bg-card pb-1" : "space-y-4"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {isKpi
              ? "Điểm nhóm là phần điểm đã nhân tỷ trọng theo phiếu giao nhiệm vụ. CQTT chấm trên bảng tổng hợp."
              : "Hội đồng kế thừa điểm CQTT và chỉnh tổng điểm tại đây. Template cá nhân tự phân bổ điểm theo tỷ lệ tự đánh giá, giới hạn 1–5 và khớp tổng theo tỷ trọng."}
          </p>
        </div>
        <div className="flex items-center gap-2"><Button variant="outline" onClick={exportData}>Xuất CSV</Button>{mode === "ki" && previewRole === "council" && <Button disabled={!evaluations.some((e) => ["council", "council_adjust"].includes(e.step))} onClick={() => {
          const ids = evaluations.filter((e) => ["council", "council_adjust"].includes(e.step)).map((e) => e.id);
          const issue = saveCouncilBatch(ids, councilDrafts);
          setBatchMessage(issue ?? "Đã lưu tất cả đánh giá.");
          if (!issue) setCouncilDrafts({});
        }}>Lưu tất cả</Button>}{mode === "ki" && previewRole === "council" && <Button disabled={!evaluations.length || evaluations.some((e) => !["council", "council_adjust"].includes(e.step))} onClick={() => {
          const issue = saveCouncilBatch(evaluations.map((e) => e.id), councilDrafts, true);
          setBatchMessage(issue ?? "Đã gửi tất cả đánh giá lên TGĐ.");
          if (!issue) setCouncilDrafts({});
        }}>Gửi TGĐ</Button>}{mode === "ki" && previewRole === "ceo" && <><Button variant="outline" disabled={!evaluations.length || evaluations.some((e) => e.step !== "ceo")} onClick={() => setCeoReturnOpen((open) => !open)}>Yêu cầu Hội đồng điều chỉnh</Button><Button disabled={!evaluations.length || evaluations.some((e) => e.step !== "ceo")} onClick={() => { const issue = processCeoBatch(evaluations.map((e) => e.id), "approve", ""); setBatchMessage(issue ?? "Đã phê duyệt kết quả."); }}>Phê duyệt</Button></>}</div>
      </div>
      {previewRole === "ceo" && ceoReturnOpen && <div className="space-y-3 rounded-lg border bg-muted/30 p-4"><label className="block space-y-2 text-sm font-medium">Nội dung yêu cầu Hội đồng điều chỉnh<textarea aria-label="Yêu cầu điều chỉnh của TGĐ" className="block min-h-20 w-full rounded-md border bg-card p-2 text-sm font-normal" value={ceoReason} onChange={(e) => setCeoReason(e.target.value)} /></label><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCeoReturnOpen(false)}>Hủy</Button><Button disabled={!ceoReason.trim() || !evaluations.length || evaluations.some((e) => e.step !== "ceo")} onClick={() => { const issue = processCeoBatch(evaluations.map((e) => e.id), "return", ceoReason); setBatchMessage(issue ?? "Đã gửi Hội đồng điều chỉnh."); if (!issue) { setCeoReturnOpen(false); setCeoReason(""); } }}>Gửi điều chỉnh</Button></div></div>}
      {batchMessage && <p role="status" className="text-sm">{batchMessage}</p>}
      {!isKpi && <section aria-label="Phân bố xếp hạng Ki" className="rounded-lg border bg-muted/20 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Phân bố xếp hạng Ki</h3><span className="text-xs text-muted-foreground">{classified}/{evaluations.length} cá nhân có Ki · {evaluations.length - classified} chưa xếp · Tỷ lệ không gồm Ki K</span></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {counts.map((c) => {
            const percent = c.ki === "K" || !denominator ? 0 : Math.round(c.n / denominator * 100);
            const tones = {
              "A+": { badge: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-500", label: "Vượt xa yêu cầu" },
              A: { badge: "bg-blue-100 text-blue-800", bar: "bg-blue-500", label: "Vượt yêu cầu" },
              B: { badge: "bg-violet-100 text-violet-800", bar: "bg-violet-500", label: "Đạt yêu cầu" },
              C: { badge: "bg-amber-100 text-amber-800", bar: "bg-amber-500", label: "Gần đạt yêu cầu" },
              D: { badge: "bg-rose-100 text-rose-800", bar: "bg-rose-500", label: "Không đạt yêu cầu" },
              K: { badge: "bg-slate-100 text-slate-700", bar: "bg-slate-400", label: "Không đánh giá" },
            }[c.ki];
            return <div key={c.ki} className="rounded-lg border bg-card px-3 py-3">
              <div className="flex items-center justify-between gap-2"><span className={"inline-flex min-w-9 justify-center rounded-md px-2 py-1 text-sm font-semibold " + tones.badge}>{c.ki}</span><span className="text-xs tabular-nums text-muted-foreground">{c.ki === "K" ? "—" : percent + "%"}</span></div>
              <div className="mt-3 flex items-baseline gap-1.5"><strong data-testid={`ki-count-${c.ki}`} className="text-2xl font-semibold tabular-nums leading-none">{c.n}</strong><span className="text-xs text-muted-foreground">cá nhân</span></div>
              <p className="mt-2 text-xs text-muted-foreground">{tones.label}</p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted"><div className={"h-full rounded-full transition-[width] " + tones.bar} style={{ width: percent + "%" }} /></div>
            </div>;
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Thống kê theo các dòng đang hiển thị và dữ liệu đang nhập; thay đổi được ghi nhận khi lưu.</p>
      </section>}
      </div>
      <div className={mode === "ki" ? "relative isolate max-h-[50dvh] overflow-auto rounded-lg border" : "overflow-x-auto rounded-lg border"}>
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className={mode === "ki" ? "sticky top-0 z-20 bg-muted" : "bg-muted"}>
            <tr>
              {(isKpi
                ? [
                    "CQĐV/CQ · Cá nhân",
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
                    "CQĐV/CQ · Cá nhân",
                    "Điểm CQTT",
                    "Điểm đánh giá",
                    "Xếp loại",
                    "Tuân thủ địa điểm",
                    "Tuân thủ nội quy",
                    "Ki",
                    "Mức độ hoàn thành / Kiểm tra",
                    "Thao tác",
                  ]
              ).map((h) => (
                <th className="px-3 py-3 font-medium" key={h}>
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
                <td colSpan={9} className="p-8 text-center text-muted-foreground">
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
  const { previewRole, updateEvaluation } = useEvaluations();
  const isKpi = mode === "kpi";
  const editable = isKpi
    ? previewRole === "cqtt" && e.step === "cqtt"
    : mode === "ki" && previewRole === "council" && ["council", "council_adjust"].includes(e.step);
  const [draft, setDraft] = useState<Draft>({});
  const [error, setError] = useState("");
  const [kiDriven, setKiDriven] = useState(false);
  const change = (patch: Draft) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onDraftChange?.(next);
  };
  const current = { ...e, ...draft, ...(mode === "ki" ? { councilReviewed: true } : {}) };
  const result = templateResult(current);
  const numeric = (key: "cqttKey" | "cqttFunction" | "councilScore", label: string) => (
    <input
      aria-label={`${label} ${e.id}`}
      className={fieldClass + " w-24"}
      type="number"
      step="0.01"
      min={key === "councilScore" ? kiDriven && current.ki && current.ki !== "K" ? KI_SCORE_RANGES[current.ki].min : 1 : 0}
      max={key === "councilScore" && kiDriven && current.ki && current.ki !== "K" ? KI_SCORE_RANGES[current.ki].max : 5}
      disabled={!editable}
      value={current[key] ?? ""}
      onChange={(event) => {
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
  ) => (
    <select
      aria-label={`${label} ${e.id}`}
      disabled={!editable}
      className={fieldClass + (key === "laborCompliance" ? " w-52" : " w-36")}
      value={current[key] ?? ""}
      onChange={(event) => {
        const value = event.target.value;
        if (key === "ki") { setKiDriven(!!value); setError(""); change(value ? councilKiDraft(value as Ki) : { ki: undefined }); return; }
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
  const cell = "px-3 py-3 align-top";
  return (
    <tr className="border-t">
      <td className={cell}>
        <Link
          to="/danh-gia/$id"
          params={{ id: e.id }}
          className="font-medium text-primary hover:underline"
        >
          {e.owner}
        </Link>
        <div className="mt-1 text-xs">{e.unit}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {e.employeeId ?? "—"} · {e.jobTitle ?? "—"}
        </div>
        {mode === "appendix" && (
          <div className="mt-1 text-xs text-muted-foreground">{appendixFor(e)}</div>
        )}
      </td>
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
          <td className={cell}>{number(cqttTotal(e))}</td>
          <td className={cell}>{numeric("councilScore", "Điểm đánh giá")}</td>
          <td className={cell}>{result.rating}</td>
          <td className={cell}>
            {choose("locationCompliance", ["Tuân thủ", "Không tuân thủ"], "Tuân thủ địa điểm")}
          </td>
          <td className={cell}>{choose("laborCompliance", LABOR, "Tuân thủ nội quy")}</td>
          <td className={cell}>{choose("ki", KI, "Xếp Ki")}{current.ki && current.ki !== "K" && <p className="mt-1 text-xs text-muted-foreground">{KI_SCORE_RANGES[current.ki].min.toFixed(2)}–{KI_SCORE_RANGES[current.ki].max.toFixed(2)} điểm</p>}{current.ki === "K" && <p className="mt-1 text-xs text-muted-foreground">Không đánh giá</p>}</td>
          <td className={cell}>
            <div>{result.completion}</div>
            {["council", "council_adjust", "ceo"].includes(e.step) && (
              <p className="mt-1 text-xs text-primary">{kiError(current)}</p>
            )}
          </td>
        </>
      )}
      <td className={cell}>
        {editable && (
          <Button
            variant="outline"
            onClick={() => {
              if (kiDriven && current.ki && current.ki !== "K") {
                const range = KI_SCORE_RANGES[current.ki];
                if (current.councilScore === undefined || current.councilScore < range.min || current.councilScore > range.max) { setError(`Điểm Ki ${current.ki} phải trong khoảng ${range.min}–${range.max}.`); return; }
              }
              const issue = updateEvaluation(e.id, draft);
              setError(issue ?? "Đã lưu");
            }}
          >
            Lưu dòng
          </Button>
        )}
        <Link to="/danh-gia/$id" params={{ id: e.id }} className="mt-2 block text-xs text-primary">
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
