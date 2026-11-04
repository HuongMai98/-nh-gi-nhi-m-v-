import { STAGES, handlerFor, type StageKey } from "@/lib/workflow";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, Save, Undo2, ArrowUpRight, Send, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEvaluations } from "@/components/evaluation-context";
import { cqttTotal, saveDraft, groupScore, proposeCqttKi, cqttScoreForKi, KI_SCORE_RANGES, type Draft, type Evaluation, type Ki } from "@/lib/evaluation";

const format = (value: number | undefined | null) => (value == null ? "—" : value.toFixed(2));
const baseInput =
  "w-full rounded-md border border-input bg-card h-9 px-2 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:border-transparent disabled:bg-transparent disabled:text-foreground disabled:opacity-100";
export function AssessmentSummary({
  evaluations,
  onExport,
  onDraftChange,
  batchCandidates,
  onCouncilSummary,
  onCqttReturned,
}: {
  onCqttReturned?: ((count: number) => void) | undefined;
  onCouncilSummary?: (() => void) | undefined;
  batchCandidates?: Evaluation[] | undefined;
  evaluations: Evaluation[];
  onExport: () => void;
  onDraftChange?: ((draft: Draft) => void) | undefined;
}) {
  const { previewRole, sendOfficeBatch, processCqttBatch, workflows, updateEvaluation } = useEvaluations();
  // Bước được phép trả về từ CQTT (giao của các khối đang hiển thị); người xử lý chọn 1 bước.
  const cqttTargets = (() => {
    const lists = [...new Set(evaluations.map((e) => e.block))].map((b) => workflows[b].stages.find((s) => s.key === "cqtt")?.returnTo ?? []);
    return lists.length ? lists.reduce((a, l) => a.filter((x) => l.includes(x))) : [];
  })();
  const cqttReturnOn = cqttTargets.length > 0;
  const showActions = previewRole === "cqtt" && evaluations.some((e) => e.step === "cqtt" || e.step === "cqtt_report");
  const [cqttReturnStage, setCqttReturnStage] = useState<StageKey | "">("");
  const chosenReturn = cqttTargets.includes(cqttReturnStage as StageKey) ? (cqttReturnStage as StageKey) : cqttTargets[0];
  const [batchDrafts, setBatchDrafts] = useState<Record<string, Draft>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editAllVersion, setEditAllVersion] = useState(0);
  const [batchFeedback, setBatchFeedback] = useState("");
  const pending = (batchCandidates ?? []).filter((e) => e.step === "office");
  // Văn phòng đếm phiếu chờ tổng hợp; CQTT/Hội đồng đếm phiếu đang hiển thị trong bảng.
  const countRows = previewRole === "office" && pending.length ? pending : evaluations;
  const agencyCount = countRows.filter((e) => e.block === "Khối Cơ quan").length;
  const unitCount = countRows.filter((e) => e.block === "Khối Đơn vị").length;
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
  const cqttRows = evaluations.filter((e) => e.step === "cqtt");
  // Gửi điều chỉnh tại màn Tổng hợp: hồ sơ đang rà soát hoặc đã Hoàn tất đánh giá (chưa gửi Hội đồng).
  const returnRows = evaluations.filter((e) => e.step === "cqtt" || e.step === "cqtt_report");
  // Cột Thao tác: hàng icon (Chỉnh sửa · Lưu · Gửi Hội đồng), bên dưới là Gửi điều chỉnh.
  const actionsWidth = showActions ? 200 : 0;
  const eligibleIds = returnRows.filter((e) => { const current = { ...e, ...batchDrafts[e.id] }; const total = cqttTotal(current); return total !== null && Math.abs(total - groupScore(e, true) - groupScore(e, false)) >= 0.005; }).map((e) => e.id);
  const selectedEligible = selectedIds.filter((id) => eligibleIds.includes(id));
  const councilRows = evaluations.filter((e) => e.step === "cqtt" || e.step === "cqtt_report");
  const allScored = councilRows.length > 0 && councilRows.every((e) => {
    try {
      const saved = e.step === "cqtt" ? saveDraft(e, "cqtt", batchDrafts[e.id] ?? {}, "validation") : e;
      const total = cqttTotal(saved);
      return total !== null && total >= 1 && total <= 5;
    } catch { return false; }
  });
  // Gửi điều chỉnh: mở hộp nhập Lý do điều chỉnh (bắt buộc) trước khi gửi.
  const [returnIds, setReturnIds] = useState<string[] | null>(null);
  const [returnNote, setReturnNote] = useState("");
  const [returnError, setReturnError] = useState("");
  // Lý do đã nhập ở cột Lý do (đang sửa hoặc đã lưu) được dùng làm lý do gửi điều chỉnh.
  const rowNote = (id: string) => (batchDrafts[id]?.note ?? evaluations.find((x) => x.id === id)?.note ?? "").trim();
  const sendReturn = (ids: string[], fallback: string): string | null => {
    const drafts = Object.fromEntries(ids.map((id) => [id, { ...(batchDrafts[id] ?? {}), note: rowNote(id) || fallback.trim(), ...(chosenReturn ? { returnStage: chosenReturn } : {}) }]));
    const issue = processCqttBatch(ids, drafts, true);
    if (issue) return issue;
    setBatchFeedback(`Đã gửi điều chỉnh ${ids.length} hồ sơ.`);
    setBatchDrafts((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !ids.includes(id))));
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
    onCqttReturned?.(ids.length);
    return null;
  };
  // Đã có lý do ở cột Lý do thì gửi luôn; thiếu lý do thì mở hộp nhập (lý do được lưu vào cột Lý do).
  const openReturn = (ids: string[]) => {
    if (ids.every((id) => rowNote(id)) && cqttTargets.length <= 1) { setBatchFeedback(sendReturn(ids, "") ?? ""); return; }
    setReturnIds(ids); setReturnNote(""); setReturnError("");
  };
  const missingNote = (returnIds ?? []).filter((id) => !rowNote(id));
  // Gửi điều chỉnh trên thanh công cụ: bắt buộc mọi hồ sơ đã chọn có Lý do ở danh sách, không mở hộp nhập.
  const [noteRequired, setNoteRequired] = useState<string[]>([]);
  const sendSelected = () => {
    const missing = selectedEligible.filter((id) => !rowNote(id));
    setNoteRequired(missing);
    if (missing.length) {
      setBatchFeedback(`Nhập Lý do điều chỉnh cho ${missing.length} hồ sơ đã chọn trước khi gửi.`);
      // Đưa con trỏ tới ô Lý do còn trống đầu tiên (bảng cuộn ngang).
      setTimeout(() => {
        const el = document.querySelector(`[aria-label="Góp ý CQTT ${missing[0]}"]`) as HTMLTextAreaElement | null;
        el?.scrollIntoView?.({ block: "nearest", inline: "center" });
        el?.focus({ preventScroll: true });
      }, 0);
      return;
    }
    setBatchFeedback(sendReturn(selectedEligible, "") ?? `Đã gửi điều chỉnh ${selectedEligible.length} hồ sơ.`);
    setNoteRequired([]);
  };
  const confirmReturn = () => {
    if (!returnIds?.length) return;
    if (missingNote.length && !returnNote.trim()) { setReturnError("Vui lòng nhập lý do điều chỉnh."); return; }
    const issue = sendReturn(returnIds, returnNote);
    if (issue) { setReturnError(issue); return; }
    setReturnIds(null);
  };
  // Lưu tất cả: điểm/ý kiến hồ sơ đang rà soát và Lý do của hồ sơ đã Hoàn tất đánh giá.
  const saveAll = () => {
    const reportIds = evaluations.filter((e) => e.step === "cqtt_report" && batchDrafts[e.id]?.note !== undefined).map((e) => e.id);
    let issue: string | null = cqttRows.length ? processCqttBatch(cqttRows.map((e) => e.id), batchDrafts, false) : null;
    for (const id of reportIds) issue = issue ?? updateEvaluation(id, { note: batchDrafts[id]!.note ?? "" });
    setBatchFeedback(issue ?? "Đã lưu tất cả hồ sơ.");
    if (!issue) { setBatchDrafts({}); setNoteRequired([]); }
  };
  const handleCqttBatch = (request: boolean | "council") => {
    const drafts = request === true && chosenReturn ? Object.fromEntries(selectedEligible.map((id) => [id, { ...(batchDrafts[id] ?? {}), returnStage: chosenReturn }])) : batchDrafts;
    const issue = processCqttBatch((request === true ? selectedEligible : (request === "council" ? councilRows : cqttRows).map((e) => e.id)), drafts, request);
    setBatchFeedback(issue ?? (request === "council" ? "Đã gửi hồ sơ sang Hội đồng." : request ? "Đã gửi điều chỉnh cho tất cả hồ sơ." : "Đã lưu tất cả hồ sơ."));
    if (!issue) { setBatchDrafts((current) => request === true ? Object.fromEntries(Object.entries(current).filter(([id]) => !selectedEligible.includes(id))) : {}); if (request === true) setSelectedIds([]); }
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
              {canBatchSend || previewRole === "cqtt" || previewRole === "council" || previewRole === "ceo" ? <span className="inline-flex flex-wrap items-center gap-1.5">{[["Cơ quan", agencyCount, "Số phiếu Khối Cơ quan"], ["Đơn vị", unitCount, "Số phiếu Khối Đơn vị"], ["Tổng", countRows.length, "Tổng số phiếu"]].map(([label, count, hint]) => <span key={label} title={String(hint)} className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-muted-foreground">{label}<b className="font-semibold tabular-nums text-foreground">{count}</b>phiếu</span>)}</span> : <span className="text-muted-foreground">{evaluations.length} hồ sơ</span>}
              {previewRole !== "ceo" && <>
              <span className="text-border">|</span>
              <span className="text-muted-foreground">
                CQTT đã chấm{" "}
                <b className="text-foreground">
                  {scored}/{evaluations.length}
                </b>
              </span>
              </>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onExport}>
            <Download />
            Xuất CSV
          </Button>
          {previewRole === "cqtt" && <><Button variant="outline" disabled={!returnRows.length} onClick={() => setEditAllVersion((version) => version + 1)}><Pencil />Chỉnh sửa tất cả</Button><Button variant="outline" disabled={!cqttRows.length && !evaluations.some((e) => e.step === "cqtt_report" && batchDrafts[e.id]?.note !== undefined)} onClick={saveAll}><Save />Lưu tất cả</Button>{cqttReturnOn && cqttTargets.length > 1 && <select aria-label="Trả về bước" className="h-9 rounded-md border bg-card px-2 text-sm" value={chosenReturn} onChange={(e) => setCqttReturnStage(e.target.value as StageKey)}>{cqttTargets.map((k) => <option key={k} value={k}>Trả về: {STAGES[k].name}</option>)}</select>}{cqttReturnOn && <Button variant="return" disabled={!selectedEligible.length} onClick={() => sendSelected()}><Undo2 />Gửi điều chỉnh ({selectedEligible.length})</Button>}<Button disabled={!allScored} title={allScored ? "Gửi Hội đồng" : "Cần chấm đủ điểm hợp lệ cho tất cả hồ sơ"} onClick={() => handleCqttBatch("council")}><Send />Gửi Hội đồng</Button></>}
          {previewRole === "council" && onCouncilSummary && <Button onClick={onCouncilSummary} disabled={!evaluations.length}>Tổng hợp KI</Button>}
          {canBatchSend && <><Button disabled={!pending.length} onClick={() => sendBatch(pending)}><Send />Gửi CQTT</Button></>}
        </div>
      </header>
      <Dialog open={returnIds !== null} onOpenChange={(open) => { if (!open) setReturnIds(null); }}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>Gửi điều chỉnh</DialogTitle>
            <DialogDescription>
              {returnIds?.length === 1
                ? `${evaluations.find((x) => x.id === returnIds[0])?.owner ?? ""} · ${returnIds[0]}`
                : `${returnIds?.length ?? 0} hồ sơ được chọn`}
            </DialogDescription>
          </DialogHeader>
          {cqttTargets.length > 1 && (
            <label className="block space-y-1 text-sm">
              Trả về bước
              <select aria-label="Trả về bước" className="h-9 w-full rounded-md border bg-card px-2 text-sm" value={chosenReturn} onChange={(ev) => setCqttReturnStage(ev.target.value as StageKey)}>
                {cqttTargets.map((k) => <option key={k} value={k}>{STAGES[k].name} — {handlerFor(evaluations[0]?.block ?? "Khối Cơ quan", k)}</option>)}
              </select>
            </label>
          )}
          {missingNote.length > 0 && <label className="block space-y-1 text-sm">
            Lý do điều chỉnh <span className="text-primary">*</span>
            <textarea aria-label="Lý do điều chỉnh" autoFocus className="min-h-24 w-full rounded-md border p-2 text-sm" value={returnNote} onChange={(ev) => { setReturnNote(ev.target.value); setReturnError(""); }} placeholder="Nhập nội dung yêu cầu CQĐV/CQ điều chỉnh..." />
            {returnIds && missingNote.length < returnIds.length && <span className="block text-xs text-muted-foreground">Hồ sơ đã có lý do ở cột Lý do giữ nguyên lý do đó.</span>}
          </label>}
          {returnError && <p role="alert" className="text-sm text-primary">{returnError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnIds(null)}>Hủy</Button>
            <Button onClick={confirmReturn}><Undo2 />Gửi điều chỉnh</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {batchFeedback && (
        <p role="status" className={"border-b px-4 py-3 text-sm" + (noteRequired.length ? " font-medium text-primary" : "")}>
          {batchFeedback}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <span>Điểm nhóm đã nhân tỷ trọng · Thang tổng điểm 1–5</span>
      </div>
      <div className="max-h-[65vh] overflow-auto">
        <table style={{ minWidth: 1184 + actionsWidth }} className="w-full table-fixed border-separate border-spacing-0 text-sm">
          <caption className="sr-only">
            Tổng hợp kết quả đánh giá và đề xuất xếp hạng Ki theo template. Điểm tự đánh giá và điểm
            Thường trực được đối chiếu theo nhóm nhiệm vụ.
          </caption>
          <colgroup>
            {[44, 112, 170, 185, 76, 76, 78, 76, 76, 78, 235, 108, ...(showActions ? [actionsWidth] : [])].map((width, i) => (
              <col key={i} style={{ width }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-30">
            <tr>
              <th
                rowSpan={2}
                className={primaryHeader + " sticky left-0 z-40 bg-muted text-center"}
              >
                {previewRole === "cqtt" ? <input type="checkbox" aria-label="Chọn tất cả hồ sơ lệch điểm" disabled={!eligibleIds.length} checked={eligibleIds.length > 0 && selectedEligible.length === eligibleIds.length} onChange={(event) => setSelectedIds(event.target.checked ? eligibleIds : [])} className="h-4 w-4 accent-primary" /> : "TT"}
              </th>
              <th rowSpan={2} className={primaryHeader + " sticky left-[44px] z-40 whitespace-nowrap bg-muted"}>
                Mã nhân viên
              </th>
              <th rowSpan={2} className={primaryHeader + " sticky left-[156px] z-40 bg-muted"}>
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
              {showActions && (
                <th
                  rowSpan={2}
                  className={primaryHeader + " sticky right-0 z-40 border-l bg-muted text-center"}
                >
                  Thao tác
                </th>
              )}
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
                key={`${e.id}-${e.step}-${previewRole}-${e.history?.length ?? 0}`}
                evaluation={e}
                index={index}
                showActions={showActions}
                selected={selectedEligible.includes(e.id)}
                onSelect={() => setSelectedIds((ids) => ids.includes(e.id) ? ids.filter((id) => id !== e.id) : [...ids, e.id])}
                editAllVersion={editAllVersion}
                onRequestReturn={() => openReturn([e.id])}
                noteRequired={noteRequired.includes(e.id)}
                initialDraft={batchDrafts[e.id]}
                onDraftChange={(draft) => {
                  if (previewRole === "office" || previewRole === "cqtt")
                    setBatchDrafts((current) => ({ ...current, [e.id]: draft }));
                  onDraftChange?.(draft);
                }}
              />
            ))}
            {!evaluations.length && (
              <tr>
                <td colSpan={13} className="p-10 text-center text-muted-foreground">
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
function AssessmentRow({
  evaluation: e,
  index,
  showActions = true,
  initialDraft,
  selected = false,
  onSelect,
  editAllVersion = 0,
  onDraftChange,
  onRequestReturn,
  noteRequired = false,
}: {
  onRequestReturn?: (() => void) | undefined;
  /** Hồ sơ đã chọn gửi điều chỉnh nhưng chưa có Lý do. */
  noteRequired?: boolean;
  evaluation: Evaluation;
  index: number;
  /** Cột Thao tác (ghim phải) chỉ hiện khi CQTT đang có hồ sơ cần chấm. */
  showActions?: boolean;
  initialDraft?: Draft | undefined;
  selected?: boolean;
  onSelect?: (() => void) | undefined;
  editAllVersion?: number;
  onDraftChange?: ((draft: Draft) => void) | undefined;
}) {
  const { previewRole, updateEvaluation, processCqttBatch, workflows } = useEvaluations();
  const [draft, setDraft] = useState<Draft>(initialDraft ?? {});
  const [feedback, setFeedback] = useState("");
  const current = { ...e, ...draft };
  const canScore = previewRole === "cqtt" && e.step === "cqtt";
  // Lý do điều chỉnh: CQTT nhập trực tiếp cả với hồ sơ đã Hoàn tất đánh giá.
  const canNote = previewRole === "cqtt" && (e.step === "cqtt" || e.step === "cqtt_report");
  // Lý do đã lưu hiển thị chỉ đọc; bấm Chỉnh sửa để sửa lại trước khi gửi điều chỉnh.
  const [noteEditing, setNoteEditing] = useState(!e.note?.trim() || initialDraft?.note !== undefined);
  // Chỉnh sửa tất cả: mở lại Lý do đã lưu của mọi hồ sơ.
  // Chỉ phản ứng khi bấm Chỉnh sửa tất cả sau khi dòng hiển thị (lưu xong dòng render lại ở trạng thái chỉ đọc).
  const editAllSeen = useRef(editAllVersion);
  useEffect(() => {
    if (editAllVersion !== editAllSeen.current && canNote) setNoteEditing(true);
    editAllSeen.current = editAllVersion;
  }, [editAllVersion, canNote]);
  const saveNote = () => {
    const issue = updateEvaluation(e.id, e.step === "cqtt" ? draft : { note: current.note ?? "" });
    setFeedback(issue ?? "Đã lưu");
    if (!issue) { setDraft({}); onDraftChange?.({}); setNoteEditing(false); }
  };
  const [adjusting, setAdjusting] = useState(false);
  const editing = (canScore && adjusting) || (noteEditing && !!e.note?.trim());
  useEffect(() => { if (editAllVersion > 0 && canScore) setAdjusting(true); }, [editAllVersion, canScore]);
  const change = (patch: Draft) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    setFeedback("");
    onDraftChange?.(next);
  };
  const self = groupScore(e, true) + groupScore(e, false);
  const returnButton = (workflows[e.block].stages.find((s) => s.key === "cqtt")?.returnTo.length ?? 0) > 0 ? (
    <Button type="button" variant="return" size="sm" disabled={cqttTotal(current) === null || Math.abs((cqttTotal(current) ?? 0) - self) < 0.005} className="h-8 gap-1.5 whitespace-nowrap px-2.5 text-xs shadow-none" aria-label={`Gửi điều chỉnh ${e.id}`} onClick={() => onRequestReturn?.()}><Undo2 className="h-3.5 w-3.5" />Gửi điều chỉnh</Button>
  ) : null;
  // CQTT đã chấm đủ từng công việc: điểm nhóm lấy theo điểm công việc, không nhập tay.
  const byTask = e.criteria.length > 0 && e.criteria.every((c) => c.cqtt !== undefined);
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
        disabled={!canScore || !adjusting || byTask}
        title={byTask ? "Tính từ CQTT đánh giá từng công việc" : undefined}
        value={current[key] ?? ""}
        onChange={(event) =>
          change({ [key]: event.target.value === "" ? undefined : Number(event.target.value) })
        }
        className={
          baseInput + " min-w-16 text-center tabular-nums [appearance:textfield] enabled:border-violet-200 enabled:bg-violet-50/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        }
      />
    );
  };
  const cell = "border-b border-border/70 px-3 py-3 align-top";
  return (
    <tr className="group hover:bg-muted/20">      <td
        className={
          cell +
          " sticky left-0 z-10 bg-card text-center text-sm text-muted-foreground group-hover:bg-muted"
        }
      >
        <div className="flex flex-col items-center gap-2">{previewRole === "cqtt" && <input type="checkbox" aria-label={`Chọn gửi điều chỉnh ${e.id}`} checked={selected} disabled={!(canScore || e.step === "cqtt_report") || cqttTotal(current) === null || Math.abs((cqttTotal(current) ?? 0) - self) < 0.005} onChange={onSelect} className="h-4 w-4 accent-primary" />}<span>{index + 1}</span></div>
      </td>
      <td
        className={
          cell +
          " sticky left-[44px] z-10 bg-card text-sm tabular-nums text-muted-foreground group-hover:bg-muted"
        }
      >
        {e.employeeId ?? "—"}
      </td>
      <td className={cell + " sticky left-[156px] z-10 bg-card group-hover:bg-muted"}>
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
        <div className="relative flex min-h-8 items-center justify-center"><span>{canScore && adjusting && current.proposedKi && current.proposedKi !== "K" ? <input aria-label={`Tổng điểm CQTT ${e.id}`} type="number" step="0.01" min={KI_SCORE_RANGES[current.proposedKi].min} max={KI_SCORE_RANGES[current.proposedKi].max} className="h-9 w-16 rounded-md border border-violet-200 bg-card px-1 text-center text-sm" value={cqttTotal(current) ?? ""} onChange={(event) => { try { change(cqttScoreForKi(current, current.proposedKi!, Number(event.target.value))); } catch (error) { setFeedback(error instanceof Error ? error.message : "Điểm không hợp lệ"); } }} /> : format(cqttTotal(current))}</span></div>

      </td>
      <td className={cell}>
        {canNote && !noteEditing ? (
          <p className="min-h-9 whitespace-pre-wrap py-1.5 text-sm" data-testid={`ly-do-${e.id}`}>{current.note}</p>
        ) : <textarea
          aria-label={`Góp ý CQTT ${e.id}`}
          rows={2}
          disabled={!canNote}
          value={current.note ?? ""}
          placeholder={canNote ? "Lý do điều chỉnh / nội dung rà soát" : "—"}
          onChange={(event) => change({ note: event.target.value })}
          aria-invalid={noteRequired && !current.note?.trim()}
          className={baseInput + " min-h-[68px] resize-y" + (noteRequired && !current.note?.trim() ? " border-primary ring-1 ring-primary/30" : "")}
        />}
        {noteRequired && !current.note?.trim() && <p className="mt-1 text-xs text-primary">Bắt buộc nhập lý do điều chỉnh</p>}
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


        {canScore && current.proposedKi && current.proposedKi !== "K" && <p className="mt-1 text-xs text-muted-foreground">{KI_SCORE_RANGES[current.proposedKi].min}–{KI_SCORE_RANGES[current.proposedKi].max} điểm</p>}      </td>
      {showActions && <td
        className={cell + " sticky right-0 z-10 border-l bg-card text-center group-hover:bg-muted"}
      >
        {/* Thao tác: hàng icon Chỉnh sửa · Lưu · Gửi Hội đồng; Gửi điều chỉnh đặt bên dưới. */}
        {canNote && <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-1.5">
            <Button type="button" variant="outline" size="icon" className={cn("h-8 w-8 shrink-0", editing && "border-primary/40 bg-accent text-primary")} title="Chỉnh sửa" aria-label={`Chỉnh sửa ${e.id}`} aria-pressed={editing} onClick={() => { if (canScore) setAdjusting(true); setNoteEditing(true); }}><Pencil className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" title="Lưu" aria-label={`Lưu ${e.id}`} disabled={e.step === "cqtt_report" && draft.note === undefined} onClick={saveNote}><Save /></Button>
            {e.step === "cqtt_report" && <Link to="/danh-gia/$id" params={{ id: e.id }} search={{ mode: "edit" }} title="Gửi Hội đồng" aria-label={`Gửi Hội đồng ${e.id}`} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-primary hover:bg-accent"><Send className="h-4 w-4" /></Link>}
          </div>
          {returnButton}
        </div>}
        {feedback && (
          <p role="status" className="mt-2 text-xs">
            {feedback}
          </p>
        )}
      </td>}
    </tr>
  );
}
