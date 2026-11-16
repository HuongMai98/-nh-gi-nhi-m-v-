import { useState } from "react";
import { ChevronUp, FileText, Type, CircleDot } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SOURCE_TASKS } from "@/lib/source-tasks";
import type { Criterion, Evaluation } from "@/lib/evaluation";

const GROUP_NAME: Record<Criterion["group"], string> = { A: "Nhóm NV trọng tâm", "B-I": "Nhóm NV chức năng", "B-II": "Nhóm NV kiểm soát ngành dọc" };
const date = (iso?: string) => (iso ? iso.split("-").reverse().join("/") : "--");
const stars = (weight: number) => weight >= 0.15 ? "3☆ Quan trọng" : weight >= 0.1 ? "2☆ Quan trọng, chưa khẩn cấp" : "1☆ Ít quan trọng, chưa khẩn cấp";

/** Ngữ cảnh phiếu để suy ra chi tiết nhiệm vụ; màn tạo phiếu (chưa lưu) chỉ có unit/owner. */
export type TaskContext = { id: string; unit: string; owner: string; assignmentRef?: string | undefined; selfSubmittedAt?: string | undefined; updated?: string | undefined };

/**
 * Chi tiết nhiệm vụ (mô phỏng màn Thông tin chi tiết nhiệm vụ của module Nhiệm vụ / VOffice).
 * shortcut: dữ liệu suy ra từ phiếu đánh giá và nhiệm vụ mẫu; thay bằng API chi tiết nhiệm vụ (MISSION_ID) khi tích hợp.
 */
export function taskDetail(ev: TaskContext, c: Criterion, index: number) {
  const source = SOURCE_TASKS.find((t) => t.unit === ev.unit && t.criterion.goal === c.goal);
  const id = source?.id ?? `${ev.assignmentRef ?? ev.id}-${index + 1}`;
  const numericId = 600000 + Math.abs([...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7)) % 100000;
  return {
    id: numericId,
    name: c.goal,
    shortName: c.kpi || c.goal,
    status: source?.status ?? (c.result.trim() ? "Đang thực hiện" : "Chưa thực hiện"),
    content: c.goal,
    target: c.target.b ? `${c.kpi}: mong đợi ${c.target.b}${c.unit && c.unit !== "%" ? ` ${c.unit}` : c.unit}` : c.kpi,
    creator: "Đinh Ngọc Tuấn",
    assigner: "Đinh Ngọc Tuấn",
    createdAt: c.startDate ? `${date(c.startDate)} 08:00:00` : "--",
    group: GROUP_NAME[c.group],
    period: `${date(c.startDate)} -> ${date(c.endDate)}`,
    frequency: "Hàng tháng",
    reportFrequency: "Cập nhật theo tuần",
    result: c.result.trim() || "--",
    assignUnit: "Tập đoàn Công nghiệp - Viễn thông Quân đội",
    performUnit: `${ev.unit} - Tập đoàn Công nghiệp - Viễn thông Quân đội`,
    attachment: "Bằng văn bản",
    weight: stars(c.weight),
    source: { type: "Theo văn bản", name: `Phiếu giao nhiệm vụ ${ev.assignmentRef ?? ev.id}` },
    lead: ev.unit,
    partners: c.group === "A" ? ["Văn phòng", "Ban Kỹ thuật"] : [],
    progress: c.result.trim() ? [{ action: "Cập nhật kết quả", by: ev.owner, at: ev.selfSubmittedAt ?? ev.updated ?? "--", done: date(c.endDate), status: source?.status ?? "Đang thực hiện" }] : [],
  };
}

