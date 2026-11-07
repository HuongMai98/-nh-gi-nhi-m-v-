import { EditIcon, TrashIcon } from "@/components/icons";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Copy, Eye, Plus, RotateCcw, Save, Send, Undo2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AppShell, StatusPill } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useEvaluations } from "@/components/evaluation-context";
import { ROLES, canConfigureWorkflow, type PreviewRole } from "@/lib/evaluation";
import {
  BLOCKS,
  STAGES,
  STAGE_ORDER,
  RETURNABLE,
  CUSTOM_ANCHORS,
  DEFAULT_NOTIFICATIONS,
  customReturnOptions,
  flowNodes,
  VERSION_STATE_LABEL,
  VERSION_STATES,
  returnOptions,
  cloneWorkflow,
  defaultWorkflow,
  formatIsoDate,
  normalizeBranches,
  stageOf,
  todayIso,
  validateVersion,
  versionState,
  versionStatus,
  type Block,
  type StageConfig,
  type StageKey,
  type VersionState,
  type CustomStage,
  type NotificationConfig,
  type VersionStatus,
  type WorkflowVersion,
} from "@/lib/workflow";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cau-hinh-luong-duyet")({
  validateSearch: (search: Record<string, unknown>): { id?: string; from?: string } => ({
    ...(typeof search["id"] === "string" ? { id: search["id"] } : {}),
    ...(typeof search["from"] === "string" ? { from: search["from"] } : {}),
  }),
  head: () => ({ meta: [
    { title: "Cấu hình luồng duyệt — vOffice" },
    { name: "description", content: "Quản lý phiên bản, vai trò và các bước duyệt đánh giá nhiệm vụ trên vOffice." },
    { property: "og:title", content: "Cấu hình luồng duyệt — vOffice" },
    { property: "og:description", content: "Quản lý phiên bản, vai trò và các bước duyệt đánh giá nhiệm vụ trên vOffice." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: WorkflowSettingsPage,
});

/** Bước hiển thị trên màn cấu hình. Gửi kết quả và Trình ký phiếu ĐG luôn chạy cuối luồng, không cấu hình. */
const CONFIG_STAGES: StageKey[] = STAGE_ORDER.filter((k) => k !== "dispatch" && k !== "sign");
/** Cách xử lý đặc thù của một số đích trả về (các đích khác: hồ sơ quay về bước đó kèm lý do). */
const RETURN_NOTE: Partial<Record<string, string>> = {
  "cqtt>self": "CQĐV/CQ Tiếp thu (cập nhật, gửi CQTT chấm lại) hoặc Bảo lưu (giữ nguyên điểm).",
  "ceo>council": "Hội đồng điều chỉnh theo comment rồi trình lại GĐ.",
};
const STATE_TONE: Record<VersionState, "pending" | "success" | "muted"> = {
  draft: "pending",
  effective: "success",
  inactive: "muted",
};
/** Tình trạng áp dụng của cấu hình Hiệu lực. */
const APPLY_LABEL: Partial<Record<VersionStatus, { text: string; className: string }>> = {
  active: { text: "Đang áp dụng", className: "font-medium text-success" },
  upcoming: { text: "Sắp áp dụng", className: "text-sky-700" },
  expired: { text: "Đã thay thế", className: "text-muted-foreground" },
};
const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const sameConfig = (a: WorkflowVersion, b: WorkflowVersion) =>
  JSON.stringify({ ...a, updatedAt: undefined }) === JSON.stringify({ ...b, updatedAt: undefined });

function WorkflowSettingsPage() {
  const { id, from } = Route.useSearch();
  const { previewRole } = useEvaluations();
  if (!canConfigureWorkflow(previewRole))
    return (
      <AppShell activeNav="config" crumbs={<><Link to="/">Đánh giá</Link><span>›</span><span>Cấu hình luồng duyệt</span></>} title="Cấu hình luồng duyệt">
        <div className="rounded-lg border bg-card px-6 py-12 text-center">
          <h2 className="text-sm font-semibold">Bạn không có quyền cấu hình luồng duyệt</h2>
          <p className="mt-2 text-sm text-muted-foreground">Chỉ Quản trị hệ thống được xem và cấu hình luồng duyệt.</p>
          <Button variant="outline" className="mt-4" asChild><Link to="/"><ArrowLeft />Về Đánh giá nhiệm vụ</Link></Button>
        </div>
      </AppShell>
    );
  return id ? <VersionEditor key={`${id}-${from ?? ""}`} id={id} from={from} /> : <VersionList />;
}

/** Danh sách cấu hình luồng duyệt theo ngày áp dụng. */
function VersionList() {
  const { workflowVersions, deleteWorkflowVersion } = useEvaluations();
  const [block, setBlock] = useState<Block | "all">("all");
  const [pendingDelete, setPendingDelete] = useState("");
  const [message, setMessage] = useState("");
  const today = todayIso();
  const rows = workflowVersions
    .filter((v) => block === "all" || v.block === block)
    .sort((a, b) => a.block.localeCompare(b.block) || b.effectiveFrom.localeCompare(a.effectiveFrom));
  return (
    <AppShell
      activeNav="config"
      crumbs={<><Link to="/">Đánh giá</Link><span>›</span><span>Cấu hình luồng duyệt</span></>}
      title="Cấu hình luồng duyệt"
      actions={<Button asChild><Link to="/cau-hinh-luong-duyet" search={{ id: "new" }}><Plus />Thêm cấu hình</Link></Button>}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-muted p-1 text-sm font-semibold" role="tablist" aria-label="Lọc theo khối">
          {(["all", ...BLOCKS] as const).map((b) => (
            <button
              key={b}
              role="tab"
              aria-selected={b === block}
              onClick={() => setBlock(b)}
              className={cn("h-9 min-w-40 rounded-md px-3.5", b === block ? "bg-card text-primary" : "text-body hover:text-foreground")}
            >
              {b === "all" ? "Tất cả" : b}
            </button>
          ))}
        </div>
      </div>
      {message && <p role="status" className="mb-4 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm">{message}</p>}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-muted text-xs">
            <tr>
              {["Tên cấu hình", "Khối", "Ngày áp dụng", "Số bước", "Trạng thái", "Áp dụng", "Cập nhật", "Thao tác"].map((h) => (
                <th key={h} className="px-3 py-2.5 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => {
              const status = versionStatus(v, workflowVersions, today);
              const steps = v.stages.filter((s) => s.enabled && CONFIG_STAGES.includes(s.key)).length;
              return (
                <tr key={v.id} className={cn("border-t", status !== "active" && status !== "upcoming" && "text-muted-foreground")}>
                  <td className="px-3 py-3">
                    <Link to="/cau-hinh-luong-duyet" search={{ id: v.id }} className="font-medium text-primary hover:underline">{v.name}</Link>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{v.block}</td>
                  <td className="px-3 py-3 whitespace-nowrap tabular-nums">{formatIsoDate(v.effectiveFrom)}</td>
                  <td className="px-3 py-3 tabular-nums">{steps}/{CONFIG_STAGES.length}</td>
                  <td className="px-3 py-3"><StatusPill tone={STATE_TONE[versionState(v)]}>{VERSION_STATE_LABEL[versionState(v)]}</StatusPill></td>
                  <td className={cn("px-3 py-3 whitespace-nowrap text-xs", APPLY_LABEL[status]?.className)}>{APPLY_LABEL[status]?.text ?? "—"}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs">{v.updatedAt ?? "—"}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <Button variant="ghost" size="action" asChild>
                        <Link to="/cau-hinh-luong-duyet" search={{ id: v.id }} title="Sửa" aria-label={`Sửa ${v.name}`}><EditIcon /></Link>
                      </Button>
                      <Button variant="ghost" size="action" asChild>
                        <Link to="/cau-hinh-luong-duyet" search={{ id: "new", from: v.id }} title="Nhân bản" aria-label={`Nhân bản ${v.name}`}><Copy /></Link>
                      </Button>
                      {status !== "active" && (
                        pendingDelete === v.id ? (
                          <>
                            <Button variant="return" size="sm" onClick={() => { const issue = deleteWorkflowVersion(v.id); setMessage(issue ?? `Đã xóa "${v.name}".`); setPendingDelete(""); }}>Xác nhận xóa</Button>
                            <Button variant="ghost" size="sm" onClick={() => setPendingDelete("")}>Hủy</Button>
                          </>
                        ) : (
                          <Button variant="ghost" size="action" title="Xóa" aria-label={`Xóa ${v.name}`} onClick={() => setPendingDelete(v.id)}><TrashIcon /></Button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Chưa có cấu hình</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

/** Chi tiết một cấu hình: tên, khối, ngày áp dụng và các bước. */
function VersionEditor({ id, from }: { id: string; from: string | undefined }) {
  const { workflowVersions, workflows, saveWorkflowVersion, evaluations } = useEvaluations();
  const navigate = useNavigate();
  const today = todayIso();
  const isNew = id === "new";
  const stored = isNew ? undefined : workflowVersions.find((v) => v.id === id);
  const [initial] = useState<WorkflowVersion | undefined>(() => {
    if (!isNew) return stored ? cloneWorkflow(stored) as WorkflowVersion : undefined;
    const base = (from && workflowVersions.find((v) => v.id === from)) || workflows["Khối Cơ quan"];
    const { updatedAt: _u, ...copy } = cloneWorkflow(base) as WorkflowVersion;
    return { ...copy, id: `cfg-${Date.now()}`, name: from ? `${base.name} (bản sao)` : "", effectiveFrom: addDays(today, 1), state: "draft" };
  });
  const [draft, setDraft] = useState<WorkflowVersion | undefined>(initial);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const block = draft?.block ?? "Khối Cơ quan";
  const inStage = useMemo(() => {
    const counts = Object.fromEntries(STAGE_ORDER.map((k) => [k, 0])) as Record<StageKey, number>;
    for (const e of evaluations) if (e.block === block && e.step !== "done" && e.step !== "custom") counts[stageOf(e.step)] += 1;
    return counts;
  }, [evaluations, block]);

  if (!draft || !initial) {
    return (
      <AppShell activeNav="config" crumbs={<Link to="/cau-hinh-luong-duyet">Cấu hình luồng duyệt</Link>} title="Không tìm thấy cấu hình">
        <Button variant="outline" asChild><Link to="/cau-hinh-luong-duyet"><ArrowLeft />Danh sách cấu hình</Link></Button>
      </AppShell>
    );
  }
  const status: VersionStatus = isNew ? "draft" : versionStatus(stored ?? draft, workflowVersions, today);
  const readOnly = false;
  const savedVersion = stored ?? initial;
  const dirty = isNew || !sameConfig(draft, savedVersion);
  const errors = validateVersion(draft, workflowVersions);

  const update = (change: (c: WorkflowVersion) => void) => {
    const next = cloneWorkflow(draft) as WorkflowVersion;
    change(next);
    setDraft({ ...next, ...normalizeBranches(next) });
    setMessage("");
    setSaveError("");
  };
  const setStage = (key: StageKey, patch: Partial<StageConfig>) =>
    update((c) => Object.assign(c.stages.find((s) => s.key === key)!, patch));
  const customCount = (id: string) => evaluations.filter((e) => e.block === block && e.step === "custom" && e.customStageId === id).length;
  // Sơ đồ: bước cố định đang bật + bước bổ sung đang bật, theo thứ tự chạy thật.
  const active = flowNodes(draft)
    .filter((n) => n.enabled && (n.kind === "custom" || CONFIG_STAGES.includes(n.key)))
    .map((n) => {
      if (n.kind === "custom") {
        const cs = draft.customStages!.find((x) => x.id === n.id)!;
        return { id: cs.id, name: cs.name || "Bước bổ sung", handler: cs.handler, slaDays: cs.slaDays, custom: true };
      }
      const s = draft.stages.find((x) => x.key === n.key)!;
      return { id: s.key, name: STAGES[s.key].name, handler: s.handler, slaDays: s.slaDays, custom: false };
    });
  const tableRows: ({ kind: "fixed"; key: StageKey } | { kind: "custom"; cs: CustomStage })[] = CONFIG_STAGES.flatMap((key) => [
    { kind: "fixed" as const, key },
    ...(draft.customStages ?? []).filter((cs) => cs.after === key).map((cs) => ({ kind: "custom" as const, cs })),
  ]);
  const setCustom = (id: string, patch: Partial<CustomStage>) =>
    update((c) => { c.customStages = (c.customStages ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)); });
  const addCustom = () =>
    update((c) => {
      c.customStages = [
        ...(c.customStages ?? []),
        { id: `cs-${Date.now()}`, name: "Bước duyệt bổ sung", after: "ceo", role: "ceo", handler: "Phó GĐ phụ trách", slaDays: 3, enabled: true, returnTo: [] },
      ];
    });
  const notify = { ...DEFAULT_NOTIFICATIONS, ...(draft.notifications ?? {}) };
  const setNotify = (patch: Partial<NotificationConfig>) => update((c) => { c.notifications = { ...notify, ...patch }; });
  const save = () => {
    const next: WorkflowVersion = draft;
    const issue = saveWorkflowVersion(next);
    if (issue) { setMessage(""); setSaveError(issue); return; }
    setSaveError("");
    setDraft(next);
    const state = versionState(next);
    const text =
      state === "draft"
        ? "Đã lưu nháp. Cấu hình chưa được áp dụng."
        : state === "inactive"
          ? "Đã lưu. Cấu hình không hiệu lực, không được áp dụng."
          : next.effectiveFrom <= today
            ? "Đã lưu. Cấu hình hiệu lực: hồ sơ chuyển bước từ bây giờ đi theo cấu hình đang áp dụng."
            : `Đã lưu. Cấu hình hiệu lực từ ${formatIsoDate(next.effectiveFrom)}.`;
    if (isNew) void navigate({ to: "/cau-hinh-luong-duyet", search: { id: next.id } });
    else setMessage(text);
  };

  return (
    <AppShell
      activeNav="config"
      crumbs={<><Link to="/">Đánh giá</Link><span>›</span><Link to="/cau-hinh-luong-duyet">Cấu hình luồng duyệt</Link><span>›</span><span>{isNew ? "Thêm cấu hình" : draft.name}</span></>}
      title={isNew ? "Thêm cấu hình luồng duyệt" : readOnly ? "Xem cấu hình luồng duyệt" : "Sửa cấu hình luồng duyệt"}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" asChild><Link to="/cau-hinh-luong-duyet"><ArrowLeft />Danh sách cấu hình</Link></Button>
        <div className="ml-auto flex flex-wrap gap-2">
          {readOnly ? (
            <Button asChild><Link to="/cau-hinh-luong-duyet" search={{ id: "new", from: draft.id }}><Copy />Nhân bản</Link></Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => update((c) => { const d = defaultWorkflow(c.block); c.stages = d.stages; c.branches = d.branches; })}>
                <RotateCcw />Khôi phục mặc định
              </Button>
              <Button variant="outline" disabled={!dirty || isNew} onClick={() => { setDraft(cloneWorkflow(savedVersion) as WorkflowVersion); setMessage(""); }}>
                <Undo2 />Hủy thay đổi
              </Button>
              <Button disabled={!dirty || errors.length > 0} onClick={save}>
                <Save />Lưu cấu hình
              </Button>
            </>
          )}
        </div>
      </div>
      {message && <p role="status" className="mb-4 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm">{message}</p>}
      {saveError && <p role="alert" className="mb-4 rounded-md border border-primary/30 bg-accent px-3 py-2 text-sm text-primary">{saveError}</p>}
      {!readOnly && errors.length > 0 && (
        <ul role="alert" className="mb-4 space-y-1 rounded-md border border-primary/30 bg-accent px-4 py-2 text-sm text-primary">
          {errors.map((e) => <li key={e}>• {e}</li>)}
        </ul>
      )}

      <section aria-label="Thông tin cấu hình" className="mb-5 grid gap-4 rounded-lg border p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="space-y-1.5 text-sm">
          <span>Tên cấu hình <span className="text-primary">*</span></span>
          <input
            aria-label="Tên cấu hình"
            disabled={readOnly}
            className="h-9 w-full rounded-md border bg-card px-3 text-sm disabled:bg-muted"
            value={draft.name}
            placeholder="Ví dụ: Luồng duyệt Quý IV/2026"
            onChange={(e) => update((c) => { c.name = e.target.value; })}
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <span>Khối áp dụng <span className="text-primary">*</span></span>
          <select
            aria-label="Khối áp dụng"
            disabled={!isNew}
            className="h-9 w-full rounded-md border bg-card px-2 text-sm disabled:bg-muted"
            value={draft.block}
            onChange={(e) => update((c) => { c.block = e.target.value as Block; })}
          >
            {BLOCKS.map((b) => <option key={b}>{b}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span>Ngày áp dụng <span className="text-primary">*</span></span>
          <input
            aria-label="Ngày áp dụng"
            type="date"
            disabled={readOnly}
            className="h-9 w-full rounded-md border bg-card px-2 text-sm disabled:bg-muted"
            value={draft.effectiveFrom}
            onChange={(e) => update((c) => { c.effectiveFrom = e.target.value; })}
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="flex items-center gap-2">Trạng thái <span className="text-primary">*</span>{APPLY_LABEL[status] && !isNew && <span className={cn("text-xs", APPLY_LABEL[status]!.className)}>· {APPLY_LABEL[status]!.text}</span>}</span>
          <select
            aria-label="Trạng thái"
            className="h-9 w-full min-w-40 rounded-md border bg-card px-2 text-sm"
            value={versionState(draft)}
            onChange={(e) => update((c) => { c.state = e.target.value as VersionState; delete c.published; })}
          >
            {VERSION_STATES.map((s) => <option key={s} value={s}>{VERSION_STATE_LABEL[s]}</option>)}
          </select>
        </label>
      </section>

      <section aria-label="Sơ đồ luồng" className="mb-5 rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-semibold">Sơ đồ luồng — {block}</h2>
        <ol className="flex items-stretch overflow-x-auto pb-1">
          {active.map((s, i) => (
            <Fragment key={s.id}>
              <li className={cn("shrink-0 rounded-lg border bg-card px-3 py-2", s.custom && "border-dashed border-primary/50")}>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
                  <span className="text-sm font-medium">{s.name}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{s.handler}{s.slaDays ? ` · ${s.slaDays} ngày` : " · không giới hạn"}</div>
              </li>
              {i < active.length - 1 && <li aria-hidden className="flex shrink-0 items-center px-1.5 text-muted-foreground"><ArrowRight className="h-4 w-4" /></li>}
            </Fragment>
          ))}
        </ol>
      </section>

      <section aria-label="Các bước duyệt" className="mb-5 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-muted text-xs">
            <tr>
              {["#", "Bước", "Vai trò thao tác", "Đơn vị xử lý", "Hạn xử lý", "Trả về", "Đang xử lý", "Áp dụng"].map((h) => (
                <th key={h} className="px-3 py-2.5 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, i) => {
              if (row.kind === "custom") {
                const cs = row.cs;
                return (
                  <tr key={cs.id} className={cn("border-t align-top bg-accent/20", !cs.enabled && "bg-muted/40 text-muted-foreground")}>
                    <td className="px-3 py-3">{i + 1}</td>
                    <td className="px-3 py-3">
                      <input
                        aria-label="Tên bước bổ sung"
                        className="h-9 w-full max-w-xs rounded-md border bg-card px-2 text-sm font-medium"
                        value={cs.name}
                        onChange={(e) => setCustom(cs.id, { name: e.target.value })}
                      />
                      <label className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                        Bước bổ sung · đặt sau
                        <select
                          aria-label={`Vị trí bước ${cs.name}`}
                          className="h-7 rounded-md border bg-card px-1.5 text-xs text-foreground"
                          value={cs.after}
                          onChange={(e) => setCustom(cs.id, { after: e.target.value as StageKey, returnTo: [] })}
                        >
                          {CUSTOM_ANCHORS.map((k) => <option key={k} value={k}>{STAGES[k].name}</option>)}
                        </select>
                      </label>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        aria-label={`Vai trò thao tác ${cs.name}`}
                        className="h-9 w-44 rounded-md border bg-card px-2 text-sm"
                        value={cs.role}
                        onChange={(e) => setCustom(cs.id, { role: e.target.value as PreviewRole })}
                      >
                        {(Object.keys(ROLES) as PreviewRole[]).filter((r) => r !== "admin").map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        aria-label={`Đơn vị xử lý ${cs.name}`}
                        className="h-9 w-48 rounded-md border bg-card px-2 text-sm"
                        value={cs.handler}
                        onChange={(e) => setCustom(cs.id, { handler: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <label className="flex items-center gap-2 whitespace-nowrap">
                        <input
                          aria-label={`Hạn xử lý ${cs.name}`}
                          type="number"
                          min={0}
                          max={60}
                          className="h-9 w-20 rounded-md border bg-card px-2 text-sm"
                          value={cs.slaDays}
                          onChange={(e) => setCustom(cs.id, { slaDays: e.target.value === "" ? 0 : Number(e.target.value) })}
                        />
                        <span className="text-xs text-muted-foreground">ngày</span>
                      </label>
                    </td>
                    <td className="px-3 py-3">
                      <ReturnPicker
                        label={`Trả về từ ${cs.name}`}
                        value={cs.returnTo}
                        options={customReturnOptions(draft, cs)}
                        handlerOf={(k) => draft.stages.find((x) => x.key === k)?.handler ?? STAGES[k].name}
                        onChange={(returnTo) => setCustom(cs.id, { returnTo })}
                      />
                    </td>
                    <td className="px-3 py-3 tabular-nums">{status === "active" ? customCount(cs.id) : "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <Switch aria-label={`Áp dụng bước ${cs.name}`} checked={cs.enabled} onCheckedChange={(v) => setCustom(cs.id, { enabled: v })} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary"
                          title="Xóa bước"
                          aria-label={`Xóa bước ${cs.name}`}
                          onClick={() => update((c) => { c.customStages = (c.customStages ?? []).filter((x) => x.id !== cs.id); })}
                        >
                          <TrashIcon />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              }
              const key = row.key;
              const s = draft.stages.find((x) => x.key === key)!;
              const meta = STAGES[key];
              return (
                <tr key={key} className={cn("border-t align-top", !s.enabled && "bg-muted/40 text-muted-foreground")}>
                  <td className="px-3 py-3">{i + 1}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-foreground">{meta.name}</div>
                    <div className="mt-0.5 max-w-sm text-xs text-muted-foreground">{meta.description}</div>
                    {!s.enabled && status === "active" && inStage[key] > 0 && (
                      <div className="mt-1 text-xs text-amber-700">{inStage[key]} phiếu đang ở bước này sẽ xử lý nốt, sau đó bỏ qua bước.</div>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{ROLES[meta.role]}</td>
                  <td className="px-3 py-3">
                    <select
                      aria-label={`Đơn vị xử lý ${meta.name}`}
                      disabled={readOnly || !s.enabled || meta.handlers.length < 2}
                      className="h-9 w-48 rounded-md border bg-card px-2 text-sm disabled:bg-muted"
                      value={s.handler}
                      onChange={(e) => setStage(key, { handler: e.target.value })}
                    >
                      {meta.handlers.map((h) => <option key={h}>{h}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <label className="flex items-center gap-2 whitespace-nowrap">
                      <input
                        aria-label={`Hạn xử lý ${meta.name}`}
                        type="number"
                        min={0}
                        max={60}
                        step={1}
                        disabled={readOnly || !s.enabled}
                        className="h-9 w-20 rounded-md border bg-card px-2 text-sm disabled:bg-muted"
                        value={s.slaDays}
                        onChange={(e) => setStage(key, { slaDays: e.target.value === "" ? 0 : Number(e.target.value) })}
                      />
                      <span className="text-xs text-muted-foreground">ngày</span>
                    </label>
                  </td>
                  <td className="px-3 py-3">
                    {RETURNABLE.includes(key) ? (
                      returnOptions(draft, key).length && s.enabled ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              disabled={readOnly}
                              aria-label={`Được trả về từ ${meta.name}`}
                              className="flex h-9 w-52 items-center justify-between gap-2 rounded-md border bg-card px-2 text-left text-sm disabled:cursor-not-allowed disabled:bg-muted"
                            >
                              <span className={cn("truncate", !s.returnTo.length && "text-muted-foreground")}>
                                {s.returnTo.length ? s.returnTo.map((k) => draft.stages.find((x) => x.key === k)?.handler ?? STAGES[k].name).join(", ") : "Không cho trả về"}
                              </span>
                              <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-64 bg-card p-1">
                            <button
                              type="button"
                              className={cn("flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent", !s.returnTo.length && "font-medium text-primary")}
                              onClick={() => setStage(key, { returnTo: [] })}
                            >
                              <span className="w-4">{!s.returnTo.length && <Check className="h-4 w-4" />}</span>
                              Không cho trả về
                            </button>
                            <div className="my-1 border-t" />
                            {returnOptions(draft, key).map((target) => (
                              <label
                                key={target}
                                className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                                title={RETURN_NOTE[`${key}>${target}`]}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-4 w-4 accent-primary"
                                  aria-label={`${meta.name} trả về ${STAGES[target].name}`}
                                  checked={s.returnTo.includes(target)}
                                  onChange={(e) =>
                                    setStage(key, {
                                      returnTo: e.target.checked
                                        ? STAGE_ORDER.filter((k) => k === target || s.returnTo.includes(k))
                                        : s.returnTo.filter((k) => k !== target),
                                    })
                                  }
                                />
                                <span>
                                  {STAGES[target].name}
                                  <span className="block text-xs text-muted-foreground">{draft.stages.find((x) => x.key === target)?.handler}</span>
                                </span>
                              </label>
                            ))}
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="text-xs text-muted-foreground">{s.enabled ? "Không có bước trước" : "—"}</span>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">Không áp dụng</span>
                    )}
                  </td>
                  <td className="px-3 py-3 tabular-nums">{status === "active" ? inStage[key] : "—"}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        aria-label={`Áp dụng bước ${meta.name}`}
                        checked={s.enabled}
                        disabled={readOnly || meta.required}
                        onCheckedChange={(v) => setStage(key, { enabled: v })}
                      />
                      {meta.required && <span className="text-xs text-muted-foreground">Bắt buộc</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="border-t px-3 py-2.5">
          <Button variant="outline" size="sm" onClick={addCustom}><Plus />Thêm bước</Button>
        </div>
      </section>

      <section aria-label="Thông báo và nhắc hạn" className="rounded-lg border">
        <h2 className="border-b px-4 py-3 text-sm font-semibold">Thông báo &amp; nhắc hạn</h2>
        <div className="grid gap-x-8 gap-y-4 p-4 md:grid-cols-2">
          <label className="flex items-start gap-3 text-sm">
            <Switch aria-label="Thông báo khi hồ sơ đến bước" className="mt-0.5" checked={notify.onArrival} onCheckedChange={(v) => setNotify({ onArrival: v })} />
            <span><span className="font-medium">Thông báo khi hồ sơ đến bước</span><span className="block text-xs text-muted-foreground">Gửi cho người xử lý của bước mới.</span></span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <Switch aria-label="Cảnh báo quá hạn" className="mt-0.5" checked={notify.overdueAlert} onCheckedChange={(v) => setNotify({ overdueAlert: v })} />
            <span><span className="font-medium">Cảnh báo quá hạn</span><span className="block text-xs text-muted-foreground">Đánh dấu và nhắc khi hồ sơ vượt hạn xử lý của bước.</span></span>
          </label>
          <label className="flex items-center gap-3 text-sm">
            <span className="font-medium">Nhắc trước hạn</span>
            <input
              aria-label="Nhắc trước hạn"
              type="number"
              min={0}
              max={30}
              className="h-9 w-20 rounded-md border bg-card px-2 text-sm"
              value={notify.remindBeforeDays}
              onChange={(e) => setNotify({ remindBeforeDays: e.target.value === "" ? 0 : Number(e.target.value) })}
            />
            <span className="text-xs text-muted-foreground">ngày (0 = không nhắc)</span>
          </label>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium">Kênh gửi</span>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-primary" aria-label="Kênh thông báo trên hệ thống" checked={notify.inApp} onChange={(e) => setNotify({ inApp: e.target.checked })} />Thông báo trên hệ thống</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-primary" aria-label="Kênh email" checked={notify.email} onChange={(e) => setNotify({ email: e.target.checked })} />Email</label>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

/** Droplist chọn nhiều bước được trả về. */
function ReturnPicker({
  label,
  value,
  options,
  handlerOf,
  onChange,
}: {
  label: string;
  value: StageKey[];
  options: StageKey[];
  handlerOf: (k: StageKey) => string;
  onChange: (next: StageKey[]) => void;
}) {
  if (!options.length) return <span className="text-xs text-muted-foreground">Không có bước trước</span>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} className="flex h-9 w-52 items-center justify-between gap-2 rounded-md border bg-card px-2 text-left text-sm">
          <span className={cn("truncate", !value.length && "text-muted-foreground")}>{value.length ? value.map(handlerOf).join(", ") : "Không cho trả về"}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 bg-card p-1">
        <button
          type="button"
          className={cn("flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent", !value.length && "font-medium text-primary")}
          onClick={() => onChange([])}
        >
          <span className="w-4">{!value.length && <Check className="h-4 w-4" />}</span>
          Không cho trả về
        </button>
        <div className="my-1 border-t" />
        {options.map((target) => (
          <label key={target} className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-primary"
              aria-label={`${label}: ${STAGES[target].name}`}
              checked={value.includes(target)}
              onChange={(e) => onChange(e.target.checked ? STAGE_ORDER.filter((k) => k === target || value.includes(k)) : value.filter((k) => k !== target))}
            />
            <span>
              {STAGES[target].name}
              <span className="block text-xs text-muted-foreground">{handlerOf(target)}</span>
            </span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}
