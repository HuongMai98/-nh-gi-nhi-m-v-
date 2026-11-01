import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, ArrowUpRight, Send, CheckCheck, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEvaluations } from "@/components/evaluation-context";
import { cqttTotal, groupScore, proposeCqttKi, type Draft, type Evaluation, type Ki } from "@/lib/evaluation";

const format = (value: number | undefined | null) => (value == null ? "—" : value.toFixed(2));
const baseInput =
  "w-full rounded-md border border-input bg-card h-9 px-2 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:border-transparent disabled:bg-transparent disabled:text-foreground disabled:opacity-100";
export function AssessmentSummary({
  evaluations,
  onExport,
  onDraftChange,
  batchCandidates,
}: {
  batchCandidates?: Evaluation[] | undefined;
  evaluations: Evaluation[];
  onExport: () => void;
  onDraftChange?: ((draft: Draft) => void) | undefined;
}) {
  const { previewRole, sendOfficeBatch } = useEvaluations();
  const [batchDrafts, setBatchDrafts] = useState<Record<string, Draft>>({});
  const [batchFeedback, setBatchFeedback] = useState("");
  const pending = (batchCandidates ?? []).filter((e) => e.step === "office");
  const batches = [
    ...pending
      .reduce((groups, e) => {
        const key = e.period + "|" + e.block;
        groups.set(key, [...(groups.get(key) ?? []), e]);
        return groups;
      }, new Map<string, Evaluation[]>())
      .values(),
  ];
  const canBatchSend = previewRole === "office" && batchCandidates !== undefined;
  const sendBatch = (batch: Evaluation[]) => {
    const ids = batch.map((e) => e.id);
    const issue = sendOfficeBatch(ids, batchDrafts);
    setBatchFeedback(issue ?? `Đã gửi ${ids.length} phiếu đến CQTT rà soát.`);
    if (!issue)
      setBatchDrafts((current) =>
        Object.fromEntries(Object.entries(current).filter(([id]) => !ids.includes(id))),
      );
  };
  const periods = [...new Set(evaluations.map((e) => e.period))];
  const blocks = [...new Set(evaluations.map((e) => e.block))];
  const scored = evaluations.filter((e) => cqttTotal(e) !== null).length;
  const weightLabel = (key: boolean) => {
    const values = [
      ...new Set(
        evaluations.map((e) =>
          Math.round(
            e.criteria.filter((c) => (c.group === "A") === key).reduce((s, c) => s + c.weight, 0) *
              100,
          ),
        ),
      ),
    ];
    return values.length === 1 ? `${values[0]}%` : "Theo phiếu";
  };
  const primaryHeader =
    "border-b border-border px-3 py-3 text-left text-sm font-medium text-foreground";
  return (
    <section aria-label="Tổng hợp đánh giá" className="overflow-hidden rounded-lg border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b px-4 py-4">
        <div className="flex items-start gap-3">
          <div>
            <h2 className="font-semibold">Tổng hợp đánh giá</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Kết quả đánh giá và đề xuất xếp hạng Ki ·{" "}
              {blocks.length === 1 ? blocks[0] : "Cơ quan, đơn vị"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md bg-muted px-2 py-1 font-medium">
                {periods.length === 1 ? periods[0] : "Các kỳ đánh giá"}
              </span>
              <span className="text-muted-foreground">{evaluations.length} hồ sơ</span>
              <span className="text-border">|</span>
              <span className="text-muted-foreground">
                CQTT đã chấm{" "}
                <b className="text-foreground">
                  {scored}/{evaluations.length}
                </b>
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onExport}>
            <Download />
            Xuất CSV
          </Button>
          {canBatchSend &&
            (batches.length ? (
              batches.map((batch) => (
                <Button key={batch[0]!.period + batch[0]!.block} onClick={() => sendBatch(batch)}>
                  <Send />
                  {batches.length > 1 ? `Gửi CQTT · ${batch[0]!.block}` : "Gửi CQTT"} (
                  {batch.length} phiếu)
                </Button>
              ))
            ) : (
              <Button disabled>
                <Send />
                Gửi CQTT (0 phiếu)
              </Button>
            ))}
        </div>
      </header>
      {batchFeedback && (
        <p role="status" className="border-b px-4 py-3 text-sm">
          {batchFeedback}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <span>Điểm nhóm đã nhân tỷ trọng · Thang tổng điểm 1–5</span>
        <span>
          <i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-violet-500" />
          Thường trực đánh giá
        </span>
      </div>
      <div className="max-h-[65vh] overflow-auto">
        <table className="w-full min-w-[1700px] table-fixed border-separate border-spacing-0 text-sm">
          <caption className="sr-only">
            Tổng hợp kết quả đánh giá và đề xuất xếp hạng Ki theo template. Điểm tự đánh giá và điểm
            Thường trực được đối chiếu theo nhóm nhiệm vụ.
          </caption>
          <colgroup>
            {[44, 82, 170, 185, 76, 76, 78, 76, 76, 78, 235, 108, 112, 190, 120].map((width, i) => (
              <col key={i} style={{ width }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-30">
            <tr>
              <th
                rowSpan={2}
                className={primaryHeader + " sticky left-0 z-40 bg-muted text-center"}
              >
                TT
              </th>
              <th rowSpan={2} className={primaryHeader + " sticky left-[44px] z-40 bg-muted"}>
                Mã số
              </th>
              <th rowSpan={2} className={primaryHeader + " sticky left-[126px] z-40 bg-muted"}>
                Họ và tên
              </th>
              <th rowSpan={2} className={primaryHeader + " bg-muted"}>
                Cơ quan / Đơn vị
              </th>
              <th
                colSpan={3}
                className="border-x border-b bg-muted px-3 py-3 text-center text-sm font-medium"
              >
                Điểm CQ tự đánh giá
              </th>
              <th
                colSpan={3}
                className="border-r border-b border-violet-200 bg-violet-50 px-3 py-3 text-center text-sm font-medium text-violet-800"
              >
                Thường trực đánh giá
              </th>
              <th rowSpan={2} className={primaryHeader + " bg-muted"}>
                Lý do
              </th>
              <th rowSpan={2} className={primaryHeader + " bg-muted text-center"}>
                Đề xuất
                <br />
                xếp hạng Ki
              </th>
              <th rowSpan={2} className={primaryHeader + " bg-muted"}>
                Trợ lý
              </th>
              <th rowSpan={2} className={primaryHeader + " bg-muted"}>
                Ghi chú
              </th>
              <th
                rowSpan={2}
                className={primaryHeader + " sticky right-0 z-40 border-l bg-muted text-center"}
              >
                Thao tác
              </th>
            </tr>
            <tr>
              {[false, true].flatMap((standing) =>
                [true, false, null].map((key, i) => (
                  <th
                    key={`${standing}-${i}`}
                    className={`border-b px-2 py-2.5 text-center text-xs font-medium ${standing ? "border-violet-200 bg-violet-50/95 text-violet-800" : "bg-muted"} ${i === 0 ? "border-l" : ""} ${i === 2 ? "border-r font-semibold" : ""}`}
                  >
                    {key === null ? (
                      "Tổng"
                    ) : (
                      <>
                        {key ? "NV trọng yếu" : "NV chức năng"}
                        <span className="mt-0.5 block text-xs opacity-70">
                          ({weightLabel(key)})
                        </span>
                      </>
                    )}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {evaluations.map((e, index) => (
              <AssessmentRow
                key={`${e.id}-${e.step}-${previewRole}`}
                evaluation={e}
                index={index}
                initialDraft={previewRole === "office" ? batchDrafts[e.id] : undefined}
                onDraftChange={(draft) => {
                  if (previewRole === "office")
                    setBatchDrafts((current) => ({ ...current, [e.id]: draft }));
                  onDraftChange?.(draft);
                }}
              />
            ))}
            {!evaluations.length && (
              <tr>
                <td colSpan={15} className="p-10 text-center text-muted-foreground">
                  Không có hồ sơ phù hợp
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-xs text-muted-foreground">
        <span>Đề xuất Ki của CQTT được lưu riêng với Ki Hội đồng phê duyệt.</span>
        <span>Cuộn ngang để xem đầy đủ các cột →</span>
      </footer>
    </section>
  );
}
function AssessmentRow({
  evaluation: e,
  index,
  initialDraft,
  onDraftChange,
}: {
  evaluation: Evaluation;
  index: number;
  initialDraft?: Draft | undefined;
  onDraftChange?: ((draft: Draft) => void) | undefined;
}) {
  const { previewRole, updateEvaluation } = useEvaluations();
  const [draft, setDraft] = useState<Draft>(initialDraft ?? {});
  const [feedback, setFeedback] = useState("");
  const current = { ...e, ...draft };
  const canScore = previewRole === "cqtt" && e.step === "cqtt";
  const [adjusting, setAdjusting] = useState(true);
  const canMeta = (previewRole === "office" && e.step === "office") || canScore;
  const change = (patch: Draft) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    setFeedback("");
    onDraftChange?.(next);
  };
  const self = groupScore(e, true) + groupScore(e, false);
  const score = (key: "cqttKey" | "cqttFunction", label: string) => {
    const max = e.criteria
      .filter((c) => (c.group === "A") === (key === "cqttKey"))
      .reduce((s, c) => s + c.weight * 5, 0);
    return (
      <input
        aria-label={`${label} ${e.id}`}
        type="number"
        min={0}
        max={max}
        step="0.01"
        disabled={!canScore || !adjusting}
        value={current[key] ?? ""}
        onChange={(event) =>
          change({ [key]: event.target.value === "" ? undefined : Number(event.target.value) })
        }
        className={
          baseInput + " text-center tabular-nums enabled:border-violet-200 enabled:bg-violet-50/50"
        }
      />
    );
  };
  const cell = "border-b border-border/70 px-3 py-3 align-top";
  return (
    <tr className="group hover:bg-muted/20" onBlur={(event) => {
      if (!canScore || event.currentTarget.contains(event.relatedTarget as Node | null) || !Object.keys(draft).length) return;
      const issue = updateEvaluation(e.id, draft);
      setFeedback(issue ?? "Đã lưu");
      if (!issue) { setDraft({}); onDraftChange?.({}); }
    }}>
      <td
        className={
          cell +
          " sticky left-0 z-10 bg-card text-center text-sm text-muted-foreground group-hover:bg-muted"
        }
      >
        {index + 1}
      </td>
      <td
        className={
          cell +
          " sticky left-[44px] z-10 bg-card text-sm tabular-nums text-muted-foreground group-hover:bg-muted"
        }
      >
        {e.employeeId ?? "—"}
      </td>
      <td className={cell + " sticky left-[126px] z-10 bg-card group-hover:bg-muted"}>
        <Link
          to="/danh-gia/$id"
          params={{ id: e.id }}
          search={{}}
          title={`Xem đánh giá cá nhân của ${e.owner}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {e.owner}<ArrowUpRight className="h-3 w-3 shrink-0" />
        </Link>
        <div className="mt-1 text-xs text-muted-foreground">{e.jobTitle ?? "—"}</div>
      </td>
      <td className={cell + " text-sm"}>
        {e.unit}
        <div className="mt-1 text-xs text-muted-foreground">{e.block}</div>
      </td>
      <td className={cell + " border-l text-center tabular-nums"}>{format(groupScore(e, true))}</td>
      <td className={cell + " text-center tabular-nums"}>{format(groupScore(e, false))}</td>
      <td className={cell + " border-r bg-muted/40 text-center font-semibold tabular-nums"}>
        {format(self)}
      </td>
      <td className={cell + " bg-violet-50/20 px-1.5"}>
        {score("cqttKey", "Điểm CQTT trọng tâm")}
      </td>
      <td className={cell + " bg-violet-50/20 px-1.5"}>
        {score("cqttFunction", "Điểm CQTT chức năng")}
      </td>
      <td
        className={
          cell +
          " border-r border-violet-200 bg-violet-50/60 text-center font-semibold tabular-nums text-violet-800"
        }
      >
        {format(cqttTotal(current))}

      </td>
      <td className={cell}>
        <textarea
          aria-label={`Góp ý CQTT ${e.id}`}
          rows={2}
          disabled={!canScore}
          value={current.note ?? ""}
          placeholder={canScore ? "Lý do điều chỉnh / nội dung rà soát" : ""}
          onChange={(event) => change({ note: event.target.value })}
          className={baseInput + " min-h-[68px] resize-y"}
        />
        {e.response && (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-info">{e.response} · Xem phản hồi</summary>
            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{e.responseNote}</p>
          </details>
        )}
      </td>
      <td className={cell}>
        <select
          aria-label={`Đề xuất xếp hạng Ki ${e.id}`}
          disabled={!canScore}
          value={current.proposedKi ?? ""}
          onChange={(event) => {
            if (!event.target.value) { change({ proposedKi: undefined }); return; }
            try { change(proposeCqttKi(current, event.target.value as Ki)); }
            catch (error) { setFeedback(error instanceof Error ? error.message : "Không thể đề xuất Ki."); }
          }}
          className={baseInput + " font-semibold"}
        >
          <option value="">—</option>
          {["A+", "A", "B", "C", "D", "K"].map((ki) => (
            <option key={ki}>{ki}</option>
          ))}
        </select>

      </td>
      <td className={cell}>
        <input
          aria-label={`Trợ lý ${e.id}`}
          disabled={!canMeta}
          value={current.reviewAssistant ?? ""}
          onChange={(event) => change({ reviewAssistant: event.target.value })}
          placeholder={canMeta ? "Mã trợ lý" : ""}
          className={baseInput}
        />
      </td>
      <td className={cell}>
        <textarea
          aria-label={`Ghi chú ${e.id}`}
          rows={2}
          disabled={!canMeta}
          value={current.reviewRemark ?? ""}
          onChange={(event) => change({ reviewRemark: event.target.value })}
          placeholder={canMeta ? "Nhập ghi chú..." : ""}
          className={baseInput + " min-h-[68px] resize-y"}
        />
      </td>
      <td
        className={cell + " sticky right-0 z-10 border-l bg-card text-center group-hover:bg-muted"}
      >
        {canScore && <div className="mb-2 flex items-center gap-1">
          <Button type="button" variant={adjusting ? "outline" : "secondary"} size="icon" title="Không điều chỉnh" aria-label={`Không điều chỉnh ${e.id}`} aria-pressed={!adjusting} onClick={() => {
            const patch = { ...draft, cqttKey: groupScore(e, true), cqttFunction: groupScore(e, false), proposedKi: undefined };
            change(patch);
            const issue = updateEvaluation(e.id, patch);
            setFeedback(issue ?? "Đã lưu");
            if (!issue) { setDraft({}); onDraftChange?.({}); }
            setAdjusting(false);
          }}><CheckCheck className="h-4 w-4" /></Button>
          <Button type="button" variant={adjusting ? "secondary" : "outline"} size="icon" title="Điều chỉnh điểm" aria-label={`Điều chỉnh ${e.id}`} aria-pressed={adjusting} onClick={() => setAdjusting(true)}><Pencil className="h-4 w-4" /></Button>
        </div>}
        {feedback && (
          <p role="status" className="mt-2 text-xs">
            {feedback}
          </p>
        )}
      </td>
    </tr>
  );
}
