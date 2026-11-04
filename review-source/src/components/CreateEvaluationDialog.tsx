import { useState, useRef, type FormEvent } from "react";
import { Plus, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EvaluationDateInput } from "@/components/EvaluationDateInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEvaluations } from "@/components/evaluation-context";
import { allocateCouncilScores, cqttTaskTotal, cqttTotal, totalScore, transition, type Criterion, type Evaluation } from "@/lib/evaluation";

import { CURRENT_USER, USERS, unitLeaders, canSubmitEvaluation, validateSelfSubmission, personalMetadata } from "@/lib/users";

import { SOURCE_TASKS, completedTasks } from "@/lib/source-tasks";

import { CreateEvaluationTable, type FormCriterion } from "@/components/CreateEvaluationTable";
const blankCriterion = (): Criterion => ({ group: "A", goal: "", kpi: "", unit: "", weight: 1, target: { t: "", b: "", s: "" }, result: "", self: 0 });
const selectClass = "h-9 w-full rounded-md border border-input bg-card px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

export function CreateEvaluationDialog({ open, onOpenChange, onCreated, existing }: { existing?: Evaluation; open: boolean; onOpenChange: (open: boolean) => void; onCreated: (evaluation: Evaluation) => void }) {
  const { evaluations, addEvaluation, replaceSelfEvaluation, updateEvaluation } = useEvaluations();
  // Phiếu CQTT gửi điều chỉnh về: cập nhật tại đây, gửi phản hồi CQTT ở màn chi tiết.
  const responding = existing?.step === "response";
  const cqttScore = responding ? (cqttTotal(existing!) ?? (existing!.criteria.every((c) => c.cqtt !== undefined) ? cqttTaskTotal(existing!.criteria) : null)) : null;
  const [responseNote, setResponseNote] = useState(existing?.responseNote ?? "");
  const unit = existing?.unit ?? CURRENT_USER.unit;
  const block = existing?.block ?? CURRENT_USER.block;
  const [performerId, setPerformerId] = useState(existing?.employeeId ?? unitLeaders(USERS, CURRENT_USER)[0]!.employeeId);
  const performers = existing ? USERS.filter((u) => u.employeeId === existing.employeeId) : unitLeaders(USERS, CURRENT_USER);
  const performer = performers.find((person) => person.employeeId === performerId);
  const tasksFor = (group: Criterion["group"]) => completedTasks(SOURCE_TASKS, performerId, group);
  const [quarter, setQuarter] = useState(existing?.period.split("/")[0]?.replace("Quý ", "") ?? "III");
  const [year, setYear] = useState(existing?.period.split("/")[1] ?? "2026");
  const [evaluationDate, setEvaluationDate] = useState(existing?.evaluationDate ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
  const [deadline, setDeadline] = useState(existing?.deadline.split("/").reverse().join("-") ?? "");
  const [criteria, setCriteriaState] = useState<FormCriterion[]>(existing ? existing.criteria.map((c) => ({ ...c, sourceTaskId: SOURCE_TASKS.find((t) => t.employeeId === existing.employeeId && t.criterion.group === c.group && t.criterion.goal === c.goal)?.id })) : [{ ...blankCriterion(), weight: 0.2 }, { ...blankCriterion(), group: "B-I", weight: 0 }, { ...blankCriterion(), group: "B-II", weight: 0 }]);
  const submitIntent = useRef<"draft" | "send" | "send_cqtt">("draft");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Luồng phản hồi CQTT: Tiếp thu (điền điểm CQTT) → Cập nhật → Gửi CQTT.
  const [acceptedResponse, setAcceptedResponse] = useState(existing?.response === "Tiếp thu");
  const [savedResponse, setSavedResponse] = useState(existing?.response === "Tiếp thu");
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
    // Điểm tự đánh giá là số nguyên 1–5 nên làm tròn điểm CQTT phân bổ.
    setCriteriaState(criteria.map((c, i) => ({ ...c, self: Math.min(5, Math.max(1, Math.round((allocated[i]?.council ?? c.self) * 100) / 100)) })));
    setError("");
    setAcceptedResponse(true);
    setSavedResponse(false);
    setNotice("Đã điền điểm QLTT đánh giá (1-5) vào cột tự đánh giá. Bấm Cập nhật để lưu.");
  }
  const weight = Math.round(criteria.reduce((sum, item) => sum + item.weight, 0) * 10000) / 100;

  function reserve() {
    if (!responseNote.trim()) { setError("Vui lòng nhập lý do bảo lưu tại mục Phản hồi CQTT."); return; }
    const issue = updateEvaluation(existing!.id, { response: "Bảo lưu", responseNote: responseNote.trim() }, "respond");
    if (issue) { setError(issue); return; }
    onCreated(existing!);
    onOpenChange(false);
  }
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

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex max-h-[95dvh] w-[calc(100%-2rem)] max-w-[1600px] flex-col overflow-hidden bg-card p-0" aria-describedby={undefined}>
      <DialogHeader className="border-b px-6 py-5 pr-12"><DialogTitle className="tracking-normal">{existing ? "Cập nhật phiếu đánh giá" : "Tạo phiếu đánh giá"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="flex min-h-0 flex-col">
        <div className="min-h-0 space-y-6 overflow-y-auto px-6 py-5">
          <section>
            <h2 className="mb-4 text-sm font-semibold">1. Thông tin chung</h2>
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className="rounded-lg border bg-muted/30 p-4">
                <label className="space-y-1.5 text-sm">Họ và tên <span className="text-primary">*</span><select disabled={!!existing} required className={selectClass} value={performerId} onChange={(event) => {
                setPerformerId(event.target.value);
                setCriteria((current) => current.map((item) => ({ ...blankCriterion(), group: item.group, weight: item.weight })));
              }}><option value="">Chọn người thực hiện</option>{performers.map((person) => <option key={person.employeeId} value={person.employeeId}>{person.name} — {person.employeeId}</option>)}</select></label>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 text-sm">{Object.entries({ employeeId: performer?.employeeId ?? "—", unit: performer?.unit ?? unit, ...personalMetadata(performerId) }).map(([key, value]) => <div key={key}><div className="text-xs text-muted-foreground">{key === "unit" ? "Đơn vị" : key === "employeeId" ? "Mã nhân viên" : key === "jobTitle" ? "Chức danh" : key === "location" ? "Địa điểm làm việc" : "Phiếu giao nhiệm vụ"}</div><div className="mt-1">{value}</div></div>)}</div>
              </div>
              <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm">Khối <span className="text-primary">*</span><Input className="bg-muted/40 shadow-none" readOnly value={block} /></label>
                <div className="grid grid-cols-2 gap-2"><label className="space-y-1.5 text-sm">Kỳ đánh giá <span className="text-primary">*</span><select aria-label="Quý đánh giá" className={selectClass} value={quarter} onChange={(event) => setQuarter(event.target.value)}>{["I", "II", "III", "IV"].map((q) => <option key={q} value={q}>Quý {q}</option>)}</select></label><label className="space-y-1.5 text-sm">Năm <span className="text-primary">*</span><Input aria-label="Năm đánh giá" required type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(event.target.value)} /></label></div>
                <label className="flex min-w-0 flex-col gap-1.5 text-sm"><span>Ngày đánh giá <span className="text-primary">*</span></span><EvaluationDateInput label="Ngày đánh giá" value={evaluationDate} onChange={setEvaluationDate} /></label>
                <label className="flex min-w-0 flex-col gap-1.5 text-sm"><span>Hạn đánh giá <span className="text-primary">*</span></span><EvaluationDateInput label="Hạn đánh giá" value={deadline} onChange={setDeadline} /></label>
              </div>
            </div>
          </section>
          <section className="border-t pt-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2"><h2 className="text-sm font-semibold">2. Đánh giá kết quả thực hiện nhiệm vụ, công việc</h2><span className={weight === 100 ? "text-sm text-success" : "text-sm text-primary"}>Trọng điểm: {Math.round(criteria.filter((c) => c.group === "A").reduce((sum, c) => sum + c.weight, 0) * 100)}% · Chức năng: {Math.round(criteria.filter((c) => c.group !== "A").reduce((sum, c) => sum + c.weight, 0) * 100)}% · Tổng: {weight}% · Tự đánh giá: {totalScore(criteria).toFixed(2)}/5</span></div>
            <Button type="button" variant="outline" className="mb-4" onClick={() => setCriteria(SOURCE_TASKS.filter((task) => task.employeeId === performerId && (task.status === "Đã đóng" || task.status === "Đã kết thúc")).map((task) => ({ ...task.criterion, self: 0, council: undefined, sourceTaskId: task.id })))}>Lấy tất cả nhiệm vụ</Button>
            <CreateEvaluationTable items={criteria} tasksFor={tasksFor} onChange={setCriteria} cqttScore={cqttScore} />
            <Button type="button" variant="outline" className="mt-3" onClick={() => setCriteria((current) => [...current, { ...blankCriterion(), weight: 0 }])}><Plus />Thêm nhiệm vụ</Button>
          </section>
          {responding && <section className="border-t pt-5" aria-label="Phản hồi CQTT">
            <h2 className="mb-3 text-sm font-semibold">3. Phản hồi yêu cầu điều chỉnh của CQTT</h2>
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <div><span className="font-medium">CQTT yêu cầu:</span> {existing!.note || "—"}</div>
              <div className="mt-1"><span className="font-medium">Điểm CQTT:</span> {cqttScore?.toFixed(2) ?? "—"}</div>
            </div>
            <textarea aria-label="Ý kiến phản hồi CQTT" className="min-h-20 w-full rounded-md border bg-card p-3 text-sm" value={responseNote} onChange={(e) => { setResponseNote(e.target.value); setSavedResponse(false); }} placeholder="Nội dung tiếp thu hoặc lý do bảo lưu..." />
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li><span className="font-medium text-foreground">Tiếp thu:</span> điền điểm QLTT đánh giá (1-5) vào cột tự đánh giá (giữ 2 chữ số thập phân), sau đó có thể chỉnh sửa bảng.</li>
              <li><span className="font-medium text-foreground">Cập nhật:</span> lưu dữ liệu đã cập nhật, phiếu vẫn chờ phản hồi.</li>
              <li><span className="font-medium text-foreground">Gửi CQTT:</span> sau khi Cập nhật, gửi CQTT rà soát, chấm điểm lại.</li>
              <li><span className="font-medium text-foreground">Bảo lưu:</span> giữ nguyên dữ liệu đã chấm trước khi CQTT trả về (bỏ qua chỉnh sửa trên bảng); CQTT ghi nhận và giữ nguyên điểm chấm. Bắt buộc nhập lý do.</li>
            </ul>
          </section>}
          {error && <p role="alert" className="text-sm text-primary">{error}</p>}
          {notice && !error && <p role="status" className="text-sm text-success">{notice}</p>}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t bg-card px-6 py-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button type="submit" disabled={responding && !acceptedResponse} onClick={() => { submitIntent.current = "draft"; }} value="draft" variant="outline">{existing ? "Cập nhật" : "Lưu"}</Button>{responding ? <>
          <Button type="button" variant="return" onClick={reserve}><Undo2 />Bảo lưu</Button>
          <Button type="button" variant="outline" onClick={acceptCqtt}>Tiếp thu</Button>
          <Button type="submit" disabled={!acceptedResponse || !savedResponse} onClick={() => { submitIntent.current = "send_cqtt"; }} value="send_cqtt">Gửi CQTT</Button>
        </> : <Button type="submit" onClick={() => { submitIntent.current = "send"; }} value="send">Gửi đánh giá</Button>}</div>
      </form>
    </DialogContent>
  </Dialog>;
}
