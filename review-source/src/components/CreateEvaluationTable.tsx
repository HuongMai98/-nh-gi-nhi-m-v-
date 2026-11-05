import { Fragment, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cqttTaskScores, totalScore, type Criterion } from "@/lib/evaluation";
import type { SourceTask } from "@/lib/source-tasks";

export type FormCriterion = Criterion & { sourceTaskId?: string | undefined };
const groups = [["A", "A. Nhiệm vụ trọng tâm, trọng điểm"], ["B-I", "I. Mục tiêu theo chức năng"], ["B-II", "II. Chỉ số kiểm soát ngành dọc"]] as const;
const field = "h-9 w-full rounded-md border bg-card px-2 text-sm";
export function CreateEvaluationTable({ items, tasksFor, onChange, cqttScore = null }: {
  items: FormCriterion[];
  /** Điểm CQTT (khi CQTT gửi điều chỉnh về) — phân bổ theo tỷ lệ tự đánh giá, chỉ để tham chiếu. */
  cqttScore?: number | null;
  tasksFor: (group: Criterion["group"]) => SourceTask[];
  onChange: (items: FormCriterion[]) => void;
}) {
  const [weightError, setWeightError] = useState("");
  const update = (index: number, patch: Partial<FormCriterion>) => onChange(items.map((c, i) => i === index ? { ...c, ...patch } : c));
  // Lấy trực tiếp điểm CQTT đã chấm từng công việc (hồ sơ cũ: phân bổ từ điểm nhóm).
  const cqttAllocated = cqttScore === null ? null : cqttTaskScores(items, cqttScore);
  const showCqtt = cqttScore !== null;
  const cqttSum = cqttAllocated ? Math.round(items.reduce((s, c, i) => s + c.weight * (cqttAllocated[i] ?? 0), 0) * 100) / 100 : null;
  const span = showCqtt ? 17 : 16;
  return <div>
    {weightError && <p role="alert" className="mb-2 text-sm text-primary">{weightError}</p>}
    <div className="relative isolate max-h-[55dvh] overflow-auto rounded-lg border">
    <table className="w-full min-w-[1650px] text-left text-sm">
      <thead className="sticky top-0 z-30 bg-muted text-xs shadow-[0_1px_0_0_hsl(var(--border))]">
        <tr>{["STT", "TT", "Nhóm mục tiêu", "Nhiệm vụ", "Chỉ số đo lường KPI", "Phương pháp đo", "Đơn vị đo", "Tỷ trọng (%)"].map((h) => <th key={h} rowSpan={2} className={"border-r px-3 py-3 font-medium " + (h === "Tỷ trọng (%)" ? "text-center " : "") +  (h === "STT" ? "sticky left-0 z-20 w-12 min-w-12 bg-muted" : h === "TT" ? "sticky left-12 z-20 w-12 min-w-12 bg-muted" : h === "Nhóm mục tiêu" ? "sticky left-24 z-20 w-44 min-w-44 max-w-44 bg-muted" : h === "Nhiệm vụ" ? "sticky left-68 z-20 w-80 min-w-80 max-w-80 bg-muted shadow-[2px_0_0_0_hsl(var(--border))]" : "")}>{h === "Tỷ trọng (%)" ? <span className="inline-flex flex-col items-center justify-center whitespace-nowrap leading-snug"><span>Tỷ trọng</span><span>(%)</span></span> : h === "Nhiệm vụ" ? "Mục tiêu nhiệm vụ/công việc" : h}{h === "Nhiệm vụ" && <span className="block font-normal italic">(Kết quả mong đợi đối với nhiệm vụ/công việc)</span>}{h === "Phương pháp đo" && <span className="block font-normal italic">(công thức hoặc mô tả cách tính)</span>}{h === "Đơn vị đo" && <span className="block font-normal italic">(số, số lượng, %, điểm, ...)</span>}</th>)}
          <th colSpan={3} className="border-b border-r p-2 text-center font-medium">Các mức chỉ tiêu</th>
          <th rowSpan={2} className="whitespace-nowrap px-3 font-medium">Ngày bắt đầu</th><th rowSpan={2} className="whitespace-nowrap px-3 font-medium">Ngày hoàn thành</th>
          <th colSpan={2} className="border-b p-2 text-center font-medium">Đánh giá kết quả thực hiện mục tiêu nhiệm vụ/công việc</th>{showCqtt && <th rowSpan={2} className="p-3 text-center font-medium">QLTT<br />đánh giá<br /><span className="whitespace-nowrap">(Điểm 1-5)</span></th>}<th rowSpan={2} className="p-3">Thao tác</th>
        </tr>
        <tr>{["Tối thiểu (T - Threshold)", "Mong đợi (B - Base)", "Thách thức (S - Stretch)", "Kết quả thực hiện", "CBNV tự đánh giá (1–5)"].map((h) => <th key={h} className={"p-2 text-center align-top font-medium" + (h.includes(" - ") ? " min-w-32" : "")}>{h === "CBNV tự đánh giá (1–5)" ? <>CBNV tự<br />đánh giá<br /><span className="whitespace-nowrap">(Điểm 1-5)</span></> : h.includes(" - ") ? <><span className="block whitespace-nowrap">{h.slice(0, h.indexOf(" ("))}</span><span className="mt-1 block whitespace-nowrap font-normal">{h.slice(h.indexOf(" (") + 1)}</span></> : h}</th>)}</tr>
      </thead>
      <tbody>{groups.map(([group, label]) => <Fragment key={group}>
        {group === "B-I" && <tr className="bg-accent/50"><th colSpan={span} className="py-2 font-semibold text-primary"><div className="sticky left-0 w-fit max-w-[calc(100vw-6rem)] px-3">B. Nhóm mục tiêu theo chức năng <span className="ml-3 font-normal text-muted-foreground">{Math.round(items.filter((c) => c.group !== "A").reduce((sum, c) => sum + c.weight, 0) * 100)}% / 80%</span></div></th></tr>}
        <tr className="bg-accent/50"><th colSpan={span} className="py-2"><div className={group === "A" ? "sticky left-0 w-fit px-3 font-semibold text-primary" : "sticky left-0 w-fit pl-6 pr-3 font-medium"}>{label}<span className="ml-3 font-normal text-muted-foreground">{Math.round(items.filter((c) => c.group === group).reduce((sum, c) => sum + c.weight, 0) * 100)}%</span></div></th></tr>
        {items.map((item, index) => item.group !== group ? null : <tr key={index} className="border-t align-top">
          <td className="sticky left-0 z-10 min-w-12 bg-card p-3 text-center">{index + 1}</td><td className="sticky left-12 z-10 min-w-12 bg-card p-3 text-center">{items.slice(0, index + 1).filter(c => c.group === group).length}</td>
          <td className="sticky left-24 z-10 w-44 min-w-44 max-w-44 bg-card p-2"><select aria-label={index ? `Nhóm mục tiêu ${index + 1}` : "Nhóm mục tiêu"} className={field + " w-40"} value={item.group} onChange={(e) => onChange(items.map((c, i) => i === index ? { group: e.target.value as Criterion["group"], goal: "", kpi: "", unit: "", weight: c.weight, target: { t: "", b: "", s: "" }, result: "", self: 0 } : c))}>{groups.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></td>
          <td className="sticky left-68 z-10 w-80 min-w-80 max-w-80 bg-card p-2 shadow-[2px_0_0_0_hsl(var(--border))]"><select required aria-label={index ? `Nhiệm vụ * ${index + 1}` : "Nhiệm vụ *"} className={field + " w-full"} value={item.sourceTaskId ?? ""} onChange={(e) => {
            const task = tasksFor(group).find((task) => task.id === e.target.value);
            if (task) onChange(items.map((c, i) => i === index ? { ...task.criterion, self: 0, council: undefined, sourceTaskId: task.id } : c));
          }}><option value="" disabled>{tasksFor(group).length ? "Chọn nhiệm vụ" : "Không có nhiệm vụ phù hợp"}</option>{tasksFor(group).map((task) => <option key={task.id} value={task.id} disabled={items.some((c, i) => i !== index && c.sourceTaskId === task.id)}>{task.criterion.goal} — {task.status}</option>)}</select></td>
          <td className="p-2"><Input aria-label={`Chỉ số đo lường KPI ${index + 1}`} readOnly className="min-w-44" value={item.kpi} /></td>
          <td className="p-2"><Input aria-label={`Phương pháp đo ${index + 1}`} readOnly className="min-w-40" value={item.method ?? ""} /></td>
          <td className="p-2"><Input aria-label={`Đơn vị đo ${index + 1}`} readOnly className="w-24" value={item.unit} /></td>
          <td className="p-2"><Input aria-label={`Tỷ trọng ${index + 1}`} required type="number" className="w-24" min="0.01" max="100" step="0.01" value={item.weight === 0 ? "" : Math.round(item.weight * 10000) / 100} onChange={(e) => {
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
          {(["t", "b", "s"] as const).map((key) => <td key={key} aria-label={`Chỉ tiêu ${key.toUpperCase()} ${index + 1}`} title="Lấy theo nhiệm vụ đã chọn" className="min-w-20 whitespace-nowrap p-3 text-center tabular-nums">{item.target[key] || "—"}</td>)}
          <td className="whitespace-nowrap p-3">{item.startDate?.split("-").reverse().join("/") ?? "—"}</td><td className="whitespace-nowrap p-3">{item.endDate?.split("-").reverse().join("/") ?? "—"}</td>
          <td className="p-2"><textarea aria-label={`Kết quả thực hiện ${index + 1}`} className="min-h-16 w-52 rounded-md border bg-card p-2 text-sm" value={item.result} onChange={(e) => update(index, { result: e.target.value })} /></td>
          <td className="p-2">{showCqtt ? <Input aria-label={`Điểm tự đánh giá nhiệm vụ ${index + 1}`} className="w-24" type="number" min="1" max="5" step="0.01" value={item.self || ""} onChange={(e) => update(index, { self: Number(e.target.value) })} /> : <select aria-label={`Điểm tự đánh giá nhiệm vụ ${index + 1}`} className="mx-auto h-9 w-28 min-w-28 rounded-md border bg-card px-2 text-sm" value={item.self || ""} onChange={(e) => update(index, { self: Number(e.target.value) })}><option value="">Chọn điểm</option>{[1, 2, 3, 4, 5].map(score => <option key={score} value={score}>{score}</option>)}</select>}</td>
          {showCqtt && <td className="p-3 text-center font-medium text-primary" aria-label={`QLTT đánh giá ${index + 1}`} title="Điểm CQTT đã đánh giá cho công việc — tham chiếu, không chỉnh sửa">{cqttAllocated?.[index] == null ? "—" : String(Math.round(cqttAllocated[index]! * 100) / 100)}</td>}
          <td className="p-2"><Button type="button" variant="ghost" size="icon" aria-label={`Xóa nhiệm vụ ${index + 1}`} disabled={items.length === 1} onClick={() => onChange(items.filter((_, i) => i !== index))}><Trash2 /></Button></td>
        </tr>)}
      </Fragment>)}
      </tbody>
      <tfoot className="border-t bg-muted font-semibold"><tr><td colSpan={7} className="p-3">Tổng tỷ trọng</td><td className="p-2">{Math.round(items.reduce((sum, c) => sum + c.weight, 0) * 100)}%</td><td colSpan={5} /><td className="whitespace-nowrap p-3 text-right">Tổng điểm (Σ Tỷ trọng × Điểm)</td><td className="p-3 text-center">{items.some((c) => c.self) ? totalScore(items).toFixed(2) : "—"}</td>{showCqtt && <td className="p-3 text-center text-amber-700">{cqttSum?.toFixed(2) ?? "—"}</td>}<td /></tr></tfoot>
    </table>
    </div>
  </div>;
}
