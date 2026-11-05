import { ListPagination } from "@/components/ListPagination";
import { EditIcon, FilterIcon } from "@/components/icons";
import { CEO_FILTERS, ceoStatus, type CeoFilter } from "@/lib/ceo-filter";
import { COUNCIL_FILTERS, councilStatus, type CouncilFilter } from "@/lib/council-filter";
import { cqttStatus, type CqttStatus } from "@/lib/cqtt-filter";
import { officeAggregationStatus, officeSubmissionSummary, type OfficeStatus } from "@/lib/office-filter";
import { CURRENT_USER, canSubmitEvaluation } from "@/lib/users";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Check,
  BarChart3,
  ClipboardCheck,
  Eye,
  KanbanSquare,
  List,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ChevronUp,
} from "lucide-react";
import { AppShell, StatusPill, toneBoxColor } from "@/components/AppShell";
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
  allocatedTotal,
  cqttTaskTotal,
  cqttTasksComplete,
  cqttScoredCount,
  cqttSummarizable,
  cqttInSummary,
  totalScore,
  type Step,
  type Evaluation,
} from "@/lib/evaluation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AggregateForm } from "@/components/AggregateForm";
import { useEvaluations } from "@/components/evaluation-context";

// ponytail: tạm ẩn tab Phụ lục Kết quả, đổi thành true khi có nghiệp vụ dùng lại (code vẫn giữ nguyên).
const SHOW_APPENDIX_TAB = false;
/** Tổng hợp KPI (Ki) và Phụ lục chỉ có dữ liệu khi CQTT đã hoàn tất rà soát và gửi Hội đồng. */
const KI_DATA_STEPS: Step[] = ["council", "council_adjust", "ceo", "approved", "dispatch", "sign", "done"];
const hasKiData = (e: Evaluation) => KI_DATA_STEPS.includes(e.step) || (e.step === "custom" && e.councilScore !== undefined);
const FILTER_STEPS = [...MAIN_STEPS.slice(0, 3), { key: "response" as const, label: "Chờ CQ/CQĐV phản hồi", actor: "CQ/CQĐV" }, MAIN_STEPS[3], { key: "council_adjust" as const, label: "Chờ Hội đồng điều chỉnh", actor: "Hội đồng" }, ...MAIN_STEPS.slice(4)];
const listStage = (e: Evaluation) => e.step === "response" || e.step === "council_adjust" ? e.step : mainStageOf(e);

