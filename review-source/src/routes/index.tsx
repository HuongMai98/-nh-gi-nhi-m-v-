import { CEO_FILTERS, ceoStatus, type CeoFilter } from "@/lib/ceo-filter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COUNCIL_FILTERS, councilStatus, type CouncilFilter } from "@/lib/council-filter";
import { cqttStatus, type CqttStatus } from "@/lib/cqtt-filter";
import { officeAggregationStatus, officeSubmissionSummary, type OfficeStatus } from "@/lib/office-filter";
import { CURRENT_USER, canSubmitEvaluation } from "@/lib/users";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BarChart3,
  Eye,
  Pencil,
  KanbanSquare,
  List,
  Plus,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { AppShell, StatusPill } from "@/components/AppShell";
import { DEFAULT_NOTIFICATIONS, slaFor, slaLabel } from "@/lib/workflow";
import {
  ASSIGNING_UNIT,
  STATUS,
  MAIN_STEPS,
  mainStage,
  mainStageOf,
  canConfigureWorkflow,
  roleOf,
  statusLabelOf,
  selfEditable,
  templateResult,
  cqttTotal,
  totalScore,
  type Step,
  type Evaluation,
} from "@/lib/evaluation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AggregateForm } from "@/components/AggregateForm";
import { CreateEvaluationDialog } from "@/components/CreateEvaluationDialog";
import { useEvaluations } from "@/components/evaluation-context";