export function TaskDetailDialog({ ev, criterion, index, onClose }: { ev: TaskContext; criterion: Criterion; index: number; onClose: () => void }) {
  const d = taskDetail(ev, criterion, index);
  const [tab, setTab] = useState<"result" | "detail">("result");
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100%-2rem)] max-w-5xl flex-col gap-0 overflow-hidden bg-card p-0" aria-describedby={undefined}>
        <DialogHeader className="border-b bg-muted px-6 py-4 pr-12"><DialogTitle>Thông tin chi tiết nhiệm vụ</DialogTitle><DialogDescription className="sr-only">{d.name}</DialogDescription></DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <h3 className="text-lg font-semibold">{d.name}</h3>
          <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-[220px_1fr]">
            <dt className="flex items-center gap-2 text-muted-foreground"><Type className="h-4 w-4" />Tên tóm tắt nhiệm vụ</dt><dd>{d.shortName}</dd>
            <dt className="flex items-center gap-2 text-muted-foreground"><CircleDot className="h-4 w-4" />Trạng thái</dt>
            <dd><span className={cn("inline-flex rounded-md border px-2.5 py-0.5 text-sm", /Quá hạn/.test(d.status) ? "border-primary/30 bg-primary/5 text-primary" : /Hoàn thành|Đã kết thúc|Đã đóng/.test(d.status) ? "border-green-200 bg-green-50 text-green-700" : "bg-card")}>{d.status}</span></dd>
          </dl>
          <div className="mt-5 flex gap-6 border-b" role="tablist">
            {([["result", "Kết quả thực hiện"], ["detail", "Chi tiết nhiệm vụ"]] as const).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("-mb-px border-b-2 px-1 pb-2.5 text-sm", tab === k ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground")}>{l}</button>
            ))}
          </div>
          {tab === "result" ? (
            <div className="mt-4 space-y-4">
              <Panel title={`Lịch sử cập nhật tiến độ (${d.progress.length})`}>
                <Table head={["TT", "Thao tác", "Người cập nhật", "Ngày cập nhật", "Ngày hoàn thành thực tế", "Trạng thái"]} rows={d.progress.map((p, i) => [String(i + 1), p.action, p.by, p.at, p.done, p.status])} />
              </Panel>
              <Panel title="Lịch sử chuyển nhiệm vụ (0)">
                <Table head={["TT", "Đơn vị thực hiện", "Ngày bắt đầu", "Ngày hoàn thành", "Kết quả thực hiện", "Lý do chuyển", "Trạng thái"]} rows={[]} />
              </Panel>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <Panel title="Thông tin chi tiết nhiệm vụ">
                <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
                  <Field label="Nội dung nhiệm vụ" value={d.content} wide />
                  <Field label="Mục tiêu nhiệm vụ" value={d.target} wide />
                  <Field label="Người tạo" value={d.creator} /><Field label="Ngày tạo" value={d.createdAt} />
                  <Field label="ID nhiệm vụ" value={String(d.id)} /><Field label="Nhóm nhiệm vụ" value={d.group} />
                  <Field label="Thời gian thực hiện" value={d.period} /><Field label="Người giao việc" value={d.assigner} />
                  <Field label="Tần suất nhiệm vụ" value={d.frequency} /><Field label="Tần suất báo cáo" value={d.reportFrequency} />
                  <Field label="Kết quả thực hiện" value={d.result} /><Field label="Đơn vị giao" value={d.assignUnit} />
                  <Field label="Đơn vị thực hiện" value={d.performUnit} /><Field label="Yêu cầu đính kèm báo cáo" value={d.attachment} />
                  <Field label="Trọng số" value={d.weight} />
                </dl>
              </Panel>
              <Panel title="Danh sách file (0)"><p className="py-2 text-center text-sm italic text-muted-foreground">Không có file đính kèm</p></Panel>
              <Panel title="Nguồn gốc nhiệm vụ (1)">
                <Table head={["TT", "Loại nguồn gốc", "Nguồn gốc"]} rows={[["1", d.source.type, d.source.name]]} />
              </Panel>
              <Panel title="Đầu mối thực hiện">
                <p className="text-sm text-muted-foreground">Đơn vị chủ trì</p>
                <p className="mt-2 rounded-md bg-muted px-4 py-3 text-sm">{d.lead}</p>
                <p className="mt-4 text-sm text-muted-foreground">Đơn vị phối hợp ({d.partners.length})</p>
                {d.partners.length ? <ol className="mt-2 space-y-3">{d.partners.map((p, i) => (
                  <li key={p} className="rounded-lg border p-4">
                    <p className="font-medium">{i + 1}. {p}</p>
                    <div className="mt-3 rounded-md bg-muted px-4 py-3 text-sm"><p className="text-muted-foreground">Nội dung phối hợp</p><p className="mt-1 border-l-2 pl-3">&nbsp;</p></div>
                    <div className="mt-2 rounded-md bg-muted px-4 py-3 text-sm"><p className="text-muted-foreground">Kết quả thực hiện</p><p className="mt-1 border-l-2 pl-3">&nbsp;</p></div>
                  </li>))}</ol> : <p className="mt-2 text-sm italic text-muted-foreground">Không có đơn vị phối hợp</p>}
              </Panel>
              <Panel title="Danh sách nhiệm vụ được giao (0)">
                <Table head={["TT", "Thao tác", "Nhiệm vụ", "Thời gian thực hiện"]} rows={[]} />
              </Panel>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-xl bg-muted/50">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between border-b px-5 py-3.5 text-left font-medium">
        {title}<ChevronUp className={cn("h-4 w-4 transition-transform", !open && "rotate-180")} />
      </button>
      {open && <div className="px-5 py-4">{children}</div>}
    </section>
  );
}
function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? "sm:col-span-2" : ""}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>;
}
function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-md">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-muted text-muted-foreground"><tr>{head.map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
        <tbody className="bg-card">
          {rows.length ? rows.map((r, i) => <tr key={i} className="border-t">{r.map((v, j) => <td key={j} className="px-3 py-2.5">{j === 2 && head[2] === "Nguồn gốc" ? <span className="inline-flex items-center gap-1 underline"><FileText className="h-3.5 w-3.5" />{v}</span> : v}</td>)}</tr>)
            : <tr><td colSpan={head.length} className="px-3 py-8 text-center italic text-muted-foreground">Không tìm thấy kết quả</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
