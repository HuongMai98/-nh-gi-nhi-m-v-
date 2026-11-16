import { Copy, Eye, Plus, Undo2 } from "lucide-react";
import { TrashIcon } from "@/components/icons";
import { Fragment, useState } from "react";
import { TaskDetailDialog, type TaskContext } from "@/components/TaskDetailDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cqttTaskScores, totalScore, type Criterion } from "@/lib/evaluation";
import type { SourceTask } from "@/lib/source-tasks";

export type FormCriterion = Criterion & { sourceTaskId?: string | undefined; manual?: boolean | undefined };
const MANUAL = "__manual__";
const groups = [["A", "A. Nhiệm vụ trọng tâm, trọng điểm"], ["B-I", "I. Mục tiêu theo chức năng"], ["B-II", "II. Chỉ số kiểm soát ngành dọc"]] as const;
const field = "h-9 w-full rounded-md border bg-card px-2 text-sm";
export function CreateEvaluationTable({ items, tasksFor, onChange, onCopyQltt, cqttLimits, cqttScore = null, fillVerticalSpace = false, detailContext }: {
  items: FormCriterion[];
  /** Ngữ cảnh phiếu để mở chi tiết nhiệm vụ đã chọn; bỏ trống thì không hiện nút xem chi tiết. */
  detailContext?: TaskContext;
  /** Điểm CQTT (khi CQTT gửi điều chỉnh về) — phân bổ theo tỷ lệ tự đánh giá, chỉ để tham chiếu. */
  cqttScore?: number | null;
  fillVerticalSpace?: boolean;
  cqttLimits?: (number | null)[];
  onCopyQltt?: (() => void) | undefined;
  tasksFor: (group: Criterion["group"]) => SourceTask[];
  onChange: (items: FormCriterion[]) => void;
}) {
  const [weightError, setWeightError] = useState("");
  // ponytail: chỉ lưu index chờ xác nhận; xóa thật nằm trong nút "Đồng ý".
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const addToGroup = (group: Criterion["group"]) => {
    const rank = groups.findIndex(([key]) => key === group);
    const after = items.findIndex(c => groups.findIndex(([key]) => key === c.group) > rank);
    const next = [...items];
    next.splice(after < 0 ? items.length : after, 0, { group, goal: "", kpi: "", unit: "", weight: 0, target: { t: "", b: "", s: "" }, result: "", self: 0 });
    onChange(next);
  };
  const update = (index: number, patch: Partial<FormCriterion>) => onChange(items.map((c, i) => i === index ? { ...c, ...patch } : c));
  // Lấy trực tiếp điểm CQTT đã chấm từng công việc (hồ sơ cũ: phân bổ từ điểm nhóm).
  const cqttAllocated = cqttLimits ?? (cqttScore === null ? null : cqttTaskScores(items, cqttScore));
  const showCqtt = cqttScore !== null;
  const cqttSum = cqttAllocated ? Math.round(items.reduce((s, c, i) => s + c.weight * (cqttAllocated[i] ?? 0), 0) * 100) / 100 : null;
  const span = showCqtt ? 16 : 15;
  // Nhiệm vụ bắt buộc = mọi nhiệm vụ nguồn của đơn vị; "Đã loại" = nhiệm vụ nguồn không còn trong phiếu.
  const requiredTasks = groups.flatMap(([group]) => tasksFor(group));
  const usedTaskIds = new Set(items.map((c) => c.sourceTaskId).filter(Boolean));
  const removedTasks = requiredTasks.filter((task) => !usedTaskIds.has(task.id));
  // Thay thế = nhiệm vụ nhập tay thêm mới (không nằm trong danh sách hệ thống).
  const manualCount = items.filter((c) => c.manual).length;
  // Đã đánh giá = nhiệm vụ hệ thống còn trong phiếu và đã chọn điểm tự đánh giá.
  const evaluatedCount = items.filter((c) => c.sourceTaskId && !c.manual && c.self > 0).length;
  const restoreTask = (task: SourceTask) => {
    const rank = (group: Criterion["group"]) => groups.findIndex(([key]) => key === group);
    const after = items.findIndex((c) => rank(c.group) > rank(task.criterion.group));
    const next = [...items];
    next.splice(after < 0 ? items.length : after, 0, { ...task.criterion, self: 0, council: undefined, sourceTaskId: task.id });
    onChange(next);
  };
  return <div>
    {weightError && <p role="alert" className="mb-2 text-sm text-primary">{weightError}</p>}
    {(requiredTasks.length > 0 || manualCount > 0) && <div className="mb-2 flex flex-wrap items-center gap-4 text-sm">
      <span>Cần đánh giá: <b>{requiredTasks.length}</b></span>
      <span>Đã đánh giá: <b>{evaluatedCount}</b></span>
      <span>Đã loại: <b>{removedTasks.length}</b></span>
      <span>Thay thế: <b>{manualCount}</b></span>
    </div>}
    {removedTasks.length > 0 && <details className="mb-2 rounded-md border bg-card p-2 text-sm">
      <summary className="cursor-pointer font-medium">Đã loại ({removedTasks.length})</summary>
      <ul className="mt-2 space-y-1">{removedTasks.map((task) => <li key={task.id} className="flex items-center justify-between gap-2">
        <span>{task.criterion.goal} — {task.status}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => restoreTask(task)}>Khôi phục</Button>
      </li>)}</ul>
    </details>}
    <div className={`relative isolate ${fillVerticalSpace ? "max-h-[68dvh]" : "max-h-[55dvh]"} overflow-auto rounded-lg border`}>
    <table className="w-full min-w-[1474px] text-left text-sm">
      <thead className="sticky top-0 z-30 bg-muted text-xs shadow-[0_1px_0_0_hsl(var(--border))]">
        <tr>{["STT", "TT", "Nhiệm vụ", "Chỉ số đo lường KPI", "Phương pháp đo", "Đơn vị đo", "Tỷ trọng (%)"].map((h) => <th key={h} rowSpan={2} className={"border-r px-3 py-3 font-medium " + (h === "Tỷ trọng (%)" ? "text-center " : "") +  (h === "STT" ? "sticky left-0 z-20 w-12 min-w-12 bg-muted" : h === "TT" ? "sticky left-12 z-20 w-12 min-w-12 bg-muted"  : h === "Nhiệm vụ" ? "sticky left-24 z-20 w-80 min-w-80 max-w-80 bg-muted shadow-[2px_0_0_0_hsl(var(--border))]" : "")}>{h === "Tỷ trọng (%)" ? <span className="inline-flex flex-col items-center justify-center whitespace-nowrap leading-snug"><span>Tỷ trọng</span><span>(%)</span></span> : h === "Nhiệm vụ" ? "Mục tiêu nhiệm vụ/công việc" : h}{h === "Nhiệm vụ" && <span className="block font-normal italic">(Kết quả mong đợi đối với nhiệm vụ/công việc)</span>}{h === "Phương pháp đo" && <span className="block font-normal italic">(công thức hoặc mô tả cách tính)</span>}{h === "Đơn vị đo" && <span className="block font-normal italic">(số, số lượng, %, điểm, ...)</span>}</th>)}
          <th colSpan={3} className="border-b border-r p-2 text-center font-medium">Các mức chỉ tiêu</th>
          <th rowSpan={2} className="whitespace-nowrap px-3 font-medium">Ngày bắt đầu</th><th rowSpan={2} className="whitespace-nowrap px-3 font-medium">Ngày hoàn thành</th>
          <th colSpan={2} className="border-b p-2 text-center font-medium">Đánh giá kết quả thực hiện mục tiêu nhiệm vụ/công việc</th>{showCqtt && <th rowSpan={2} className="p-3 text-center font-medium">QLTT<br />đánh giá<br /><span className="whitespace-nowrap">(Điểm 1-5)</span></th>}<th rowSpan={2} className="p-3">Thao tác</th>
        </tr>
        <tr>{["Tối thiểu (T - Threshold)", "Mong đợi (B - Base)", "Thách thức (S - Stretch)", "Kết quả thực hiện", "CBNV tự đánh giá (1–5)"].map((h) => <th key={h} className={"p-2 text-center align-top font-medium" + (h.includes(" - ") ? " min-w-32" : "")}>{h === "CBNV tự đánh giá (1–5)" ? <>CBNV tự<br />đánh giá<br /><span className="whitespace-nowrap">(Điểm 1-5)</span>{onCopyQltt && <Button type="button" variant="outline" size="icon" className="mx-auto mt-1 h-7 w-7" title="Sao chép điểm QLTT vào CBNV tự đánh giá" aria-label="Sao chép điểm QLTT vào CBNV tự đánh giá" disabled={!cqttAllocated?.length || cqttAllocated.some(score => score == null)} onClick={onCopyQltt}><Copy className="h-3.5 w-3.5" /></Button>}</> : h.includes(" - ") ? <><span className="block whitespace-nowrap">{h.slice(0, h.indexOf(" ("))}</span><span className="mt-1 block whitespace-nowrap font-normal">{h.slice(h.indexOf(" (") + 1)}</span></> : h}</th>)}</tr>
      </thead>
      <tbody>{groups.map(([group, label]) => <Fragment key={group}>
        {group === "B-I" && <tr className="bg-accent/50"><th colSpan={span} className="py-2 font-semibold text-primary"><div className="sticky left-0 w-fit max-w-[calc(100vw-6rem)] px-3">B. Nhóm mục tiêu theo chức năng <span className="ml-3 font-normal text-muted-foreground">{Math.round(items.filter((c) => c.group !== "A").reduce((sum, c) => sum + c.weight, 0) * 100)}% / 80%</span></div></th></tr>}
        <tr className="bg-accent/50"><th colSpan={span} className="py-2"><div className={group === "A" ? "sticky left-0 w-fit px-3 font-semibold text-primary" : "sticky left-0 w-fit pl-6 pr-3 font-medium"}>{label}<span className="ml-3 font-normal text-muted-foreground">{Math.round(items.filter((c) => c.group === group).reduce((sum, c) => sum + c.weight, 0) * 100)}%</span></div></th></tr>
        {items.map((item, index) => item.group !== group ? null : <tr key={index} className="border-t align-top">
          <td className="sticky left-0 z-10 min-w-12 bg-card p-3 text-center">{index + 1}</td><td className="sticky left-12 z-10 min-w-12 bg-card p-3 text-center">{items.slice(0, index + 1).filter(c => c.group === group).length}</td>
          <td className="sticky left-24 z-10 w-80 min-w-80 max-w-80 bg-card p-2 shadow-[2px_0_0_0_hsl(var(--border))]"><div className="flex items-center gap-1">
            {item.manual
              ? <Input aria-label={`Tên nhiệm vụ nhập tay ${index + 1}`} required className="h-9 min-w-0 flex-1" placeholder="Nhập tên nhiệm vụ *" value={item.goal} onChange={(e) => update(index, { goal: e.target.value })} />
              : <select required aria-label={index ? `Nhiệm vụ * ${index + 1}` : "Nhiệm vụ *"} className={field + " min-w-0 flex-1"} value={item.sourceTaskId ?? ""} onChange={(e) => {
                  if (e.target.value === MANUAL) { onChange(items.map((c, i) => i === index ? { group: c.group, goal: "", kpi: "", method: "", unit: "", weight: c.weight, target: { t: "", b: "", s: "" }, result: c.result, self: 0, manual: true } : c)); return; }
                  const task = tasksFor(group).find((task) => task.id === e.target.value);
                  if (task) onChange(items.map((c, i) => i === index ? { ...task.criterion, self: 0, council: undefined, sourceTaskId: task.id } : c));
                }}><option value="" disabled>{tasksFor(group).length ? "Chọn nhiệm vụ" : "Không có nhiệm vụ phù hợp"}</option>{tasksFor(group).map((task) => <option key={task.id} value={task.id} disabled={items.some((c, i) => i !== index && c.sourceTaskId === task.id)}>{task.criterion.goal} — {task.status}</option>)}<option value={MANUAL}>＋ Nhập nhiệm vụ mới</option></select>}
            {detailContext && !item.manual && item.sourceTaskId && <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" title="Xem chi tiết nhiệm vụ" aria-label={`Xem chi tiết nhiệm vụ ${index + 1}`} onClick={() => setDetailIndex(index)}><Eye className="h-4 w-4" /></Button>}
            {item.manual && <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" title="Chọn lại từ hệ thống" aria-label={`Chọn lại nhiệm vụ ${index + 1}`} onClick={() => onChange(items.map((c, i) => i === index ? { group: c.group, goal: "", kpi: "", method: "", unit: "", weight: c.weight, target: { t: "", b: "", s: "" }, result: c.result, self: 0 } : c))}><Undo2 className="h-4 w-4" /></Button>}
          </div></td>
          <td className="p-2"><Input aria-label={`Chỉ số đo lường KPI ${index + 1}`} readOnly={!item.manual} required={item.manual} className="min-w-44" value={item.kpi} onChange={(e) => update(index, { kpi: e.target.value })} /></td>
          <td className="p-2"><Input aria-label={`Phương pháp đo ${index + 1}`} readOnly={!item.manual} className="min-w-40" value={item.method ?? ""} onChange={(e) => update(index, { method: e.target.value })} /></td>
          <td className="p-2"><Input aria-label={`Đơn vị đo ${index + 1}`} readOnly={!item.manual} required={item.manual} className="w-24" value={item.unit} onChange={(e) => update(index, { unit: e.target.value })} /></td>
          <td className="p-2"><Input aria-label={`Tỷ trọng ${index + 1}`} required type="number" readOnly={!item.manual} className="w-24 text-center" min="0.01" max="100" step="0.01" value={item.weight === 0 ? "" : Math.round(item.weight * 10000) / 100} onChange={(e) => {
            const value = Number(e.target.value);
            const other = items.reduce((sum, c, i) => sum + (i !== index && c.group !== "A" ? c.weight : 0), 0);
            if (item.group !== "A" && value / 100 + other > 0.8 + 1e-8) {
              setWeightError("Tổng tỷ trọng nhóm B không được vượt 80%. Dòng này còn được nhập tối đa " + Math.max(0, Math.round((0.8 - other) * 10000) / 100) + "%.");
              return;
            }
            if (!Number.isFinite(value) || value < 0) return;
            e.currentTarget.value = e.target.value === "" ? "" : String(value);
            setWeightError("");
            update(index, { weight: value / 100 });
          }} /></td>
          {(["t", "b", "s"] as const).map((key) => <td key={key} aria-label={`Chỉ tiêu ${key.toUpperCase()} ${index + 1}`} title={item.manual ? "Nhập tay" : "Lấy theo nhiệm vụ đã chọn"} className="min-w-20 whitespace-nowrap p-3 text-center tabular-nums">{item.manual ? <Input aria-label={`Chỉ tiêu ${key.toUpperCase()} nhập tay ${index + 1}`} className="w-24 text-center" value={item.target[key]} onChange={(e) => update(index, { target: { ...item.target, [key]: e.target.value } })} /> : (item.target[key] || "—")}</td>)}
          <td className="whitespace-nowrap p-3 text-center">{item.manual ? <Input type="date" aria-label={`Ngày bắt đầu ${index + 1}`} className="w-36" value={item.startDate ?? ""} onChange={(e) => update(index, { startDate: e.target.value })} /> : (item.startDate?.split("-").reverse().join("/") ?? "—")}</td><td className="whitespace-nowrap p-3 text-center">{item.manual ? <Input type="date" aria-label={`Ngày hoàn thành ${index + 1}`} className="w-36" value={item.endDate ?? ""} onChange={(e) => update(index, { endDate: e.target.value })} /> : (item.endDate?.split("-").reverse().join("/") ?? "—")}</td>
          <td className="p-2"><textarea aria-label={`Kết quả thực hiện ${index + 1}`} className="min-h-16 w-52 rounded-md border bg-card p-2 text-sm" value={item.result} onChange={(e) => update(index, { result: e.target.value })} /></td>
          <td className="p-2">{showCqtt ? <Input aria-label={`Điểm tự đánh giá nhiệm vụ ${index + 1}`} className="w-24 text-center" type="number" min="1" max={cqttLimits?.[index] ?? (cqttLimits ? 0 : 5)} step="0.01" value={item.self || ""} onChange={(e) => update(index, { self: Number(e.target.value) })} /> : <select aria-label={`Điểm tự đánh giá nhiệm vụ ${index + 1}`} className="mx-auto h-9 w-28 min-w-28 rounded-md border bg-card px-2 text-center text-sm" value={item.self || ""} onChange={(e) => update(index, { self: Number(e.target.value) })}><option value="">Chọn điểm</option>{[1, 2, 3, 4, 5].map(score => <option key={score} value={score}>{score}</option>)}</select>}</td>
          {showCqtt && <td className="p-3 text-center font-medium text-primary" aria-label={`QLTT đánh giá ${index + 1}`} title="Điểm CQTT đã đánh giá cho công việc — tham chiếu, không chỉnh sửa">{cqttAllocated?.[index] == null ? "—" : String(Math.round(cqttAllocated[index]! * 100) / 100)}</td>}
          <td className="p-2"><Button type="button" variant="ghost" size="action" title="Xóa nhiệm vụ" aria-label={`Xóa nhiệm vụ ${index + 1}`} disabled={items.length === 1} onClick={() => setPendingDelete(index)}><TrashIcon /></Button></td>
        </tr>)}
        <tr><td colSpan={span} className="border-t bg-card py-2"><div className="sticky left-0 w-fit px-3"><Button type="button" variant="outline" size="sm" aria-label={`Thêm nhiệm vụ nhóm ${group}`} onClick={() => addToGroup(group)}><Plus />Thêm nhiệm vụ</Button></div></td></tr>
      </Fragment>)}
      </tbody>
      <tfoot className="border-t bg-muted font-semibold"><tr><td colSpan={6} className="p-3">Tổng tỷ trọng</td><td className="p-2 text-center">{Math.round(items.reduce((sum, c) => sum + c.weight, 0) * 100)}%</td><td colSpan={5} /><td className="whitespace-nowrap p-3 text-right">Tổng điểm (Ʃ Tỷ trọng * Điểm)</td><td className="p-3 text-center">{items.some((c) => c.self) ? totalScore(items).toFixed(2) : "—"}</td>{showCqtt && <td className="p-3 text-center text-amber-700">{cqttSum?.toFixed(2) ?? "—"}</td>}<td /></tr></tfoot>
    </table>
    </div>
    {detailContext && detailIndex !== null && items[detailIndex] && <TaskDetailDialog ev={detailContext} criterion={items[detailIndex]!} index={detailIndex} onClose={() => setDetailIndex(null)} />}
    <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader className="text-center sm:text-center">
          <AlertDialogTitle>Bạn có chắc chắn muốn xóa nhiệm vụ {pendingDelete === null ? "" : items[pendingDelete]?.goal || `${pendingDelete + 1}`}?</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">Nhiệm vụ sẽ bị xóa khỏi phiếu đánh giá.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={() => { if (pendingDelete !== null) onChange(items.filter((_, i) => i !== pendingDelete)); }}>Đồng ý</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
