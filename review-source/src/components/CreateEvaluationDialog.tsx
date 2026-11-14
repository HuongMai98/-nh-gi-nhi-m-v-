import { useEffect, useState, useRef, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEvaluations } from "@/components/evaluation-context";
import { responseScoreLimits, statusLabelOf, allocateCouncilScores, cqttTaskTotal, cqttTotal, totalScore, transition, type Criterion, type Evaluation } from "@/lib/evaluation";

import { CURRENT_USER, USERS, unitLeaders, canSubmitEvaluation, validateSelfSubmission, personalMetadata } from "@/lib/users";

import { SOURCE_TASKS, quarterTasks } from "@/lib/source-tasks";

import { CreateEvaluationTable, type FormCriterion } from "@/components/CreateEvaluationTable";
const blankCriterion = (): Criterion => ({ group: "A", goal: "", kpi: "", unit: "", weight: 1, target: { t: "", b: "", s: "" }, result: "", self: 0 });
const selectClass = "h-[42px] w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring";
// Bố cục theo trang Thêm mới nhiệm vụ của VOffice: thẻ trắng bo 8px, đệm 20px, bóng nhẹ; tiêu đề thẻ 16px đậm.
const card = "space-y-4 rounded-lg bg-card p-5 shadow-[0_4px_30px_rgba(30,58,138,0.05)]";
const cardTitle = "text-base font-semibold text-foreground";
const fieldLabel = "space-y-2 text-sm font-medium text-secondary-foreground";
const addDaysToDate = (value: string, days: number) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day! + days));
  return date.toISOString().slice(0, 10);
};
/** Chỗ đặt nút Hủy / Lưu / Gửi ở đầu trang (AppShell actions); không có thì hiện ở cuối form. */
export const EVALUATION_FORM_ACTIONS_ID = "evaluation-form-actions";
const FORM_ID = "evaluation-form";