export const Route = createFileRoute("/")({
  // cqtt: mở sẵn bộ lọc của CQTT (vd. sau khi Hoàn tất đánh giá → "report").
  validateSearch: (search: Record<string, unknown>): { cqtt?: CqttStatus; council?: CouncilFilter } => ({
    ...(["pending", "report", "waiting", "submitted"].includes(search["cqtt"] as string) ? { cqtt: search["cqtt"] as CqttStatus } : {}),
    ...(COUNCIL_FILTERS.some(f => f.key === search["council"]) ? { council: search["council"] as CouncilFilter } : {}),
  }),
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
  const { evaluations, previewRole, createCouncilSummary, workflows, summarizeCqtt } = useEvaluations();
  const [cqttError, setCqttError] = useState("");
  const [cqttNotice, setCqttNotice] = useState("");
  const [view, setView] = useState<"list" | "kpi" | "ki" | "appendix">(
    previewRole === "office" ? "kpi" : "list",
  );
  const activeView = previewRole === "performer" ? "list" : view;
  const [period, setPeriod] = useState("Quý III/2026");
  const [filter, setFilter] = useState<Set<Step>>(new Set(FILTER_STEPS.map((s) => s.key)));
  const [block, setBlock] = useState<"all" | "Khối Cơ quan" | "Khối Đơn vị">("all");
  const [selectedBatch, setSelectedBatch] = useState<string | undefined>();
  const [ceoFilter, setCeoFilter] = useState<CeoFilter>("pending");
  const [councilFilter, setCouncilFilter] = useState<CouncilFilter>(Route.useSearch().council ?? "pending");
  const { cqtt: cqttSearch } = Route.useSearch();
  const [cqttFilter, setCqttFilter] = useState<CqttStatus>(cqttSearch ?? "pending");
  const [officeStatus, setOfficeStatus] = useState<OfficeStatus>("pending");
  const [unitFilter, setUnitFilter] = useState("");
  const [kiFilter, setKiFilter] = useState("");
  const advancedCount = Number(!!unitFilter) + Number(!!kiFilter);
  // Tìm kiếm nâng cao theo VOffice: mở ngay trong trang, chọn điều kiện rồi bấm Tìm kiếm mới áp dụng.
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [draftUnit, setDraftUnit] = useState("");
  const [draftKi, setDraftKi] = useState("");
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
            : previewRole === "office" ? officeAggregationStatus(e) === officeStatus : previewRole === "cqtt" ? cqttStatus(e) === cqttFilter : previewRole === "council" ? councilStatus(e.step, !!e.councilReviewed) === councilFilter : previewRole === "ceo" ? ceoStatus(e.step) === ceoFilter : filter.has(listStage(e))) &&
          (block === "all" || e.block === block) &&
          (!unitFilter || e.unit === unitFilter) &&
          (!kiFilter || (kiFilter === "unrated" ? !e.ki : (e.approvedKi ?? e.ki) === kiFilter)) &&
          `${e.unit} ${e.owner} ${ASSIGNING_UNIT.name}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [evaluations, period, filter, block, q, previewRole, officeStatus, cqttFilter, councilFilter, ceoFilter, unitFilter, kiFilter],
  );
  const [pageSize, setPageSize] = useState(10);
  const scope = JSON.stringify([previewRole, activeView, period, [...filter], block, q, officeStatus, cqttFilter, councilFilter, ceoFilter, unitFilter, kiFilter, pageSize]);
  const [pagination, setPagination] = useState({ scope, page: 1 });
  const page = pagination.scope === scope ? Math.min(pagination.page, Math.max(1, Math.ceil(rows.length / pageSize))) : 1;
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
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
            <Button className="h-10" asChild>
              <Link to="/tao-danh-gia"><Plus />Tạo đánh giá</Link>
            </Button>
          )}
          {/* Nút thao tác chính theo vai trò, đặt bên phải cùng các nút khác. */}
          {previewRole === "ceo" && activeView === "list" && <Button variant="outline" className="h-10" disabled={!rows.length} onClick={() => setView("ki")}><BarChart3 />Xem tổng hợp Ki</Button>}
        </>
      }
    >
      {refreshMessage && <p role="status" className="mb-3 text-sm text-muted-foreground">{refreshMessage}</p>}
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
              onClick={() => { setSelectedBatch(undefined); setCqttNotice(""); setView(key); }}
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
          </div> : previewRole === "cqtt" ? <div><div className="mb-3 border-b pb-3 font-medium">Trạng thái rà soát</div><select aria-label="Trạng thái rà soát" className="h-9 w-full rounded-md border bg-card px-2 text-sm" value={cqttFilter} onChange={(e) => { setSelectedBatch(undefined); setCqttFilter(e.target.value as CqttStatus); }}><option value="pending">Chờ CQTT đánh giá</option><option value="report">Đã hoàn tất đánh giá</option><option value="waiting">Chờ CQ/CQĐV phản hồi</option><option value="submitted">Đã trình Hội đồng</option></select></div> : previewRole === "council" ? <div><div className="mb-3 border-b pb-3 font-medium">Trạng thái Hội đồng</div><select aria-label="Trạng thái Hội đồng" value={councilFilter} onChange={(event) => { setSelectedBatch(undefined); setCouncilFilter(event.target.value as CouncilFilter); }} className="h-9 w-full rounded-md border bg-card px-2 text-sm">{COUNCIL_FILTERS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select><p className="mt-3 text-xs text-muted-foreground">{evaluations.filter((e) => e.period === period && (block === "all" || e.block === block) && councilStatus(e.step, !!e.councilReviewed) === councilFilter).length} hồ sơ</p></div> : previewRole === "ceo" ? <div><div className="mb-3 border-b pb-3 font-medium">Trạng thái phê duyệt</div><select aria-label="Trạng thái phê duyệt" className="h-9 w-full rounded-md border bg-card px-2 text-sm" value={ceoFilter} onChange={(e) => setCeoFilter(e.target.value as CeoFilter)}>{CEO_FILTERS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></div> : <>
          <div className="mb-3 border-b pb-3 font-medium">{previewRole === "performer" ? "Trạng thái" : "Bước xử lý"}</div>
          <div className="space-y-4">
            {FILTER_STEPS.map((s) => (
              <label key={s.key} className="flex cursor-pointer items-center gap-2 text-foreground">
                {/* Ô tích kiểu VOffice: 20×20, bo 6px; tích thì tô màu của trạng thái, chưa tích viền xám đậm. */}
                <span className="relative grid size-5 shrink-0 place-items-center">
                  <input
                    type="checkbox"
                    checked={filter.has(s.key)}
                    onChange={() => toggle(s.key)}
                    style={{ "--box": toneBoxColor[STATUS[s.key].tone] } as React.CSSProperties}
                    className="peer size-5 cursor-pointer appearance-none rounded-md border border-body bg-card checked:border-[var(--box)] checked:bg-[var(--box)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  />
                  <Check aria-hidden strokeWidth={3} className="pointer-events-none absolute size-3.5 text-white opacity-0 peer-checked:opacity-100" />
                </span>
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
            <div className="flex h-9 w-80 min-w-0 items-center gap-2 rounded-md border border-input bg-card px-3 shadow-xs focus-within:border-primary">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Người thực hiện / Đơn vị"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <span aria-hidden className="h-9 w-px bg-border" />
            <Button
              variant="outline"
              size="icon"
              title="Tìm kiếm nâng cao"
              aria-label="Tìm kiếm nâng cao"
              aria-expanded={advancedOpen}
              onClick={() => { if (!advancedOpen) { setDraftUnit(unitFilter); setDraftKi(kiFilter); } setAdvancedOpen(!advancedOpen); }}
              className={cn("relative text-secondary-foreground [&_svg]:size-5", (advancedOpen || advancedCount > 0) && "border-primary")}
            >
              <FilterIcon />
              {advancedCount > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{advancedCount}</span>}
            </Button>
            <div className="ml-auto flex rounded-lg bg-muted p-1 text-sm font-semibold">
              {(["all", "Khối Cơ quan", "Khối Đơn vị"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBlock(b)}
                  className={cn(
                    // Theo nhóm nút Danh sách / Đơn vị thực hiện của VOffice: 160×36, chữ 600, không bóng.
                    "h-9 min-w-40 rounded-md px-3.5",
                    block === b ? "bg-card text-primary" : "text-body hover:text-foreground",
                  )}
                >
                  {b === "all" ? "Tất cả" : b}
                </button>
              ))}
            </div>
          </div>
          {advancedOpen && (
            <section aria-label="Tìm kiếm nâng cao" className="mb-4 border-b pb-5">
              <div className="flex items-center justify-between py-3">
                <h2 className="text-xl font-semibold text-foreground">Tìm kiếm nâng cao</h2>
                <Button variant="ghost" size="icon" aria-label="Thu gọn tìm kiếm nâng cao" onClick={() => setAdvancedOpen(false)}><ChevronUp className="!size-6" /></Button>
              </div>
              <div className="grid gap-x-4 gap-y-4 md:grid-cols-3">
                <label className="space-y-2 text-sm font-medium text-secondary-foreground">Đơn vị/Cơ quan
                  <select aria-label="Lọc theo đơn vị/cơ quan" className="block h-[42px] w-full rounded-md border border-input bg-card px-3 text-sm font-normal text-foreground shadow-xs" value={draftUnit} onChange={(e) => setDraftUnit(e.target.value)}><option value="">-- Tất cả --</option>{[...new Set(evaluations.filter((e) => e.period === period && (block === "all" || e.block === block)).map((e) => e.unit))].sort((a, b) => a.localeCompare(b, "vi")).map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select>
                </label>
                <label className="space-y-2 text-sm font-medium text-secondary-foreground">Xếp hạng Ki
                  <select aria-label="Lọc theo Ki" className="block h-[42px] w-full rounded-md border border-input bg-card px-3 text-sm font-normal text-foreground shadow-xs" value={draftKi} onChange={(e) => setDraftKi(e.target.value)}><option value="">-- Tất cả --</option>{["A+", "A", "B", "C", "D", "K"].map((ki) => <option key={ki} value={ki}>{ki}</option>)}<option value="unrated">Chưa xếp Ki</option></select>
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <Button variant="outline" className="h-[46px] px-7 text-base" onClick={() => { setDraftUnit(""); setDraftKi(""); setUnitFilter(""); setKiFilter(""); }}>Đặt lại</Button>
                <Button className="h-[46px] px-7 text-base" onClick={() => { setUnitFilter(draftUnit); setKiFilter(draftKi); }}>Tìm kiếm</Button>
              </div>
            </section>
          )}

          {previewRole === "office" && !(activeView === "ki" && !rows.some(hasKiData)) && (() => {
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

          {previewRole === "cqtt" && activeView === "kpi" && cqttNotice && <p role="status" className="mb-3 rounded-md border border-success/40 bg-success-soft px-3 py-2 text-sm text-success">{cqttNotice}</p>}
          {previewRole === "cqtt" && activeView === "kpi" && !rows.some(cqttInSummary) ? <div className="rounded-lg border bg-card px-6 py-12 text-center"><h2 className="text-sm font-semibold">Chưa có dữ liệu Tổng hợp đánh giá</h2><p className="mt-2 text-sm text-muted-foreground">Dữ liệu Thường trực đánh giá có sau khi CQTT bấm Tổng hợp đánh giá ở tab Danh sách.</p><Button variant="outline" className="mt-4" onClick={() => { setCqttFilter("report"); setView("list"); }}>Mở danh sách đã hoàn tất đánh giá</Button></div> : (activeView === "ki" || activeView === "appendix") && !rows.some(hasKiData) && !(previewRole === "council" && activeView === "ki") ? <div className="rounded-lg border bg-card px-6 py-12 text-center"><h2 className="text-sm font-semibold">{activeView === "ki" ? "Chưa có dữ liệu Tổng hợp KPI" : "Chưa có dữ liệu Phụ lục Kết quả"}</h2><p className="mt-2 text-sm text-muted-foreground">Dữ liệu có sau khi CQTT hoàn tất rà soát, chấm điểm và gửi Hội đồng.</p></div> : previewRole === "council" && activeView === "ki" && !rows.some((e) => e.councilSummaryCreated || !["council", "council_adjust"].includes(e.step)) ? <div className="rounded-lg border bg-card px-6 py-12 text-center"><h2 className="text-sm font-semibold">Chưa có dữ liệu tổng hợp KI</h2><p className="mt-2 text-sm text-muted-foreground">Bấm Tổng hợp KI tại danh sách Hội đồng đã đánh giá để tạo dữ liệu.</p><Button variant="outline" className="mt-4" onClick={() => { setCouncilFilter("completed"); setView("list"); }}>Mở danh sách Hội đồng đã đánh giá</Button></div> : activeView !== "list" ? (
            <AggregateForm
              evaluations={(previewRole === "cqtt" && selectedBatch ? rows.filter((e) => (e.officeBatchId ?? e.period + "|" + e.block) === selectedBatch) : previewRole === "council" && activeView === "ki" ? rows.filter((e) => e.councilSummaryCreated || !["council", "council_adjust"].includes(e.step)) : rows).filter((e) => (activeView === "kpi" || hasKiData(e)) && (previewRole !== "cqtt" || activeView !== "kpi" || cqttInSummary(e)))}
              mode={activeView}
              onCqttReturned={(count) => { setCqttFilter("waiting"); setCqttNotice(`Đã gửi điều chỉnh ${count} hồ sơ cho CQĐV/CQ. Hồ sơ chuyển sang trạng thái Chờ CQ/CQĐV phản hồi.`); }}
              batchCandidates={evaluations.filter(
                (e) => e.period === period && (previewRole !== "office" || officeStatus === "pending"),
              )}
            />
          ) : (
            <div>
            {previewRole === "council" && activeView === "list" && councilFilter === "completed" && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">Danh sách đánh giá</h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md border bg-card px-2.5 py-1 font-medium text-foreground">{period}</span>
                    <span className="rounded-md border bg-card px-2.5 py-1">Hội đồng đã đánh giá <b className="tabular-nums text-foreground">{rows.length}</b> phiếu</span>
                  </div>
                </div>
                <Button disabled={!rows.some(e => !e.councilSummaryCreated)} onClick={() => { createCouncilSummary(rows.map(e => e.id)); setView("ki"); }}><KanbanSquare />Tổng hợp KI</Button>
              </div>
            )}
            {previewRole === "office" && activeView === "list" && (() => {
              const waiting = evaluations.filter((e) => e.period === period && (block === "all" || e.block === block) && e.step === "office");
              const chip = "rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground";
              return (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">Danh sách đánh giá</h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className={chip + " font-medium text-foreground"}>{period}</span>
                      <span className={chip}>Cơ quan <b className="font-semibold text-foreground tabular-nums">{rows.filter((e) => e.block === "Khối Cơ quan").length}</b> phiếu</span>
                      <span className={chip}>Đơn vị <b className="font-semibold text-foreground tabular-nums">{rows.filter((e) => e.block === "Khối Đơn vị").length}</b> phiếu</span>
                      <span className={chip}>Chờ tổng hợp <b className="font-semibold text-foreground tabular-nums">{waiting.length}</b></span>
                    </div>
                  </div>
                  {officeStatus === "pending" && <Button onClick={() => setView("kpi")} disabled={!waiting.length}><KanbanSquare />Tổng hợp</Button>}
                </div>
              );
            })()}
            {previewRole === "cqtt" && activeView === "list" && (() => {
              // CQTT đánh giá chi tiết từng cá nhân xong thì Tổng hợp sang form Thường trực đánh giá.
              const scope = evaluations.filter((e) => e.period === period && (block === "all" || e.block === block));
              const reviewing = scope.filter((e) => e.step === "cqtt");
              // CQTT bấm Hoàn tất đánh giá → phiếu sang chờ báo cáo Hội đồng, tính vào "Đã hoàn tất đánh giá".
              const finished = scope.filter((e) => e.step === "cqtt_report");
              const toSummarize = finished.filter((e) => !e.cqttSummarized && cqttSummarizable(e));
              const summarized = scope.filter((e) => ["cqtt", "cqtt_report"].includes(e.step) && e.cqttSummarized);
              const chip = "rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground";
              return (
                <div className="mb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold">Danh sách đánh giá</h2>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className={chip + " font-medium text-foreground"}>{period}</span>
                        <button type="button" onClick={() => setCqttFilter("pending")} aria-pressed={cqttFilter === "pending"} className={cn(chip, "hover:border-primary/40", cqttFilter === "pending" && "border-primary/40 bg-accent text-primary")}>Chờ CQTT đánh giá <b className="font-semibold tabular-nums">{reviewing.length}</b></button>
                        <button type="button" onClick={() => setCqttFilter("report")} aria-pressed={cqttFilter === "report"} className={cn(chip, "hover:border-primary/40", cqttFilter === "report" && "border-primary/40 bg-accent text-primary")}>Đã hoàn tất đánh giá <b className="font-semibold tabular-nums">{finished.length}</b></button>
                        <span className={chip}>Đã tổng hợp <b className="font-semibold text-foreground tabular-nums">{summarized.length}</b></span>
                      </div>
                    </div>
                    {cqttFilter === "report" && <Button
                      disabled={!finished.length}
                      title={finished.length ? `Tổng hợp ${finished.length} cá nhân đã hoàn tất đánh giá` : "Chưa có cá nhân nào hoàn tất đánh giá"}
                      onClick={() => {
                        const issue = summarizeCqtt(toSummarize.map((e) => e.id));
                        setCqttError(issue ?? "");
                        if (!issue) setView("kpi");
                      }}
                    >
                      <KanbanSquare />Tổng hợp đánh giá
                    </Button>}
                  </div>
                  {cqttError && <p role="alert" className="mt-2 text-sm text-primary">{cqttError}</p>}
                </div>
              );
            })()}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="bg-muted text-left text-xs font-medium text-foreground">
                  <tr>
                    {[
                      "Mã phiếu",
                      "Mã nhân viên",
                      "Họ và tên",
                      "Đơn vị giao",
                      "Đơn vị thực hiện",
                      "Khối",
                      "Hạn đánh giá",
                      "CBNV đánh giá",
                      "QLTT đánh giá",
                      "Xếp loại",
                      "Trạng thái",
                      "Thao tác",
                    ].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-3 font-medium">
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
                  {pageRows.map((e) => {
                    const result = templateResult(e);
                    return (
                      <tr key={e.id} className="border-b hover:bg-muted/40">
                        <td className="whitespace-nowrap px-3 py-4 text-muted-foreground">{e.id}</td>
                        <td className="px-3 py-4">{e.employeeId ?? "—"}</td>
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
                        <td className="whitespace-nowrap px-3 py-4">{e.block}</td>
                        <td className="whitespace-nowrap px-3 py-4">{e.deadline}</td>
                        <td className="px-3 py-4 font-medium">
                          {totalScore(e.criteria).toFixed(2)}
                        </td>
                        <td className="px-3 py-4 font-medium">{(["council", "council_adjust", "ceo", "approved", "dispatch", "sign", "done"].includes(e.step)
                            ? allocatedTotal(e.criteria)
                            : e.criteria.some(c => c.cqtt !== undefined) ? cqttTaskTotal(e.criteria) : cqttTotal(e))?.toFixed(2) ?? "—"}</td>
                        <td className="px-3 py-4">{result.ki}</td>
                        <td className="px-3 py-4">
                          <StatusPill tone={STATUS[e.step].tone}>
                            {previewRole === "council" && ["council", "council_adjust"].includes(e.step) && e.councilReviewed ? "Hội đồng đã đánh giá" : e.step === "custom" ? statusLabelOf(e) : FILTER_STEPS.find((s) => s.key === listStage(e))?.label}
                          </StatusPill>
                          {/* Trạng thái chung giữ "CQTT đang đánh giá"; phiếu đã hoàn tất (bộ lọc riêng) chỉ ghi trạng thái tổng hợp. */}
                          {previewRole === "cqtt" && e.step === "cqtt_report" && (
                            <div className={cn("mt-1 whitespace-nowrap text-xs", e.cqttSummarized ? "text-muted-foreground" : "font-medium text-amber-700")}>
                              {e.cqttSummarized ? "Đã tổng hợp" : "Chưa tổng hợp"}
                            </div>
                          )}
                          {previewRole === "cqtt" && e.step === "cqtt" && cqttScoredCount(e.criteria) > 0 && (
                            <div className="mt-1 text-xs text-muted-foreground">Đã chấm {cqttScoredCount(e.criteria)}/{e.criteria.length} công việc</div>
                          )}
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
                          <div className="flex items-center gap-2 text-body">
                            {selfEditable(e, previewRole) && canSubmitEvaluation(e, CURRENT_USER) && (
                              <Button variant="ghost" size="action" title={canSubmitEvaluation(e, CURRENT_USER) ? "Cập nhật" : "Chỉ người thực hiện hoặc người cùng đơn vị được cập nhật"} aria-label={`Cập nhật ${e.id}`} disabled={!canSubmitEvaluation(e, CURRENT_USER)} asChild><Link to="/danh-gia/$id" params={{ id: e.id }} search={{ mode: "edit" }}><EditIcon /></Link></Button>
                            )}
                            {previewRole === "cqtt" && e.step === "cqtt_report" && cqttSummarizable(e) && (
                              e.cqttSummarized
                                ? <span className="whitespace-nowrap text-xs font-medium text-success">Đã tổng hợp</span>
                                : <Button variant="outline" size="sm" className="h-8 px-2.5" aria-label={`Tổng hợp ${e.id}`} title="Tổng hợp điểm Thường trực đánh giá từ chi tiết" onClick={() => { const issue = summarizeCqtt([e.id]); setCqttError(issue ?? ""); if (!issue) setView("kpi"); }}><KanbanSquare className="h-4 w-4" />Tổng hợp</Button>
                            )}
                            {((previewRole === "cqtt" && e.step === "cqtt") || (previewRole === "council" && ["council", "council_adjust"].includes(e.step))) && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary" title="Đánh giá" aria-label={`Đánh giá ${e.id}`} asChild><Link to="/danh-gia/$id" params={{ id: e.id }} search={{ mode: "edit" }}><ClipboardCheck className="h-4 w-4" /></Link></Button>
                            )}
                            {previewRole === "council" && ["council", "council_adjust"].includes(e.step) && e.councilReviewed && (
                              e.councilSummaryCreated ? <span className="whitespace-nowrap text-xs text-success">Đã tổng hợp KI</span> : <Button variant="outline" size="sm" aria-label={`Tổng hợp KI ${e.id}`} onClick={() => { createCouncilSummary([e.id]); setView("ki"); }}>Tổng hợp KI</Button>
                            )}
                            <Button variant="ghost" size="action" asChild>
                              <Link to="/danh-gia/$id" params={{ id: e.id }} title="Xem chi tiết" aria-label={`Xem chi tiết ${e.id}`}><Eye /></Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ListPagination total={rows.length} page={page} pageSize={pageSize} onPageChange={page => setPagination({ scope, page })} onPageSizeChange={setPageSize} />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
