import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Eye, Search } from "lucide-react";
import { useState } from "react";
import { AppShell, StatusPill } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useEvaluations } from "@/components/evaluation-context";
import { officeUnassessedEvaluations } from "@/lib/office-filter";
import { ASSIGNING_UNIT, type Evaluation } from "@/lib/evaluation";

export const Route = createFileRoute("/nhan-vien-chua-danh-gia")({
  validateSearch: (search: Record<string, unknown>): { period: string; block: "all" | Evaluation["block"]; unit: string } => ({
    period: typeof search["period"] === "string" ? search["period"] : "Quý III/2026",
    block: search["block"] === "Khối Cơ quan" || search["block"] === "Khối Đơn vị" ? search["block"] : "all",
    unit: typeof search["unit"] === "string" ? search["unit"] : "",
  }),
  head: () => ({ meta: [
    { title: "Nhân viên chưa đánh giá — vOffice" },
    { name: "description", content: "Danh sách nhân viên chưa gửi tự đánh giá nhiệm vụ theo kỳ, khối và đơn vị." },
    { property: "og:title", content: "Nhân viên chưa đánh giá — vOffice" },
    { property: "og:description", content: "Danh sách nhân viên chưa gửi tự đánh giá nhiệm vụ theo kỳ, khối và đơn vị." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: UnassessedEmployees,
});

function UnassessedEmployees() {
  const { evaluations, previewRole } = useEvaluations();
  const { period, block, unit } = Route.useSearch();
  const [query, setQuery] = useState("");
  const pending = officeUnassessedEvaluations(evaluations, period, block, unit);
  const rows = pending.filter((e) => `${e.owner} ${e.employeeId ?? ""} ${e.unit}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <AppShell title="Nhân viên chưa đánh giá" crumbs={<><Link to="/" className="hover:text-foreground">Đánh giá</Link><span>›</span><span>Nhân viên chưa đánh giá</span></>}
      actions={<Button variant="outline" asChild><Link to="/"><ArrowLeft />Danh sách đánh giá</Link></Button>}>
      {previewRole !== "office" ? <p className="py-6 text-sm text-muted-foreground">Danh sách dành cho Văn phòng/Ban Chiến lược.</p> : <>
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-4 text-sm">
          <span className="font-medium">{period}</span>
          <span className="text-muted-foreground">{block === "all" ? "Tất cả khối" : block}</span>
          {unit && <span className="text-muted-foreground">{unit}</span>}
          <span className="font-semibold text-primary">{pending.length} chưa đánh giá</span>
        </div>
        <label className="mb-4 flex w-full max-w-80 items-center gap-2 rounded-md border px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input aria-label="Tìm nhân viên chưa đánh giá" placeholder="Người thực hiện / Đơn vị" value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <div className="overflow-x-auto">
          <table aria-label="Nhân viên chưa đánh giá" className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-muted text-xs"><tr>{["TT", "Mã nhân viên", "Người thực hiện", "Đơn vị giao", "Đơn vị thực hiện", "Mã phiếu", "Trạng thái", "Thao tác"].map((label) => <th key={label} className="px-3 py-3 font-medium">{label}</th>)}</tr></thead>
            <tbody>{rows.map((e, index) => <tr key={e.id} className="border-b hover:bg-muted/40">
              <td className="px-3 py-4">{index + 1}</td>
              <td className="px-3 py-4">{e.employeeId ?? "—"}</td>
              <td className="px-3 py-4 font-medium">{e.owner}</td>
              <td className="px-3 py-4" title={ASSIGNING_UNIT.name}>{ASSIGNING_UNIT.label}</td>
              <td className="px-3 py-4">{e.unit}</td>
              <td className="px-3 py-4 text-muted-foreground">{e.id}</td>
              <td className="px-3 py-4"><StatusPill tone="pending">Chưa gửi đánh giá</StatusPill></td>
              <td className="px-3 py-4"><Button asChild variant="ghost" size="icon"><Link to="/danh-gia/$id" params={{ id: e.id }} aria-label={`Xem phiếu ${e.id}`} title="Xem phiếu"><Eye className="h-4 w-4" /></Link></Button></td>
            </tr>)}</tbody>
          </table>
          {!rows.length && <p className="py-10 text-center text-sm text-muted-foreground">{query ? "Không có nhân viên phù hợp." : "Không có nhân viên chưa đánh giá."}</p>}
        </div>
      </>}
    </AppShell>
  );
}