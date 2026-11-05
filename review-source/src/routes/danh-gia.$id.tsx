import { CURRENT_USER, canSubmitEvaluation } from "@/lib/users";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronDown, ClipboardCheck, Copy, Pencil, Download, MessageSquare, Save, Send, Undo2 } from "lucide-react";
import { AppShell, StatusPill, statusStepClasses } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { AggregateForm, exportCsv, fieldClass, LABOR } from "@/components/AggregateForm";
import { useEvaluations } from "@/components/evaluation-context";
import { roleOf, statusLabelOf,
  STATUS,
  STEPS,
  MAIN_STEPS,
  mainStage,
  ROLES,
  stageRole,
  officeFor,
  selfEditable,
  totalScore,
  allocatedTotal,
  cqttTaskTotal,
  cqttGroupsFromTasks,
  cqttTaskScores,
  cqttTotal,
  councilAutoKi,
  rating,
  templateResult,
  getEvaluation,
  type Evaluation,
  type Criterion,
  type Action,
  type Draft,
} from "@/lib/evaluation";
import { CreateEvaluationDialog } from "@/components/CreateEvaluationDialog";
import { STAGES, handlerFor, returnLabel, slaFor, slaLabel, stageOf, type StageKey } from "@/lib/workflow";
import { cn } from "@/lib/utils";
export const Route = createFileRoute("/danh-gia/$id")({
  validateSearch: (search: Record<string, unknown>): { mode?: "edit" } => search["mode"] === "edit" ? { mode: "edit" } : {},
  loader: ({ params }) => getEvaluation(params.id) ?? null,
  head: () => ({ meta: [
    { title: "Phiếu đánh giá — vOffice" },
    { name: "description", content: "Chi tiết kết quả nhiệm vụ, điểm đánh giá và lịch sử xử lý phiếu trên vOffice." },
    { property: "og:title", content: "Phiếu đánh giá — vOffice" },
    { property: "og:description", content: "Chi tiết kết quả nhiệm vụ, điểm đánh giá và lịch sử xử lý phiếu trên vOffice." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Detail,
});
function Detail() {
  const { evaluations, previewRole } = useEvaluations();
  const { id } = Route.useParams();
  const loaded = Route.useLoaderData();
  const { mode } = Route.useSearch();
  const navigate = Route.useNavigate();
  const ev = evaluations.find((e) => e.id === id) ?? loaded;
  if (!ev) throw notFound();
  const editAllowed = ev.step !== "done" && roleOf(ev) === previewRole && (ev.step !== "self" || canSubmitEvaluation(ev, CURRENT_USER));
  const showView = () => { void navigate({ search: {} }); };
  if (mode === "edit" && (ev.step === "self" || ev.step === "response") && editAllowed) return <AppShell title="Chỉnh sửa đánh giá" crumbs={<><Link to="/" className="hover:text-foreground">Đánh giá</Link><span>›</span><span>Chỉnh sửa đánh giá</span></>}><CreateEvaluationDialog key={ev.id} existing={ev} open onOpenChange={(open) => { if (!open) showView(); }} onCreated={showView} /></AppShell>;
  return (
    <EvaluationDetail
      key={`${ev.id}-${ev.updated}-${ev.history?.length ?? 0}-${ev.step}-${previewRole}-${mode ?? "view"}`}
      ev={ev}
      readOnly={mode !== "edit" || !editAllowed}
      onEdit={editAllowed ? () => { void navigate({ search: { mode: "edit" } }); } : undefined}
      onCqttFinished={() => { void navigate({ to: "/", search: { cqtt: "report" } }); }}
      onCouncilSaved={() => { void navigate({ to: "/", search: { council: "completed" } }); }}
    />
  );
}
export function EvaluationDetail({ ev, readOnly = false, onEdit, onCqttFinished, onCouncilSaved }: { ev: Evaluation; readOnly?: boolean; onEdit?: (() => void) | undefined; onCqttFinished?: (() => void) | undefined; onCouncilSaved?: (() => void) | undefined }) {
  const { previewRole, updateEvaluation, workflows } = useEvaluations();
  const [tab, setTab] = useState<"personal" | "kpi" | "ki" | "appendix" | "assignment">(
    (previewRole === "cqtt" && ev.step === "cqtt" || previewRole === "council" && ["council", "council_adjust"].includes(ev.step)) && !readOnly
      ? "personal"
      : ["council", "council_adjust", "ceo"].includes(ev.step)
        ? "ki"
        : ["cqtt", "cqtt_report", "office"].includes(ev.step)
          ? "kpi"
          : "personal",
  );
  const [items, setItems] = useState<Criterion[]>(ev.criteria.map((c) => ({ ...c, council: previewRole === "council" && !ev.councilReviewed && !ev.councilTaskScored ? undefined : c.council })));
  const [aggregateDraft, setAggregateDraft] = useState<Draft>({});
  const [cqttTouched, setCqttTouched] = useState(false);
  const [note, setNote] = useState("");
  const [response, setResponse] = useState<"Tiếp thu" | "Bảo lưu">(ev.response ?? "Tiếp thu");
  const [responseNote, setResponseNote] = useState(ev.responseNote ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const own = !readOnly && roleOf(ev) === previewRole && (ev.step !== "self" || canSubmitEvaluation(ev, CURRENT_USER));
  const canSelf = own && selfEditable(ev, previewRole);
  const canRespond = own && ev.step === "response";
  // CQTT chấm từng công việc ngay trên form Phiếu đánh giá, cột QLTT đánh giá.
  const canCqttTasks = own && ev.step === "cqtt";
  const canCouncilTasks = own && previewRole === "council" && ["council", "council_adjust"].includes(ev.step);
  const showCouncilTasks = previewRole !== "performer" && (previewRole === "council" || !!ev.councilTaskScored);
  const qlttSummaryScore = ["council", "council_adjust", "ceo", "approved", "dispatch", "sign", "done"].includes(ev.step)
    ? allocatedTotal(items)
    : items.some(c => c.cqtt !== undefined) ? cqttTaskTotal(items) : cqttTotal(ev);
  // Điểm QLTT đã lưu hiển thị chỉ đọc; bấm Chỉnh sửa để sửa tiếp trước khi Hoàn tất đánh giá.
  const [cqttEditing, setCqttEditing] = useState(!ev.criteria.some((c) => c.cqtt !== undefined));
  const cqttInputs = canCqttTasks && cqttEditing;
  // Đánh giá tuân thủ: CQTT, Hội đồng, TGĐ đều được đánh giá ở bước của mình.
  const canCompliance = own && ["cqtt", "council", "council_adjust", "ceo"].includes(ev.step);
  const [compliance, setCompliance] = useState({
    locationCompliance: ev.locationCompliance ?? "",
    laborCompliance: ev.laborCompliance ?? "",
    cultureCompliance: ev.cultureCompliance ?? "",
  });
  const [complianceTouched, setComplianceTouched] = useState(false);
  const councilPreview = showCouncilTasks && ["council", "council_adjust"].includes(ev.step);
  const cqttPreview = previewRole === "cqtt" && ["cqtt", "cqtt_report", "response"].includes(ev.step);
  const councilScore = cqttPreview ? cqttTaskTotal(items) : allocatedTotal(items);
  const councilReady = councilScore !== null && items.length > 0 && items.every(c => {
    const score = cqttPreview ? c.cqtt : c.council;
    return score !== undefined && Number.isFinite(score) && score >= 1 && score <= 5;
  })
    && !!compliance.locationCompliance && !!compliance.laborCompliance;
  const preview: Evaluation = {
    ...ev, ...compliance, criteria: items,
    councilScore: councilReady ? councilScore! : undefined,
    ki: undefined, councilReviewed: councilReady,
    approvedScore: undefined, approvedKi: undefined,
  };
  if (councilReady) preview.ki = councilAutoKi(preview);
  const result = templateResult(councilPreview || cqttPreview ? preview : ev);
  // Trả về theo cấu hình luồng duyệt: người xử lý chọn bước đích trong danh sách được phép.
  const flow = workflows[ev.block];
  const fromStage = stageOf(ev.step);
  const currentCustom = ev.step === "custom" ? flow.customStages?.find((s) => s.id === ev.customStageId) : undefined;
  const allowedReturns: StageKey[] = !own
    ? []
    : ev.step === "custom"
      ? (currentCustom?.returnTo ?? [])
      // CQTT gửi điều chỉnh ở màn Tổng hợp đánh giá (kèm lý do), không gửi từ phiếu.
      : ["office", "council", "council_adjust", "ceo"].includes(ev.step)
        ? (flow.stages.find((s) => s.key === fromStage)?.returnTo ?? [])
        : [];
  const [returnStage, setReturnStage] = useState<StageKey | "">("");
  const chosenReturn = allowedReturns.includes(returnStage as StageKey) ? (returnStage as StageKey) : allowedReturns[0];
  const returnAction: Action = ev.step === "cqtt" ? "request" : "return";
  const returnText =
    allowedReturns.length !== 1 ? "Trả về" : ev.step === "custom" ? `Trả về ${handlerFor(ev.block, allowedReturns[0]!)}` : returnLabel(ev.block, fromStage, allowedReturns[0]!);
  const run = (action?: Action) => {
    let patch: Draft =
      own && (["office", "cqtt", "council", "council_adjust"].includes(ev.step) || (ev.step === "ceo" && action === "approve"))
        ? aggregateDraft
        : {};
    if ((canCqttTasks || canCouncilTasks) && (cqttTouched || (canCouncilTasks && action === "finish" && tab === "personal"))) patch = { ...patch, criteria: items };
    // Gửi điều chỉnh từ phiếu: đã đánh giá đủ từng công việc thì tổng hợp luôn điểm để CQĐV/CQ tham chiếu.
    // Hoàn tất đánh giá thì chưa tổng hợp: CQTT bấm Tổng hợp ở màn danh sách.
    if (canCqttTasks && action === "request") {
      const groups = cqttGroupsFromTasks(items);
      if (groups) patch = { ...patch, criteria: items, ...groups };
    }
    if (canCompliance && complianceTouched && action !== "return")
      patch = {
        ...patch,
        ...Object.fromEntries(Object.entries(compliance).map(([k, v]) => [k, v || undefined])),
      };
    if (canSelf) patch = { criteria: items };
    else if (canRespond) patch = { criteria: items, response, responseNote };
    else if (action === "return") patch = { note, ...(chosenReturn ? { returnStage: chosenReturn } : {}) };
    else if (ev.step === "cqtt" && own && action === "request") patch = { ...patch, ...(note.trim() ? { note } : {}), ...(chosenReturn ? { returnStage: chosenReturn } : {}) };
    else if (ev.step === "cqtt" && own && note.trim()) patch = { ...patch, note };
    const issue = updateEvaluation(ev.id, patch, action);
    setError(issue ?? "");
    setMessage(
      issue ? "" : action === "finish" && (canCqttTasks || canCouncilTasks) ? "Đã lưu điểm QLTT đánh giá và hoàn tất đánh giá." : action ? "Đã chuyển hồ sơ." : "Đã lưu.",
    );
    if (!issue) { setCqttTouched(false); setComplianceTouched(false); if (items.some((c) => c.cqtt !== undefined)) setCqttEditing(false); }
    if (!issue && canCouncilTasks && action === "finish") onCouncilSaved?.();
    // CQTT Hoàn tất đánh giá → về Danh sách, bộ lọc Đã hoàn tất đánh giá để tổng hợp.
    if (!issue && action === "finish" && previewRole === "cqtt") onCqttFinished?.();
  };
  const actions: { action: Action; label: string; outline?: boolean }[] = !own
    ? []
    : ev.step === "self"
      ? [{ action: "submit", label: "Gửi đánh giá" }]
      : ev.step === "office"
        ? []
        : ev.step === "cqtt"
          ? [{ action: "finish", label: "Hoàn tất đánh giá" }]
          : ev.step === "response"
            ? [{ action: "respond", label: "Gửi phản hồi CQTT" }]
            : ev.step === "cqtt_report"
              ? [{ action: "send", label: "Gửi báo cáo Hội đồng" }]
              : ["council", "council_adjust"].includes(ev.step)
                ? [
                    {
                      action: "finish",
                      label: "Hoàn tất đánh giá",
                    },
                  ]
                : ev.step === "ceo"
                  ? [{ action: "approve", label: "Phê duyệt" }]
                  : ev.step === "approved"
                    ? [{ action: "send", label: `Gửi kết quả về ${officeFor(ev)}` }]
                    : ev.step === "dispatch"
                      ? [{ action: "send", label: "Gửi kết quả CQĐV/CQ" }]
                      : ev.step === "sign"
                        ? [{ action: "sign", label: "Trình ký phiếu ĐG kèm phiếu GNV" }]
                        : ev.step === "custom"
                          ? [{ action: "send", label: "Duyệt" }]
                          : [];
  // Nút trả về chỉ hiện khi bước hiện tại được cấu hình cho phép trả về.
  const visibleActions = allowedReturns.length
    ? [{ action: returnAction, label: returnText, outline: true }, ...actions]
    : actions;
  function downloadTemplate() {
    exportCsv(`Template-${ev.id}`, [
      ["Phiếu", ev.id],
      ["Cá nhân", ev.owner],
      ["Đơn vị", ev.unit],
      ["Kỳ", ev.period],
      ["Phiếu GNV", ev.assignmentRef],
      ["Điểm Hội đồng", result.score],
      ["Ki", result.ki],
      ["Mức độ hoàn thành", result.completion],
      [],
      [
        "Mục tiêu",
        "KPI",
        "Phương pháp đo",
        "Đơn vị",
        "Tỷ trọng",
        "T",
        "B",
        "S",
        "Ngày bắt đầu",
        "Ngày hoàn thành",
        "Kết quả",
        "CBNV tự đánh giá",
        "QLTT đánh giá (1-5)",
      ],
      ...ev.criteria.map((c) => [
        c.goal,
        c.kpi,
        c.method,
        c.unit,
        c.weight,
        c.target.t,
        c.target.b,
        c.target.s,
        c.startDate,
        c.endDate,
        c.result,
        c.self,
        c.council,
      ]),
    ]);
  }
  const active: string = ev.step === "custom" ? `custom:${ev.customStageId}` : mainStage(ev.step);
  // Tiến trình theo cấu hình luồng duyệt: chỉ hiện bước đang áp dụng (kèm bước tùy chỉnh); bước đã tắt bị bỏ qua.
  const stageForMain = (key: string): StageKey | null => (key === "approved" || key.startsWith("custom:") ? null : (key as StageKey));
  const shownSteps: { key: string; label: string; actor: string }[] = MAIN_STEPS.filter((s) => {
    const stage = stageForMain(s.key);
    return !stage || s.key === active || flow.stages.find((x) => x.key === stage)?.enabled;
  }).flatMap((s) => [
    s,
    ...(flow.customStages ?? [])
      .filter((cs) => cs.after === s.key && (cs.enabled || active === `custom:${cs.id}`))
      .map((cs) => ({ key: `custom:${cs.id}`, label: cs.name, actor: cs.handler })),
  ]);
  const activeIndex = shownSteps.findIndex((s) => s.key === active);
  const sla = slaFor(ev);
  return (
    <AppShell
      crumbs={
        <>
          <Link to="/">Đánh giá</Link>
          <span>›</span>
          <span>{ev.id}</span>
        </>
      }
      title={`${readOnly ? "Xem đánh giá" : "Chỉnh sửa đánh giá"} – ${ev.unit}`}
      actions={
        <>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download />
            Xuất template CSV
          </Button>
          {readOnly && onEdit && ((previewRole === "cqtt" && ev.step === "cqtt" || previewRole === "council" && ["council", "council_adjust"].includes(ev.step)) ? <Button onClick={onEdit}><ClipboardCheck />Đánh giá</Button> : <Button variant="outline" onClick={onEdit}><Pencil />Chỉnh sửa</Button>)}
          {readOnly && ev.step === "self" && previewRole === "performer" && canSubmitEvaluation(ev, CURRENT_USER) && <Button onClick={() => run("submit")}><Send />Gửi đánh giá</Button>}
          {canCqttTasks && !cqttEditing && (
            <Button variant="outline" onClick={() => { setCqttEditing(true); setTab("personal"); }}>
              <Pencil />
              Chỉnh sửa
            </Button>
          )}
          {(canSelf || canRespond || ((cqttInputs || canCouncilTasks) && tab === "personal") || (canCompliance && complianceTouched)) && (
            <Button variant="outline" onClick={() => run()}>
              <Save />
              Lưu
            </Button>
          )}
          {visibleActions.map((a) => (
            <Button
              key={a.action}
              variant={a.outline ? "return" : "default"}
              onClick={() => run(a.action)}
            >
              {a.outline ? <Undo2 /> : a.action === "approve" ? <Check /> : <Send />}
              {a.label}
            </Button>
          ))}
        </>
      }
    >
      {error && (
        <p role="alert" className="mb-4 rounded-md border border-primary p-3 text-sm text-primary">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mb-4 text-sm text-success">
          {message}
        </p>
      )}
      <ol
        aria-label="Tiến trình đánh giá"
        className="mb-5 flex overflow-x-auto rounded-lg border p-4"
      >
        {shownSteps.map((s, i) => {
          const complete = i < activeIndex || active === "approved";
          const current = s.key === active;
          return (
            <li
              key={s.key}
              aria-current={current ? "step" : undefined}
              className="flex min-w-44 flex-1 items-center gap-3"
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                  complete
                    ? "border-success bg-success text-primary-foreground"
                    : current
                      ? statusStepClasses[STATUS[ev.step].tone]
                      : "border-border text-muted-foreground",
                )}
              >
                {complete ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <div className="text-xs leading-tight">
                <div
                  className={cn(
                    "font-medium",
                    current && !complete && "font-semibold text-foreground",
                  )}
                >
                  {s.label}
                </div>
                <div className="mt-0.5 text-muted-foreground">
                  {stageForMain(s.key) ? handlerFor(ev.block, stageForMain(s.key)!) : s.actor}
                </div>
                {current && sla && (
                  <div className={cn("mt-1 font-medium", sla.overdue ? "text-primary" : "text-muted-foreground")}>
                    Hạn {sla.due.toLocaleDateString("vi-VN")} · {slaLabel(sla)}
                  </div>
                )}
              </div>
              {i < shownSteps.length - 1 && (
                <div
                  className={cn("mx-1 h-px min-w-5 flex-1", complete ? "bg-success" : "bg-border")}
                />
              )}
            </li>
          );
        })}
      </ol>
      {previewRole === "office" && (
        <p className="mb-4 rounded-md bg-info-soft px-3 py-2 text-sm text-info">
          Gửi chung các phiếu đang tổng hợp tại tab <b>Tổng hợp đánh giá</b> trên màn hình danh
          sách.{" "}
          <Link to="/" className="font-medium underline">
            Mở bảng Tổng hợp đánh giá
          </Link>
        </p>
      )}
      {!own && ev.step !== "done" && (
        <p className="mb-4 text-sm text-muted-foreground">
          {readOnly ? "Chế độ xem đánh giá." : `Chọn vai trò ${ROLES[roleOf(ev)]} để xử lý bước hiện tại.`}
        </p>
      )}
      {canRespond && (
        <section className="mb-5 space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">Phản hồi CQTT</h2>
          <label className="block text-sm">
            Hình thức phản hồi{" "}
            <select
              aria-label="Hình thức phản hồi"
              className={fieldClass}
              value={response}
              onChange={(e) => setResponse(e.target.value as "Tiếp thu" | "Bảo lưu")}
            >
              <option>Tiếp thu</option>
              <option>Bảo lưu</option>
            </select>
          </label>
          <textarea
            aria-label="Nội dung phản hồi"
            className="min-h-24 w-full rounded-md border p-3 text-sm"
            value={responseNote}
            onChange={(e) => setResponseNote(e.target.value)}
            placeholder="Nội dung tiếp thu hoặc giải trình bảo lưu..."
          />
          <p className="text-xs text-muted-foreground">
            Bổ sung kết quả thực hiện tại tab Phiếu đánh giá. Điểm tự đánh giá và điểm CQTT giữ
            nguyên.
          </p>
        </section>
      )}
      {own && ["cqtt", "council", "council_adjust"].includes(ev.step) && (
        <p className="mb-4 text-sm text-info">
          Thay đổi trên bảng tổng hợp được lưu khi chọn Lưu hoặc chuyển bước/trình duyệt.
        </p>
      )}
      {(ev.step === "response" || ev.step === "council_adjust") && <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{ev.step === "response" ? "CQTT yêu cầu phản hồi. CQ/CQĐV bấm Chỉnh sửa đánh giá để Tiếp thu (cập nhật dữ liệu, gửi CQTT chấm lại) hoặc Bảo lưu (CQTT ghi nhận, giữ nguyên điểm chấm)." : "TGĐ yêu cầu điều chỉnh. Hội đồng cập nhật đánh giá và trình lại TGĐ."}</p>}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <details open className="group mb-4 overflow-hidden rounded-lg border">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 bg-muted/40 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <div><span className="text-sm font-semibold">Thông tin đánh giá</span><span className="ml-3 text-sm text-muted-foreground">{ev.owner} · {ev.period}</span></div>
              <span className="flex items-center gap-2 text-xs text-muted-foreground"><span className="group-open:hidden">Mở rộng</span><span className="hidden group-open:inline">Thu gọn</span><ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></span>
            </summary>
            <div className="space-y-4 border-t p-4">
          <section aria-label="Thông tin người thực hiện">
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {[["Họ và tên", ev.owner], ["Mã nhân viên", ev.employeeId], ["Đơn vị", ev.unit], ["Chức danh", ev.jobTitle], ["Địa điểm làm việc", ev.location], ["Phiếu giao nhiệm vụ", ev.assignmentRef]].map(([label, value]) => <div key={label}><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-medium">{value || "—"}</div></div>)}
            </div>
          </section>
          <div className="grid grid-cols-2 gap-4 border-t pt-4 text-sm lg:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground">Kỳ đánh giá</div>
              <div className="mt-1 font-medium">{ev.period}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Khối</div>
              <div className="mt-1 font-medium">{ev.block}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Trạng thái</div>
              <div className="mt-1">
                <StatusPill tone={STATUS[ev.step].tone}>{statusLabelOf(ev)}</StatusPill>
              </div>
            </div>
            <div><div className="text-xs text-muted-foreground">Ngày đánh giá</div><div className="mt-1 font-medium">{ev.evaluationDate?.split("-").reverse().join("/") ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Hạn đánh giá</div><div className="mt-1 font-medium">{ev.deadline}</div></div>
          </div>
            </div>
          </details>
          <div
            className="mb-4 flex flex-wrap gap-1 border-b"
            role="tablist"
            aria-label="Form hồ sơ"
          >
            {(
              [
                ["personal", "Phiếu đánh giá"],
                ["kpi", "Tổng hợp đánh giá"],
                ["ki", "Tổng hợp KPI"],
              ] as const
            )
              .filter(([key]) => ev.step !== "office" || key === "personal" || key === "kpi")
              .map(([key, label]) => (
                <button
                  role="tab"
                  aria-selected={tab === key}
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "px-4 py-3 text-sm",
                    tab === key
                      ? "border-b-2 border-primary font-semibold text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
          </div>
          {tab === "kpi" || tab === "ki" || tab === "appendix" ? (
            <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0"><AggregateForm evaluations={[ev]} mode={tab} onDraftChange={setAggregateDraft} /></fieldset>
          ) : (
            <section className="space-y-4">
              {tab === "personal" && <h2 className="font-semibold">Phiếu đánh giá kết quả thực hiện nhiệm vụ/công việc</h2>}
              <PersonalTable
                items={items}
                assignment={tab === "assignment"}
                canSelf={canSelf && tab === "personal"}
                canResult={(canSelf || canRespond) && tab === "personal"}
                canCqtt={cqttInputs && tab === "personal"}
                showCouncil={showCouncilTasks}
                canCouncil={canCouncilTasks && tab === "personal"}
                cqttRef={ev.step === "response" || showCouncilTasks ? cqttTaskScores(ev.criteria, cqttTotal(ev)) : null}
                onChange={(next) => { setItems(next); if (canCqttTasks || canCouncilTasks) setCqttTouched(true); }}
              />

            </section>
          )}
        </div>
        <aside className="space-y-4" aria-label="Kết quả và ý kiến đánh giá">
          <section className="rounded-lg border p-4 text-center">
            <div className="text-xs text-muted-foreground">
              {["approved", "dispatch", "sign", "done"].includes(ev.step)
                ? "Xếp loại đã phê duyệt"
                : "Xếp loại dự kiến"}
            </div>
            <div className="mt-1 text-5xl font-bold text-primary" data-testid="evaluation-ki">{result.ki}</div>
            <div className="mt-1 text-sm font-medium">
              {result.score === null && result.ki === "—" ? "Chưa có đánh giá" : result.rating}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-sm" data-testid="review-score-summary">
              <div>
                <div className="text-xs text-muted-foreground">CBNV tự đánh giá</div>
                <div className="font-semibold">{totalScore(items).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">QLTT đánh giá</div>
                <div className="font-semibold" data-testid="qltt-summary-score">{qlttSummaryScore?.toFixed(2) ?? "—"}</div>
              </div>
            </div>
            <div className="mt-3 border-t pt-3 text-xs text-muted-foreground">
              {result.completion}
            </div>
          </section>
          <section className="rounded-lg border p-4 text-sm">
            <h2 className="mb-3 font-medium">Đánh giá của QLTT</h2>
            {(
              [
                ["Địa điểm làm việc", "locationCompliance", ["Tuân thủ", "Không tuân thủ"]],
                ["Nội quy lao động", "laborCompliance", LABOR],
                ["Văn hoá Viettel", "cultureCompliance", ["Tuân thủ", "Không tuân thủ"]],
              ] as const
            ).map(([label, key, options]) => (
              <label key={label} className="mb-2 flex items-start justify-between gap-2 text-xs">
                <span className="pt-1">{label}</span>
                <select
                  aria-label={label}
                  disabled={!canCompliance}
                  value={canCompliance ? compliance[key] : (ev[key] ?? "")}
                  onChange={(e) => { setCompliance((c) => ({ ...c, [key]: e.target.value })); setComplianceTouched(true); }}
                  className={cn("max-w-36 rounded border bg-card px-2 py-1 text-xs", canCompliance && "h-8 border-input")}
                >
                  <option value="">—</option>
                  {[...new Set<string>([...options, ...(ev[key] ? [ev[key]!] : [])])].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            ))}
          </section>
          <section className="rounded-lg border p-4 text-sm">
            <h2 className="mb-3 flex items-center gap-2 font-medium">
              <MessageSquare className="h-4 w-4" />Ý kiến xử lý
            </h2>
            {ev.history?.slice(-3).map((h, i) => (
              <div key={i} className="mb-2 rounded bg-muted p-2 text-xs">
                <b>{h.actorName ?? ROLES[h.role]}</b> · {h.at}
                <div className="mt-1 whitespace-pre-wrap">{h.note || actionLabel(h.action)}</div>
              </div>
            ))}
            {ev.note && (
              <div className="mb-3 rounded-md bg-muted p-2 text-xs">
                <b>Ý kiến / yêu cầu đã ghi nhận:</b>
                <p className="mt-1 whitespace-pre-wrap">{ev.note}</p>
              </div>
            )}
            {ev.response && (
              <p className="mb-3 rounded-md bg-muted p-2 text-xs">
                <b>{ev.response}:</b> {ev.responseNote} · Điểm CQTT được giữ nguyên.
              </p>
            )}
            {allowedReturns.length > 1 && (
              <label className="mb-2 block text-xs">
                Trả về bước
                <select
                  aria-label="Trả về bước"
                  className="mt-1 block h-9 w-full rounded-md border bg-card px-2 text-sm"
                  value={chosenReturn}
                  onChange={(e) => setReturnStage(e.target.value as StageKey)}
                >
                  {allowedReturns.map((k) => (
                    <option key={k} value={k}>{STAGES[k].name} — {handlerFor(ev.block, k)}</option>
                  ))}
                </select>
              </label>
            )}
            {allowedReturns.length > 0 && (
              <label className="block text-xs">
                {ev.step === "ceo" && chosenReturn === "council"
                  ? "Chỉ đạo điều chỉnh của TGĐ"
                  : ev.step === "cqtt" && chosenReturn === "self"
                    ? "Nội dung yêu cầu phản hồi (để trống để dùng góp ý đã lưu)"
                    : "Lý do trả về"}
                <textarea
                  aria-label="Lý do điều chỉnh"
                  className="mt-2 block min-h-20 w-full rounded-md border p-2 text-sm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nhập nội dung cụ thể..."
                />
              </label>
            )}

            {!ev.note &&
              !ev.response &&
              !ev.history?.length &&
              !["ceo", "cqtt"].includes(ev.step) && (
                <p className="text-xs text-muted-foreground">Chưa có ý kiến xử lý.</p>
              )}
          </section>
        </aside>
      </div>
      <section className="mt-6 rounded-lg border p-4">
        <h2 className="mb-3 font-semibold">Lịch sử xử lý</h2>
        {!ev.history?.length && (
          <p className="text-sm text-muted-foreground">Dữ liệu mẫu chưa có lịch sử thao tác.</p>
        )}
        {ev.history?.map((h, i) => (
          <details key={i} className="border-t py-3 text-sm">
            <summary className="cursor-pointer">
              {h.at} · {h.actorName ?? ROLES[h.role]} · {actionLabel(h.action)} {h.note && `— ${h.note}`}
            </summary>
            <ul className="mt-2 space-y-1 rounded bg-muted p-3 text-xs">
              {historyChanges(h.before, h.after).map((line, j) => <li key={j}>{line}</li>)}
            </ul>
          </details>
        ))}
      </section>
      {ev.step === "done" && (
        <p className="mt-4 text-sm text-success">
          Đã ghi nhận trình ký phiếu đánh giá kèm {ev.assignmentRef ?? "phiếu GNV"}. Bản mẫu chưa
          kết nối dịch vụ ký số.
        </p>
      )}
    </AppShell>
  );
}
const HISTORY_FIELDS: Record<string, string> = {
  step: "Trạng thái", cqttKey: "Điểm CQTT – nhiệm vụ trọng tâm", cqttFunction: "Điểm CQTT – nhiệm vụ chức năng",
  cqtt: "Tổng điểm CQTT", council: "Điểm Hội đồng", proposedKi: "Ki đề xuất", cqttAdjustmentPercent: "% điều chỉnh CQTT",
  reviewAssistant: "Trợ lý rà soát", reviewRemark: "Nhận xét rà soát", ki: "Xếp loại Ki", location: "Tuân thủ địa điểm",
  labor: "Tuân thủ kỷ luật lao động", culture: "Tuân thủ văn hoá", response: "Phản hồi", responseNote: "Ý kiến phản hồi",
};
const historyValue = (key: string, v: unknown) =>
  v === undefined || v === null || v === "" ? "—"
    : key === "step" ? STEPS.find((s) => s.key === v)?.label ?? String(v)
      : typeof v === "number" ? String(Math.round(v * 100) / 100) : String(v);
// Đổi bản ghi lịch sử (JSON trước/sau) thành danh sách thay đổi dễ đọc.
function historyChanges(before: string, after: string): string[] {
  let a: unknown, b: unknown;
  try { a = JSON.parse(before); b = JSON.parse(after); } catch { return [`${before} → ${after}`]; }
  const lines: string[] = [];
  const criteriaChanges = (x: Criterion[] = [], y: Criterion[] = []) => {
    if (x.length !== y.length) lines.push(`Số nhiệm vụ: ${x.length} → ${y.length}`);
    y.forEach((c, i) => {
      const o = x[i];
      if (!o) return;
      const name = c.goal || `Nhiệm vụ ${i + 1}`;
      if (o.self !== c.self) lines.push(`${name} – tự đánh giá: ${historyValue("", o.self || undefined)} → ${historyValue("", c.self || undefined)}`);
      if (o.result !== c.result) lines.push(`${name} – kết quả: ${historyValue("", o.result)} → ${historyValue("", c.result)}`);
      if (o.council !== c.council) lines.push(`${name} – Hội đồng đánh giá: ${historyValue("", o.council)} → ${historyValue("", c.council)}`);
      if (o.cqtt !== c.cqtt) lines.push(`${name} – QLTT đánh giá: ${historyValue("", o.cqtt)} → ${historyValue("", c.cqtt)}`);
      if (o.weight !== c.weight) lines.push(`${name} – tỷ trọng: ${Math.round(o.weight * 100)}% → ${Math.round(c.weight * 100)}%`);
    });
  };
  if (Array.isArray(a) || Array.isArray(b)) criteriaChanges(a as Criterion[], b as Criterion[]);
  else {
    const x = (a ?? {}) as Record<string, unknown>, y = (b ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(HISTORY_FIELDS)) {
      const from = historyValue(key, x[key]), to = historyValue(key, y[key]);
      if (from !== to) lines.push(`${HISTORY_FIELDS[key]}: ${from} → ${to}`);
    }
    if (JSON.stringify(x["criteria"]) !== JSON.stringify(y["criteria"]) && (x["criteria"] || y["criteria"]))
      criteriaChanges(x["criteria"] as Criterion[], y["criteria"] as Criterion[]);
  }
  return lines.length ? lines : ["Không thay đổi dữ liệu."];
}
function actionLabel(action: string) {
  return (
    (
      {
        submit: "Gửi hồ sơ",
        send: "Chuyển hồ sơ",
        return: "Yêu cầu điều chỉnh",
        request: "Yêu cầu phản hồi",
        respond: "Gửi phản hồi",
        finish: "Hoàn tất đánh giá",
        approve: "Phê duyệt",
        sign: "Trình ký",
      } as Record<string, string>
    )[action] ?? action
  );
}
function PersonalTable({
  items,
  assignment,
  canSelf,
  canResult,
  canCqtt = false,
  showCouncil = false,
  canCouncil = false,
  cqttRef = null,
  onChange,
}: {
  /** Chờ CQ/CQĐV phản hồi: cột "QLTT đánh giá (1-5)" lấy điểm CQTT đã chấm từng công việc. */
  cqttRef?: (number | null)[] | null;
  items: Criterion[];
  assignment: boolean;
  canSelf: boolean;
  canResult: boolean;
  canCqtt?: boolean;
  showCouncil?: boolean;
  canCouncil?: boolean;
  onChange: (items: Criterion[]) => void;
}) {
  // Cột QLTT đánh giá: điểm CQTT chấm từng công việc; sau Hội đồng là điểm phân bổ.
  const cqttScored = items.some((c) => c.cqtt !== undefined);
  const qlttTotal = cqttRef
    ? Math.round(items.reduce((s, c, i) => s + c.weight * (cqttRef[i] ?? 0), 0) * 100) / 100
    : canCqtt || (cqttScored && allocatedTotal(items) === null)
      ? (cqttScored ? cqttTaskTotal(items) : null)
      : allocatedTotal(items);
  const update = (index: number, patch: Partial<Criterion>) =>
    onChange(items.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[1250px] text-left text-sm">
        <thead className="bg-muted text-xs">
          <tr>
            {[
              "Mục tiêu nhiệm vụ/công việc",
              "Chỉ số đo lường KPI",
              "Phương pháp đo",
              "Đơn vị đo",
              "Tỷ trọng",
            ].map((h) => (
              <th key={h} rowSpan={2} className="px-2 py-3 font-medium">
                {h}
              </th>
            ))}
            <th colSpan={3} className="border-b px-2 py-2 text-center font-medium">
              Các mức chỉ tiêu
            </th>
            {[
              "Ngày bắt đầu",
              "Ngày hoàn thành",
              ...(assignment
                ? []
                : ["Kết quả thực hiện", "CBNV tự đánh giá (1-5)", ...(showCouncil ? ["CQTT đánh giá (1-5)", "QLTT đánh giá (1-5)"] : [cqttRef ? "QLTT đánh giá (1-5)" : canCqtt || (cqttScored && allocatedTotal(items) === null) ? "QLTT đánh giá (1-5)" : "QLTT đánh giá (1-5)"])]),
            ].map((h) => (
              <th key={h} rowSpan={2} aria-label={h} className={cn("px-2 py-3 font-medium", h.endsWith("(1-5)") && "min-w-24", (h.startsWith("CBNV") || h.startsWith("QLTT")) && "text-center")}>
                {h.startsWith("CBNV") ? <>CBNV tự<br />đánh giá<br /><span className="whitespace-nowrap">(Điểm 1-5)</span></> : h.startsWith("QLTT") ? <>QLTT<br />đánh giá<br /><span className="whitespace-nowrap">(Điểm 1-5)</span></> : h.endsWith("(1-5)") ? <>{h.slice(0, -6)} <span className="whitespace-nowrap">(1-5)</span></> : h}
                {canCouncil && h.startsWith("QLTT") && (
                  <Button type="button" variant="outline" size="icon" className="ml-1 h-7 w-7" title="Sao chép điểm CQTT" aria-label="Sao chép điểm CQTT từng công việc"
                    onClick={() => onChange(items.map((c,i) => {
                      const score = cqttRef?.[i];
                      return { ...c, council: score == null ? undefined : Math.round(score * 100) / 100 };
                    }))}><Copy className="h-4 w-4" /></Button>
                )}
                {canCqtt && h.startsWith("QLTT") && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="ml-1 h-7 w-7 align-middle"
                    title="Sao chép điểm CBNV tự đánh giá"
                    aria-label="Sao chép điểm CBNV tự đánh giá"
                    onClick={() => onChange(items.map((c) => ({ ...c, cqtt: c.self || undefined })))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </th>
            ))}
          </tr>
          <tr>
            {["T", "B", "S"].map((h) => (
              <th key={h} className="px-2 py-2 text-center font-medium text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(
            [
              ["A", "A. Nhiệm vụ trọng tâm"],
              ["B-I", "B.I. Mục tiêu theo chức năng"],
              ["B-II", "B.II. Kiểm soát ngành dọc"],
            ] as const
          ).map(([group, label]) => (
            <GroupRows
              key={group}
              label={label}
              rows={items.map((c, i) => ({ c, i })).filter(({ c }) => c.group === group)}
              assignment={assignment}
              canSelf={canSelf}
              canResult={canResult}
              canCqtt={canCqtt}
              showCouncil={showCouncil}
              canCouncil={canCouncil}
              cqttRef={cqttRef}
              update={update}
            />
          ))}
          <tr className="bg-muted font-semibold">
            <td colSpan={4} className="p-3">
              Tổng tỷ trọng
            </td>
            <td>{Math.round(items.reduce((s, c) => s + c.weight, 0) * 100)}%</td>
            <td colSpan={assignment ? 5 : 6} className="whitespace-nowrap px-3 text-right">{!assignment && "Σ Tỷ trọng × Điểm"}</td>
            {!assignment && (
              <>
                <td className="px-3">{totalScore(items).toFixed(2)}</td>
                <td className="px-3 text-primary" data-testid="qltt-total">{qlttTotal?.toFixed(2) ?? "—"}</td>
                {showCouncil && <td className="px-3 font-semibold text-primary" data-testid="council-task-total">{allocatedTotal(items)?.toFixed(2) ?? "—"}</td>}
              </>
            )}
          </tr>
          {!assignment && (
            <tr className="border-t">
              <td colSpan={12} className="px-3 py-3 text-right font-semibold">Xếp loại kết quả thực hiện mục tiêu nhiệm vụ</td>
              <td className="whitespace-nowrap px-3 py-3 font-semibold text-primary" data-testid="qltt-rating">
                {qlttTotal === null ? "—" : rating(qlttTotal).label}
              </td>
              {showCouncil && <td className="whitespace-nowrap px-3 py-3 font-semibold text-primary" data-testid="council-task-rating">
                {allocatedTotal(items) === null ? "—" : rating(allocatedTotal(items)!).label}
              </td>}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function GroupRows({
  label,
  rows,
  assignment,
  canSelf,
  canResult,
  canCqtt,
  showCouncil,
  canCouncil,
  cqttRef,
  update,
}: {
  cqttRef: (number | null)[] | null;
  label: string;
  rows: { c: Criterion; i: number }[];
  assignment: boolean;
  canSelf: boolean;
  canResult: boolean;
  canCqtt: boolean;
  showCouncil: boolean;
  canCouncil: boolean;
  update: (i: number, patch: Partial<Criterion>) => void;
}) {
  const date = (v: string | undefined) => (v ? v.split("-").reverse().join("/") : "—");
  return (
    <>
      <tr className="bg-accent/50 text-primary">
        <td colSpan={assignment ? 10 : showCouncil ? 14 : 13} className="px-2 py-2 text-xs font-semibold">
          {label}
        </td>
      </tr>
      {rows.map(({ c, i }) => (
        <tr className="border-t" key={i}>
          <td className="sticky left-0 min-w-56 bg-card px-3 py-3 font-medium">{c.goal}</td>
          <td className="px-2">
            <input
              aria-label={`Chỉ số đo lường KPI mục tiêu ${i + 1}`}
              readOnly
              value={c.kpi}
              className={fieldClass + " my-2 w-44"}
            />
          </td>
          <td className="px-2">
            <input
              aria-label={`Phương pháp đo mục tiêu ${i + 1}`}
              readOnly
              value={c.method ?? ""}
              placeholder="Công thức / cách tính"
              className={fieldClass + " my-2 w-40"}
            />
          </td>
          <td className="px-2">
            <input
              aria-label={`Đơn vị đo mục tiêu ${i + 1}`}
              readOnly
              value={c.unit}
              className={fieldClass + " my-2 w-24"}
            />
          </td>
          <td className="px-3">{Math.round(c.weight * 100)}%</td>
          <td className="px-3">{c.target.t}</td>
          <td className="px-3">{c.target.b}</td>
          <td className="px-3">{c.target.s}</td>
          <td className="whitespace-nowrap px-3">{date(c.startDate)}</td>
          <td className="whitespace-nowrap px-3">{date(c.endDate)}</td>
          {!assignment && (
            <>
              <td className="px-3">
                {canResult ? (
                  <textarea
                    aria-label={`Kết quả thực hiện mục tiêu ${i + 1}`}
                    rows={1}
                    className="my-2 h-9 min-w-48 rounded-md border px-2 py-1.5"
                    value={c.result}
                    onChange={(e) => update(i, { result: e.target.value })}
                  />
                ) : (
                  <input
                    aria-label={`Kết quả thực hiện mục tiêu ${i + 1}`}
                    readOnly
                    value={c.result}
                    className={fieldClass + " my-2 min-w-48"}
                  />
                )}
              </td>
              <td className="px-3">
                {canSelf ? (
                  <select
                    aria-label={`Tự đánh giá mục tiêu ${i + 1}`}
                    className={fieldClass}
                    value={c.self}
                    onChange={(e) => update(i, { self: Number(e.target.value) })}
                  >
                    <option value={0}>—</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                ) : (
                  c.self || "—"
                )}
              </td>
              {canCqtt ? (
                <td className="px-3">
                  <select aria-label={`QLTT đánh giá mục tiêu ${i + 1}`} className={fieldClass + " my-2 w-28 min-w-28"} value={c.cqtt ?? ""} onChange={event => update(i, { cqtt: event.target.value === "" ? undefined : Number(event.target.value) })}><option value="">Chọn điểm</option>{c.cqtt !== undefined && !Number.isInteger(c.cqtt) && <option value={c.cqtt}>{c.cqtt}</option>}{[1, 2, 3, 4, 5].map(score => <option key={score} value={score}>{score}</option>)}</select>
                </td>
              ) : (
                <td
                  className="px-3 font-medium text-primary"
                  aria-label={cqttRef ? `QLTT đánh giá ${i + 1}` : `Điểm phân bổ mục tiêu ${i + 1}`}
                  title={cqttRef ? "Điểm CQTT đã đánh giá cho công việc (tham chiếu)" : undefined}
                >
                  {cqttRef ? (cqttRef[i] == null ? "—" : String(Math.round(cqttRef[i]! * 100) / 100)) : (c.council?.toFixed(4) ?? c.cqtt ?? "—")}
                </td>
              )}
              {showCouncil && <td className="px-3">
                {canCouncil ? <select aria-label={`Hội đồng đánh giá mục tiêu ${i+1}`} className={fieldClass + " my-2 w-28 min-w-28"} value={c.council ?? ""} onChange={event => update(i, { council: event.target.value === "" ? undefined : Number(event.target.value) })}><option value="">Chọn điểm</option>{c.council !== undefined && !Number.isInteger(c.council) && <option value={c.council}>{c.council}</option>}{[1, 2, 3, 4, 5].map(score => <option key={score} value={score}>{score}</option>)}</select>
                  : c.council?.toFixed(2) ?? "—"}
              </td>}
            </>
          )}
        </tr>
      ))}
    </>
  );
}