// ponytail: tạm ẩn tab Phụ lục Kết quả, đổi thành true khi có nghiệp vụ dùng lại (code vẫn giữ nguyên).
const SHOW_APPENDIX_TAB = false;
/** Tổng hợp KPI (Ki) và Phụ lục chỉ có dữ liệu khi CQTT đã hoàn tất rà soát và gửi Hội đồng. */
const KI_DATA_STEPS: Step[] = ["council", "council_adjust", "ceo", "approved", "dispatch", "sign", "done"];
const hasKiData = (e: Evaluation) => KI_DATA_STEPS.includes(e.step) || (e.step === "custom" && e.councilScore !== undefined);
const FILTER_STEPS = [...MAIN_STEPS.slice(0, 3), { key: "response" as const, label: "Chờ CQ/CQĐV phản hồi", actor: "CQ/CQĐV" }, MAIN_STEPS[3], { key: "council_adjust" as const, label: "Chờ Hội đồng điều chỉnh", actor: "Hội đồng" }, ...MAIN_STEPS.slice(4)];
const listStage = (e: Evaluation) => e.step === "response" || e.step === "council_adjust" ? e.step : mainStageOf(e);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Đánh giá nhiệm vụ – vOffice" },
      {
        name: "description",
        content: "Danh sách phiếu đánh giá kết quả thực hiện nhiệm vụ theo kỳ.",
      },
      { property: "og:title", content: "Đánh giá nhiệm vụ – vOffice" },
      {
        property: "og:description",
        content: "Danh sách phiếu đánh giá kết quả thực hiện nhiệm vụ theo kỳ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");
  async function refresh() {
    setRefreshing(true);
    setRefreshMessage("");
    try { await router.invalidate(); setRefreshMessage("Đã làm mới màn hình."); }
    catch { setRefreshMessage("Chưa thể làm mới. Vui lòng thử lại."); }
    finally { setRefreshing(false); }
  }
  const { evaluations, previewRole, createCouncilSummary, workflows } = useEvaluations();
  const [view, setView] = useState<"list" | "kpi" | "ki" | "appendix">(
    previewRole === "office" ? "kpi" : "list",
  );
  const activeView = previewRole === "performer" ? "list" : view;
  const [editing, setEditing] = useState<Evaluation | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [created, setCreated] = useState("");
  const [period, setPeriod] = useState("Quý III/2026");
  const [filter, setFilter] = useState<Set<Step>>(new Set(FILTER_STEPS.map((s) => s.key)));
  const [block, setBlock] = useState<"all" | "Khối Cơ quan" | "Khối Đơn vị">("all");
  const [selectedBatch, setSelectedBatch] = useState<string | undefined>();
  const [ceoFilter, setCeoFilter] = useState<CeoFilter>("pending");
  const [councilFilter, setCouncilFilter] = useState<CouncilFilter>("pending");
  const [cqttFilter, setCqttFilter] = useState<CqttStatus>("pending");
  const [officeStatus, setOfficeStatus] = useState<OfficeStatus>("pending");
  const [unitFilter, setUnitFilter] = useState("");
  const [kiFilter, setKiFilter] = useState("");
  const advancedCount = Number(!!unitFilter) + Number(!!kiFilter);
  const [q, setQ] = useState("");
  const officeSummary = officeSubmissionSummary(evaluations, period, block, unitFilter);
  const rows = useMemo(
    () =>
      evaluations.filter(
        (e) =>
          e.period === period &&
          // Bước tùy chỉnh: hiện ở nhóm "chờ xử lý" của vai trò được cấu hình xử lý bước đó.
          (e.step === "custom" && previewRole !== "performer" && roleOf(e) === previewRole
            ? (previewRole === "office" ? officeStatus : previewRole === "cqtt" ? cqttFilter : previewRole === "council" ? councilFilter : ceoFilter) === "pending"
            : previewRole === "office" ? officeAggregationStatus(e) === officeStatus : previewRole === "cqtt" ? cqttStatus(e) === cqttFilter : previewRole === "council" ? councilStatus(e.step) === councilFilter : previewRole === "ceo" ? ceoStatus(e.step) === ceoFilter : filter.has(listStage(e))) &&
          (block === "all" || e.block === block) &&
          (!unitFilter || e.unit === unitFilter) &&
          (!kiFilter || (kiFilter === "unrated" ? !e.ki : (e.approvedKi ?? e.ki) === kiFilter)) &&
          `${e.unit} ${e.owner} ${ASSIGNING_UNIT.name}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [evaluations, period, filter, block, q, previewRole, officeStatus, cqttFilter, councilFilter, ceoFilter, unitFilter, kiFilter],
  );
  const toggle = (k: Step) =>
    setFilter((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <AppShell
      crumbs={<span>Đánh giá</span>}
      title="Đánh giá nhiệm vụ"
      actions={
        <>
          {canConfigureWorkflow(previewRole) && <Button variant="outline" className="h-10" asChild><Link to="/cau-hinh-luong-duyet"><Settings className="h-4 w-4" />Cấu hình luồng duyệt</Link></Button>}
          <Button variant="outline" size="icon" className="h-10 w-10" title="Làm mới" aria-label="Làm mới" disabled={refreshing} onClick={refresh}><RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} /></Button>
          {/* Chỉ CQĐV/CQ được tạo phiếu đánh giá. */}
          {previewRole === "performer" && (
            <Button
              onClick={() => {
                setEditing(undefined);
                setCreated("");
                setCreateOpen(true);
              }}
              className="h-10"
            >
              <Plus />
              Tạo đánh giá
            </Button>
          )}
          {/* Nút thao tác chính theo vai trò, đặt bên phải cùng các nút khác. */}
          {previewRole === "ceo" && activeView === "list" && <Button variant="outline" className="h-10" disabled={!rows.length} onClick={() => setView("ki")}><BarChart3 />Xem tổng hợp Ki</Button>}
          {previewRole === "office" && activeView === "list" && officeStatus === "pending" && <Button className="h-10" onClick={() => setView("kpi")} disabled={!evaluations.some((e) => e.period === period && (block === "all" || e.block === block) && e.step === "office")}><KanbanSquare />Tổng hợp</Button>}
        </>
      }
    >
      {refreshMessage && <p role="status" className="mb-3 text-sm text-muted-foreground">{refreshMessage}</p>}
      {createOpen && previewRole === "performer" && (
        <CreateEvaluationDialog
          {...(editing ? { existing: editing } : {})}
          key={editing?.id ?? "new"}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(evaluation) => {
            setCreated(`${editing ? "Đã cập nhật" : "Đã tạo"} phiếu ${evaluation.id}`);
            setPeriod(evaluation.period);
            setQ("");
            setBlock("all");
            setFilter(new Set(MAIN_STEPS.map((step) => step.key)));
          }}
        />
      )}
      {created && (
        <div
          role="status"
          className="mb-4 rounded-md border border-success/40 bg-success-soft px-4 py-3 text-sm text-success"
        >
          {created}
        </div>
      )}
      <div
        className="mb-4 flex flex-wrap gap-1 border-b"
        role="tablist"
        aria-label="Biểu mẫu đánh giá"
      >
        {(
          [
            ["list", "Danh sách"],
            ["kpi", "Tổng hợp đánh giá"],
            ["ki", "Tổng hợp KPI"],
            ["appendix", "Phụ lục Kết quả"],
          ] as const
        )
          .filter(([key]) => (previewRole !== "performer" || key === "list") && (SHOW_APPENDIX_TAB || key !== "appendix"))
          .map(([key, label]) => (
            <button
              role="tab"
              aria-selected={activeView === key}
              key={key}
              onClick={() => { setSelectedBatch(undefined); setView(key); }}
              className={cn(
                "px-4 py-3 text-sm",
                activeView === key
                  ? "border-b-2 border-primary font-medium text-primary"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
      </div>

      <div className="flex gap-4">
        <aside className="w-52 shrink-0 rounded-lg bg-muted/60 p-4 text-sm xl:w-60">
          <div className="mb-3 font-medium">Kỳ đánh giá</div>
          <select
            aria-label="Kỳ đánh giá"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="mb-5 w-full rounded-md border bg-card px-3 py-2"
          >
            {Array.from(
              new Set([
                "Quý III/2026",
                "Quý II/2026",
                ...evaluations.map((evaluation) => evaluation.period),
              ]),
            ).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          {previewRole === "office" ? <div>
            <div className="mb-3 border-b pb-3 font-medium">Trạng thái tổng hợp</div>
            <select aria-label="Trạng thái tổng hợp" value={officeStatus} onChange={(event) => setOfficeStatus(event.target.value as OfficeStatus)} className="h-9 w-full rounded-md border bg-card px-2 text-sm">
              <option value="pending">Chờ tổng hợp</option><option value="completed">Đã tổng hợp</option>
            </select>
            <div className="mt-3 text-xs text-muted-foreground">{evaluations.filter((e) => e.period === period && (block === "all" || e.block === block) && officeAggregationStatus(e) === officeStatus).length} cá nhân</div>
          </div> : previewRole === "cqtt" ? <div><div className="mb-3 border-b pb-3 font-medium">Trạng thái rà soát</div><select aria-label="Trạng thái rà soát" className="h-9 w-full rounded-md border bg-card px-2 text-sm" value={cqttFilter} onChange={(e) => { setSelectedBatch(undefined); setCqttFilter(e.target.value as CqttStatus); }}><option value="pending">Chờ CQTT đánh giá</option><option value="report">Chờ trình Hội đồng</option><option value="waiting">Chờ CQ/CQĐV phản hồi</option><option value="submitted">Đã trình Hội đồng</option></select></div> : previewRole === "council" ? <div><div className="mb-3 border-b pb-3 font-medium">Trạng thái Hội đồng</div><select aria-label="Trạng thái Hội đồng" value={councilFilter} onChange={(event) => { setSelectedBatch(undefined); setCouncilFilter(event.target.value as CouncilFilter); }} className="h-9 w-full rounded-md border bg-card px-2 text-sm">{COUNCIL_FILTERS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select><p className="mt-3 text-xs text-muted-foreground">{evaluations.filter((e) => e.period === period && (block === "all" || e.block === block) && councilStatus(e.step) === councilFilter).length} hồ sơ</p></div> : previewRole === "ceo" ? <div><div className="mb-3 border-b pb-3 font-medium">Trạng thái phê duyệt</div><select aria-label="Trạng thái phê duyệt" className="h-9 w-full rounded-md border bg-card px-2 text-sm" value={ceoFilter} onChange={(e) => setCeoFilter(e.target.value as CeoFilter)}>{CEO_FILTERS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></div> : <>
          <div className="mb-3 border-b pb-3 font-medium">{previewRole === "performer" ? "Trạng thái" : "Bước xử lý"}</div>
          <div className="space-y-3">
            {FILTER_STEPS.map((s) => (
              <label key={s.key} className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={filter.has(s.key)}
                  onChange={() => toggle(s.key)}
                  className="h-4 w-4 accent-primary"
                />
                <span>{s.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {
                    evaluations.filter((e) => e.period === period && mainStageOf(e) === s.key)
                      .length
                  }
                </span>
              </label>
            ))}
          </div>
          </>}
        </aside>

        <div className="min-w-0 flex-1">
          <div className={"mb-3 flex flex-wrap items-center gap-3 " + (previewRole === "council" && activeView === "ki" ? "sticky top-0 z-40 bg-card py-2" : "")}>
            <div className="flex min-w-0 w-80 items-center gap-2 rounded-md border border-primary/30 px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Người thực hiện / Đơn vị"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>

            <Popover><PopoverTrigger asChild><Button variant="outline" className={advancedCount ? "border-primary/40 text-primary" : ""}><SlidersHorizontal className="h-4 w-4" />Lọc nâng cao{advancedCount > 0 && <span className="rounded bg-accent px-1.5 text-xs">{advancedCount}</span>}</Button></PopoverTrigger><PopoverContent align="start" className="w-80 space-y-4 bg-card p-4"><h3 className="text-sm font-semibold">Lọc nâng cao</h3><label className="block space-y-2 text-sm">Đơn vị/Cơ quan<select aria-label="Lọc theo đơn vị/cơ quan" className="h-9 w-full rounded-md border bg-card px-2 text-sm" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}><option value="">Tất cả đơn vị/cơ quan</option>{[...new Set(evaluations.filter((e) => e.period === period && (block === "all" || e.block === block)).map((e) => e.unit))].sort((a, b) => a.localeCompare(b, "vi")).map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label><label className="block space-y-2 text-sm">Ki<select aria-label="Lọc theo Ki" className="h-9 w-full rounded-md border bg-card px-2 text-sm" value={kiFilter} onChange={(e) => setKiFilter(e.target.value)}><option value="">Tất cả Ki</option>{["A+", "A", "B", "C", "D", "K"].map((ki) => <option key={ki} value={ki}>{ki}</option>)}<option value="unrated">Chưa xếp Ki</option></select></label><div className="flex items-center justify-between border-t pt-3"><span className="text-xs text-muted-foreground">Áp dụng ngay khi chọn</span><Button variant="ghost" size="sm" onClick={() => { setUnitFilter(""); setKiFilter(""); }}>Xóa bộ lọc</Button></div></PopoverContent></Popover>
            <div className="ml-auto flex rounded-lg bg-muted p-1 text-sm">
              {(["all", "Khối Cơ quan", "Khối Đơn vị"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBlock(b)}
                  className={cn(
                    "rounded-md px-5 py-1.5",
                    block === b
                      ? "bg-card font-medium text-primary shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  {b === "all" ? "Tất cả" : b}
                </button>
              ))}
            </div>
          </div>

          {previewRole === "office" && (() => {
            const { unassessed, total } = officeSummary;
            const assessed = total - unassessed;
            const percent = total ? Math.round((assessed / total) * 100) : 0;
            return (
              <section aria-label="Tiến độ đánh giá" className="mb-4 rounded-lg border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold">Tiến độ đánh giá {period}</h2>
                  <span className="text-sm text-muted-foreground">Đã hoàn thành <span className="font-semibold text-foreground tabular-nums">{percent}%</span></span>
                </div>
                <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Tỷ lệ đã đánh giá" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                  <div className="h-full rounded-full bg-success" style={{ width: `${percent}%` }} />
                </div>
                <dl className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md bg-muted/50 px-4 py-3">
                    <dt className="text-xs text-muted-foreground">Cần đánh giá</dt>
                    <dd className="text-2xl font-semibold tabular-nums">{total}</dd>
                  </div>
                  <div className="rounded-md bg-muted/50 px-4 py-3">
                    <dt className="text-xs text-muted-foreground">Đã đánh giá</dt>
                    <dd className="text-2xl font-semibold tabular-nums text-success">{assessed}</dd>
                  </div>
                  <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
                    <dt className="text-xs text-muted-foreground">Chưa đánh giá</dt>
                    <dd className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-2xl font-semibold tabular-nums text-primary">{unassessed}</span>
                      {unassessed > 0 && (
                        <Link to="/nhan-vien-chua-danh-gia" search={{ period, block, unit: unitFilter }} aria-label={`Xem ${unassessed} nhân viên chưa đánh giá`} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                          Xem danh sách →
                        </Link>
                      )}
                    </dd>
                  </div>
                </dl>
              </section>
            );
          })()}

          {(activeView === "ki" || activeView === "appendix") && !rows.some(hasKiData) && !(previewRole === "council" && activeView === "ki") ? <div className="rounded-lg border bg-card px-6 py-12 text-center"><h2 className="text-sm font-semibold">{activeView === "ki" ? "Chưa có dữ liệu Tổng hợp KPI" : "Chưa có dữ liệu Phụ lục Kết quả"}</h2><p className="mt-2 text-sm text-muted-foreground">Dữ liệu có sau khi CQTT hoàn tất rà soát, chấm điểm và gửi Hội đồng.</p></div> : previewRole === "council" && activeView === "ki" && !rows.some((e) => e.councilSummaryCreated || e.councilReviewed || !["council"].includes(e.step)) ? <div className="rounded-lg border bg-card px-6 py-12 text-center"><h2 className="text-sm font-semibold">Chưa có dữ liệu tổng hợp KI</h2><p className="mt-2 text-sm text-muted-foreground">Bấm Tổng hợp KI tại tab Tổng hợp đánh giá để tạo dữ liệu.</p><Button variant="outline" className="mt-4" onClick={() => setView("kpi")}>Mở Tổng hợp đánh giá</Button></div> : activeView !== "list" ? (
            <AggregateForm
              evaluations={(previewRole === "cqtt" && selectedBatch ? rows.filter((e) => (e.officeBatchId ?? e.period + "|" + e.block) === selectedBatch) : previewRole === "council" && activeView === "ki" ? rows.filter((e) => e.councilSummaryCreated || e.councilReviewed || e.step !== "council") : rows).filter((e) => activeView === "kpi" || hasKiData(e))}
              mode={activeView}
              onCouncilSummary={() => { createCouncilSummary(rows.map((e) => e.id)); setView("ki"); }}
              batchCandidates={evaluations.filter(
                (e) => e.period === period && (previewRole !== "office" || officeStatus === "pending"),
              )}
            />
          ) : previewRole === "cqtt" ? <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm"><thead className="bg-muted text-xs"><tr>{["Danh sách tổng hợp", "Đơn vị gửi", "Kỳ đánh giá", "Số cá nhân", "Thao tác"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{[...new Map(rows.map((e) => [e.officeBatchId ?? e.period + "|" + e.block, e])).entries()].map(([id, e]) => <tr key={id} className="border-t"><td className="px-4 py-4 font-medium">Tổng hợp đánh giá · {e.block}</td><td className="px-4 py-4">{e.block === "Khối Cơ quan" ? "Văn phòng" : "Ban Chiến lược"}</td><td className="px-4 py-4">{e.period}</td><td className="px-4 py-4">{rows.filter((r) => (r.officeBatchId ?? r.period + "|" + r.block) === id).length}</td><td className="px-4 py-4"><Button variant="outline" onClick={() => { setSelectedBatch(id); setBlock(e.block); setQ(""); setView("kpi"); }}>{cqttFilter === "submitted" ? "Xem tổng hợp" : "Đánh giá tổng hợp"}</Button></td></tr>)}</tbody></table>{!rows.length && <p className="p-6 text-center text-sm text-muted-foreground">Không có hồ sơ phù hợp.</p>}</div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="bg-muted text-left text-xs font-medium text-foreground">
                  <tr>
                    {[
                      "Mã phiếu",
                      "Người thực hiện",
                      "Đơn vị giao",
                      "Đơn vị thực hiện",
                      "Khối",
                      "Hạn đánh giá",
                      "Tự ĐG",
                      "CQTT đánh giá",
                      "Hội đồng ĐG",
                      "Xếp loại",
                      "Trạng thái",
                      "Thao tác",
                    ].map((h) => (
                      <th key={h} className="px-3 py-3 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={12} className="py-10 text-center text-muted-foreground">
                        Không có phiếu đánh giá phù hợp
                      </td>
                    </tr>
                  )}
                  {rows.map((e) => {
                    const result = templateResult(e);
                    return (
                      <tr key={e.id} className="border-b hover:bg-muted/40">
                        <td className="px-3 py-4 text-muted-foreground">{e.id}</td>
                        <td className="px-3 py-4">
                          <Link
                            to="/danh-gia/$id"
                            params={{ id: e.id }}
                            className="font-medium hover:text-primary"
                          >
                            {e.owner}
                          </Link>
                        </td>
                        <td className="px-3 py-4" title={ASSIGNING_UNIT.name}>
                          {ASSIGNING_UNIT.label}
                        </td>
                        <td className="max-w-64 px-3 py-4">
                          <Link
                            to="/danh-gia/$id"
                            params={{ id: e.id }}
                            className="hover:text-primary"
                          >
                            {e.unit}
                          </Link>
                        </td>
                        <td className="px-3 py-4">{e.block}</td>
                        <td className="px-3 py-4">{e.deadline}</td>
                        <td className="px-3 py-4 font-medium">
                          {totalScore(e.criteria).toFixed(2)}
                        </td>
                        <td className="px-3 py-4 font-medium">{cqttTotal(e)?.toFixed(2) ?? "—"}</td>
                        <td className="px-3 py-4 font-medium">{result.score?.toFixed(2) ?? "—"}</td>
                        <td className="px-3 py-4">{result.ki}</td>
                        <td className="px-3 py-4">
                          <StatusPill tone={STATUS[e.step].tone}>
                            {e.step === "custom" ? statusLabelOf(e) : FILTER_STEPS.find((s) => s.key === listStage(e))?.label}
                          </StatusPill>
                          {(() => {
                            const sla = slaFor(e);
                            const n = { ...DEFAULT_NOTIFICATIONS, ...(workflows[e.block].notifications ?? {}) };
                            return sla && ((sla.overdue && n.overdueAlert) || (!sla.overdue && n.remindBeforeDays > 0 && sla.daysLeft <= n.remindBeforeDays)) ? (
                              <div className={"mt-1 text-xs " + (sla.overdue ? "font-medium text-primary" : "text-amber-700")} title={`Hạn xử lý ${sla.due.toLocaleDateString("vi-VN")} (${sla.slaDays} ngày)`}>
                                {slaLabel(sla)}
                              </div>
                            ) : null;
                          })()}
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex gap-3 text-muted-foreground">
                            {selfEditable(e, previewRole) && canSubmitEvaluation(e, CURRENT_USER) && (
                              <Button variant="ghost" size="icon" title={canSubmitEvaluation(e, CURRENT_USER) ? "Cập nhật" : "Chỉ người thực hiện hoặc người cùng đơn vị được cập nhật"} aria-label={`Cập nhật ${e.id}`} disabled={!canSubmitEvaluation(e, CURRENT_USER)} asChild><Link to="/danh-gia/$id" params={{ id: e.id }} search={{ mode: "edit" }}><Pencil className="h-4 w-4" /></Link></Button>
                            )}
                            <Link to="/danh-gia/$id" params={{ id: e.id }} title="Xem chi tiết">
                              <Eye className="h-4 w-4 hover:text-primary" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