export function CreateEvaluationDialog({ open, onOpenChange, onCreated, existing }: { existing?: Evaluation; open: boolean; onOpenChange: (open: boolean) => void; onCreated: (evaluation: Evaluation) => void }) {
  const { previewRole, evaluations, addEvaluation, replaceSelfEvaluation, updateEvaluation } = useEvaluations();
  // Phiếu CQTT gửi điều chỉnh về: cập nhật tại đây, gửi phản hồi CQTT ở màn chi tiết.
  const responding = existing?.step === "response";
  const cqttScore = responding ? (cqttTotal(existing!) ?? (existing!.criteria.every((c) => c.cqtt !== undefined) ? cqttTaskTotal(existing!.criteria) : null)) : null;
  const [responseNote, setResponseNote] = useState(existing?.responseNote ?? "");
  const unit = existing?.unit ?? CURRENT_USER.unit;
  const block = existing?.block ?? CURRENT_USER.block;
  const [performerId, setPerformerId] = useState(existing?.employeeId ?? unitLeaders(USERS, CURRENT_USER)[0]!.employeeId);
  const performers = existing ? USERS.filter((u) => u.employeeId === existing.employeeId) : unitLeaders(USERS, CURRENT_USER);
  const performer = performers.find((person) => person.employeeId === performerId);
    const [quarter, setQuarter] = useState(existing?.period.split("/")[0]?.replace("Quý ", "") ?? "III");
  const [year, setYear] = useState(existing?.period.split("/")[1] ?? "2026");
  const taskUnit = performer?.unit ?? unit;
  const tasksFor = (group: Criterion["group"]) => quarterTasks(SOURCE_TASKS, taskUnit, quarter, year, group);
  const evaluationDate = existing?.evaluationDate ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [deadline] = useState(existing?.deadline.split("/").reverse().join("-") ?? addDaysToDate(evaluationDate, 14));
  const [criteria, setCriteriaState] = useState<FormCriterion[]>(existing ? existing.criteria.map((c) => ({ ...c, sourceTaskId: SOURCE_TASKS.find((t) => t.unit === existing.unit && t.criterion.group === c.group && t.criterion.goal === c.goal)?.id })) : quarterTasks(SOURCE_TASKS, taskUnit, quarter, year).map((task) => ({ ...task.criterion, self: 0, council: undefined, sourceTaskId: task.id })));
  const [personalInfoOpen, setPersonalInfoOpen] = useState(true);
  const submitIntent = useRef<"draft" | "send" | "send_cqtt">("draft");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Luồng phản hồi CQTT: Tiếp thu (điền điểm CQTT) → Cập nhật → Gửi CQTT.
  const [acceptedResponse, setAcceptedResponse] = useState(existing?.response === "Tiếp thu");
  const [savedResponse, setSavedResponse] = useState(existing?.response === "Tiếp thu");
  useEffect(() => {
    if (!open || existing) return;
    setCriteriaState(quarterTasks(SOURCE_TASKS, taskUnit, quarter, year).map((task) => ({ ...task.criterion, self: 0, council: undefined, sourceTaskId: task.id })));
    setError("");
  }, [open, existing?.id, taskUnit, quarter, year]);
  const setCriteria = (change: FormCriterion[] | ((current: FormCriterion[]) => FormCriterion[])) => {
    const next = typeof change === "function" ? change(criteria) : change;
    if (next.filter((c) => c.group !== "A").reduce((sum, c) => sum + c.weight, 0) > 0.8 + 1e-8) {
      setError("Tổng tỷ trọng nhóm B.I + B.II không được vượt 80%.");
      return;
    }
    setError("");
    setCriteriaState(next);
    setSavedResponse(false);
  };
  function acceptCqtt() {
    let allocated: Criterion[];
    try { allocated = criteria.length && criteria.every((c) => c.cqtt !== undefined) ? criteria.map((c) => ({ ...c, council: c.cqtt })) : allocateCouncilScores(criteria, cqttScore ?? undefined); }
    catch (e) { setError(e instanceof Error ? e.message : "Không phân bổ được điểm CQTT."); return; }
    const limits = responseScoreLimits(existing!, criteria);
    setCriteriaState(criteria.map((c, i) => ({ ...c, self: Math.min(5, Math.max(1, Math.round((limits[i] ?? allocated[i]?.council ?? c.self) * 100) / 100)) })));
    setError("");
    setAcceptedResponse(true);
    setSavedResponse(false);
    setNotice("Đã điền điểm QLTT đánh giá (1-5) vào cột tự đánh giá. Bấm Cập nhật để lưu.");
  }
  const weight = Math.round(criteria.reduce((sum, item) => sum + item.weight, 0) * 10000) / 100;
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null);
  useEffect(() => { setActionsSlot(document.getElementById(EVALUATION_FORM_ACTIONS_ID)); }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!unit.trim() || !performer || criteria.some((item) => !item.goal.trim() || !item.kpi.trim())) {
      setError("Vui lòng nhập đầy đủ các trường bắt buộc.");
      return;
    }
    if (criteria.some((item) => !tasksFor(item.group).some((task) => task.id === item.sourceTaskId))) { setError("Vui lòng chọn nhiệm vụ đã kết thúc hoặc đã đóng đúng nhóm của người thực hiện."); return; }
    if (new Set(criteria.map((c) => c.sourceTaskId)).size !== criteria.length) { setError("Mỗi nhiệm vụ chỉ được chọn một lần."); return; }
    const intent = submitIntent.current;
    const send = intent === "send";
    submitIntent.current = "draft";
    if (responding) {
      const updatedCriteria = criteria.map(({ sourceTaskId: _sourceTaskId, ...c }) => c);
      const accepted = { criteria: updatedCriteria, response: "Tiếp thu" as const, responseNote: responseNote.trim() };
      // Cập nhật: lưu, phiếu vẫn chờ phản hồi; Gửi CQTT mới chuyển phiếu sang CQTT chấm lại.
      const issue = intent === "send_cqtt"
        ? updateEvaluation(existing!.id, accepted, "respond")
        : updateEvaluation(existing!.id, acceptedResponse ? accepted : { criteria: updatedCriteria, responseNote });
      if (issue) { setError(issue); return; }
      if (intent !== "send_cqtt") { setSavedResponse(true); setNotice("Đã lưu cập nhật. Bấm Gửi CQTT để gửi CQTT rà soát, chấm điểm lại."); return; }
      onCreated({ ...existing!, criteria: updatedCriteria });
      onOpenChange(false);
      return;
    }
    const [y, m, d] = deadline.split("-");
    const period = `Quý ${quarter}/${year}`;
    const prefix = `DG-${year}-Q${["I", "II", "III", "IV"].indexOf(quarter) + 1}-`;
    let sequence = 1;
    while (evaluations.some((item) => item.id === `${prefix}${String(sequence).padStart(3, "0")}`)) sequence += 1;
    const evaluation: Evaluation = {
      ...existing,
      id: existing?.id ?? `${prefix}${String(sequence).padStart(3, "0")}`, unit: unit.trim(), block, owner: performer!.name, employeeId: performer!.employeeId, period,
      ...personalMetadata(performerId),
      evaluationDate,
      deadline: `${d}/${m}/${y}`, updated: new Date().toLocaleString("vi-VN"), step: "self", criteria,
    };
    let created = evaluation;
    if (send) {
      if (!canSubmitEvaluation(evaluation, CURRENT_USER)) { setError("Chỉ người thực hiện hoặc người cùng đơn vị được gửi tổng hợp."); return; }
      const issue = validateSelfSubmission(evaluation);
      if (issue) { setError(issue); return; }
      try { created = transition(evaluation, "performer", "submit", {}, evaluation.updated); }
      catch (error) { setError(error instanceof Error ? error.message : "Không thể gửi tổng hợp."); return; }
    }
    created.history = [...(created.history ?? [])].map((entry) => ({ ...entry, actorName: CURRENT_USER.name, actorId: CURRENT_USER.employeeId }));
    if (!send) created.history.push({ at: evaluation.updated, role: "performer", action: "Tạo phiếu nháp", note: "", before: "{}", after: JSON.stringify({ step: created.step }), actorName: CURRENT_USER.name, actorId: CURRENT_USER.employeeId });
    if (existing) {
      const issue = replaceSelfEvaluation(created);
      if (issue) { setError(issue); return; }
    } else addEvaluation(created);
    onCreated(created);
    onOpenChange(false);
  }

  if (!open) return null;

  const actions = <>
    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
    <Button type="submit" form={FORM_ID} disabled={responding && !acceptedResponse} onClick={() => { submitIntent.current = "draft"; }} value="draft" variant="outline">{existing ? "Cập nhật" : "Lưu"}</Button>
    {responding ? <>
      <Button type="button" variant="outline" onClick={acceptCqtt}>Tiếp thu</Button>
      <Button type="submit" form={FORM_ID} disabled={!acceptedResponse || !savedResponse} onClick={() => { submitIntent.current = "send_cqtt"; }} value="send_cqtt"><Send />Gửi CQTT</Button>
    </> : <Button type="submit" form={FORM_ID} onClick={() => { submitIntent.current = "send"; }} value="send"><Send />Gửi đánh giá</Button>}
  </>;
  const title = existing ? "Cập nhật phiếu đánh giá" : "Tạo phiếu đánh giá";
  return <form id={FORM_ID} onSubmit={submit} aria-label={title} className="space-y-4">
    <h2 className="sr-only">{title}</h2>
    <div className="space-y-4">
      <section className={card} aria-label="Thông tin người đánh giá">
        <button type="button" aria-expanded={personalInfoOpen} onClick={() => setPersonalInfoOpen((open) => !open)} className="flex w-full items-center justify-between gap-3 text-left">
          <span className={cardTitle}>Thông tin người đánh giá</span>
          <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-muted-foreground transition-transform ${personalInfoOpen ? "rotate-180" : ""}`} />
        </button>
        {personalInfoOpen && <div className="grid grid-cols-1 items-start gap-x-5 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <label className={fieldLabel + " block"}>Họ và tên <span className="text-primary">*</span><select disabled={!!existing} required className={selectClass + " font-normal text-foreground"} value={performerId} onChange={(event) => {
            setPerformerId(event.target.value);
            setCriteria((current) => current.map((item) => ({ ...blankCriterion(), group: item.group, weight: item.weight })));
          }}><option value="">Chọn người thực hiện</option>{performers.map((person) => <option key={person.employeeId} value={person.employeeId}>{person.name} — {person.employeeId}</option>)}</select></label>
          {[['Đơn vị', performer?.unit ?? unit], ['Chức danh', personalMetadata(performerId).jobTitle], ['Phiếu giao nhiệm vụ', personalMetadata(performerId).assignmentRef]].map(([label, value]) => <label key={label} className={fieldLabel}>{label}<Input aria-label={label} disabled value={value || "—"} className="h-[42px] bg-muted/30 font-normal text-foreground opacity-100 disabled:cursor-default disabled:opacity-100" /></label>)}
          <label className={fieldLabel}>Kỳ đánh giá <span className="text-primary">*</span><select aria-label="Quý đánh giá" className={selectClass + " font-normal text-foreground"} value={quarter} onChange={(event) => setQuarter(event.target.value)}>{["I", "II", "III", "IV"].map((q) => <option key={q} value={q}>Quý {q}</option>)}</select></label>
          <label className={fieldLabel}>Năm <span className="text-primary">*</span><Input aria-label="Năm đánh giá" className="h-[42px] font-normal" required type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(event.target.value)} /></label>
          {existing && <div><div className="text-xs text-muted-foreground">Trạng thái</div><div className="mt-1 font-medium">{statusLabelOf(existing)}</div></div>}
        </div>}
      </section>
      <div className={card + " -mx-4 min-w-0"}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"><h3 className={cardTitle}>Đánh giá kết quả thực hiện nhiệm vụ, công việc</h3><span className={weight === 100 ? "text-sm text-success" : "text-sm text-primary"}>Trọng điểm: {Math.round(criteria.filter((c) => c.group === "A").reduce((sum, c) => sum + c.weight, 0) * 100)}% · Chức năng: {Math.round(criteria.filter((c) => c.group !== "A").reduce((sum, c) => sum + c.weight, 0) * 100)}% · Tổng: {weight}% · Tự đánh giá: {totalScore(criteria).toFixed(2)}/5</span></div>
        <CreateEvaluationTable items={criteria} tasksFor={tasksFor} onChange={setCriteria} cqttScore={cqttScore} {...(responding ? { cqttLimits: responseScoreLimits(existing!, criteria), onCopyQltt: previewRole === "performer" ? acceptCqtt : undefined } : {})} />
        {responding && <section className="border-t pt-5" aria-label="Phản hồi CQTT">
          <h3 className={cardTitle + " mb-3"}>Phản hồi yêu cầu điều chỉnh của CQTT</h3>
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <div><span className="font-medium">CQTT yêu cầu:</span> {existing!.note || "—"}</div>
            <div className="mt-1"><span className="font-medium">Điểm CQTT:</span> {cqttScore?.toFixed(2) ?? "—"}</div>
          </div>
          <textarea aria-label="Ý kiến phản hồi CQTT" className="min-h-20 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm shadow-xs" value={responseNote} onChange={(e) => { setResponseNote(e.target.value); setSavedResponse(false); }} placeholder="Nội dung tiếp thu..." />
        </section>}
        {error && <p role="alert" className="text-sm text-primary">{error}</p>}
        {notice && !error && <p role="status" className="text-sm text-success">{notice}</p>}
      </div>
    </div>
    {actionsSlot ? createPortal(actions, actionsSlot) : <div className="flex justify-end gap-2">{actions}</div>}
  </form>;
}
