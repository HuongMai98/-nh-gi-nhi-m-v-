import { Fragment, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Copy, Save, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { useEvaluations } from "@/components/evaluation-context";
import { cn } from "@/lib/utils";
import { rating, type Criterion, type Evaluation } from "@/lib/evaluation";

type Group = Criterion["group"];
const GROUPS: { key: Group; label: string; short: string }[] = [
  { key: "A", label: "Nhiệm vụ trọng tâm", short: "Trọng tâm" },
  { key: "B-I", label: "Mục tiêu theo chức năng", short: "Chức năng" },
  { key: "B-II", label: "Kiểm soát ngành dọc", short: "KS ngành dọc" },
];
const SCORES = [1, 2, 3, 4, 5];
const fmt = (v: number | null) => (v === null ? "—" : v.toFixed(2));
/** Điểm bình quân gia quyền (thang 1–5) của các nhiệm vụ đã chấm trong nhóm; null khi chưa chấm nhiệm vụ nào. */
function groupAvg(items: Criterion[], group: Group | "all"): number | null {
  const list = items.filter((c) => (group === "all" || c.group === group) && c.council !== undefined);
  const w = list.reduce((s, c) => s + c.weight, 0);
  return w ? list.reduce((s, c) => s + c.weight * c.council!, 0) / w : null;
}
const tone = (v: number | null) =>
  v === null ? "bg-muted/40 text-muted-foreground" : v >= 4.5 ? "bg-emerald-50 text-emerald-700" : v >= 3.5 ? "bg-blue-50 text-blue-700" : v >= 2.5 ? "bg-violet-50 text-violet-700" : v >= 2 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700";

/**
 * Chấm điểm theo nhiệm vụ: gom nhiệm vụ trọng tâm / chức năng của nhiều cơ quan, đơn vị để chấm ngang hàng.
 * Ghi vào cùng điểm CQTT từng công việc của phiếu (criteria[].council), nên chi tiết phiếu vẫn thấy đủ các nhóm.
 */
export function TaskScoringView({ evaluations }: { evaluations: Evaluation[] }) {
  const { previewRole, updateEvaluation } = useEvaluations();
  const [group, setGroup] = useState<Group | "all">("A");
  const [scored, setScored] = useState<"all" | "todo" | "done">("all");
  const [drafts, setDrafts] = useState<Record<string, Criterion[]>>({});
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // Cơ quan/đơn vị đang lọc (theo mã phiếu); rỗng = tất cả. Bấm ô ma trận thì chọn đúng một đơn vị.
  const [picked, setPicked] = useState<string[]>([]);
  const [showMatrix, setShowMatrix] = useState(true);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [task, setTask] = useState<{ ev: Evaluation; i: number } | null>(null);

  const editableOf = (e: Evaluation) => previewRole === "council" && ["council", "council_adjust"].includes(e.step) && !e.councilReviewed;
  const itemsOf = (e: Evaluation) => drafts[e.id] ?? e.criteria;
  const units = useMemo(() => evaluations.filter((e) => !picked.length || picked.includes(e.id)), [evaluations, picked]);
  const dirty = Object.keys(drafts).filter((id) => evaluations.some((e) => e.id === id));
  const setScore = (e: Evaluation, i: number, value: number | undefined) => {
    setMessage(""); setErrors([]);
    setDrafts((d) => ({ ...d, [e.id]: itemsOf(e).map((c, j) => (j === i ? { ...c, council: value } : c)) }));
  };
  const visibleRows = (e: Evaluation) => itemsOf(e).map((c, i) => ({ c, i })).filter(({ c }) =>
    (group === "all" || c.group === group) && (scored === "all" || (scored === "done") === (c.council !== undefined)));
  const allVisible = units.flatMap((e) => visibleRows(e).map((r) => ({ e, ...r })));
  const totalTasks = units.reduce((n, e) => n + itemsOf(e).filter((c) => group === "all" || c.group === group).length, 0);
  const doneTasks = units.reduce((n, e) => n + itemsOf(e).filter((c) => (group === "all" || c.group === group) && c.council !== undefined).length, 0);

  function copySelf() {
    const next = { ...drafts };
    for (const { e, i, c } of allVisible) if (editableOf(e) && c.council === undefined) {
      const base = next[e.id] ?? e.criteria;
      next[e.id] = base.map((x, j) => (j === i ? { ...x, council: Math.min(5, Math.max(1, Math.round(c.self))) } : x));
    }
    setDrafts(next); setMessage(""); setErrors([]);
  }
  function save(finishIds: string[] = []) {
    const issues: string[] = [];
    let saved = 0, finished = 0;
    for (const id of dirty) {
      const issue = updateEvaluation(id, { criteria: drafts[id]! });
      if (issue) issues.push(`${id}: ${issue}`); else saved++;
    }
    for (const id of finishIds) {
      const e = evaluations.find((x) => x.id === id)!;
      const issue = updateEvaluation(id, { criteria: itemsOf(e) }, "finish");
      if (issue) issues.push(`${id}: ${issue}`); else finished++;
    }
    setDrafts((d) => Object.fromEntries(Object.entries(d).filter(([id]) => issues.some((x) => x.startsWith(id + ":")))));
    setErrors(issues);
    setMessage(issues.length && !saved && !finished ? "" : [saved && `Đã lưu điểm ${saved} phiếu`, finished && `hoàn tất ${finished} phiếu`].filter(Boolean).join(", ") + ".");
  }
  const complete = (e: Evaluation) => itemsOf(e).every((c) => c.council !== undefined);
  const readyToFinish = units.filter((e) => editableOf(e) && complete(e));

  return (
    <section aria-label="Chấm điểm theo nhiệm vụ" className="space-y-4">
      {/* Ma trận tổng quan: điểm bình quân từng nhóm theo cơ quan/đơn vị; bấm ô để lọc. */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Ma trận điểm theo nhóm <span className="font-normal text-muted-foreground">· {evaluations.length} cơ quan/đơn vị</span></h3>
        <button type="button" className="text-xs text-primary hover:underline" aria-expanded={showMatrix} onClick={() => setShowMatrix(!showMatrix)}>{showMatrix ? "Thu gọn" : "Mở ma trận"}</button>
      </div>
      {showMatrix && <div className="max-h-80 overflow-auto rounded-lg border">
        <table className="w-full min-w-[860px] text-sm" aria-label="Ma trận điểm theo nhóm">
          <thead className="sticky top-0 z-10 bg-muted text-left text-xs">
            <tr>
              <th className="px-3 py-2.5 font-medium">Cơ quan / Đơn vị</th>
              {GROUPS.map((g) => <th key={g.key} className="px-3 py-2.5 text-center font-medium">{g.short}</th>)}
              <th className="px-3 py-2.5 text-center font-medium">Tổng (dự kiến)</th>
              <th className="px-3 py-2.5 text-center font-medium">Ki dự kiến</th>
              <th className="px-3 py-2.5 text-center font-medium">Đã chấm</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((e) => {
              const items = itemsOf(e);
              const total = items.every((c) => c.council !== undefined) ? items.reduce((s, c) => s + c.weight * c.council!, 0) : null;
              const done = items.filter((c) => c.council !== undefined).length;
              return (
                <tr key={e.id} className={cn("border-t", picked.includes(e.id) && "bg-accent/40")}>
                  <td className="px-3 py-2">
                    <button type="button" className="text-left hover:underline" onClick={() => { setPicked(picked.length === 1 && picked[0] === e.id ? [] : [e.id]); setGroup("all"); }}>
                      <span className="font-medium">{e.unit}</span><span className="block text-xs text-muted-foreground">{e.owner} · {e.block}</span>
                    </button>
                  </td>
                  {GROUPS.map((g) => {
                    const v = groupAvg(items, g.key);
                    return <td key={g.key} className="px-2 py-1.5 text-center">
                      <button type="button" aria-label={`${e.unit} — ${g.short}`} onClick={() => { setPicked([e.id]); setGroup(g.key); }}
                        className={cn("w-full rounded-md px-2 py-1.5 font-semibold tabular-nums ring-primary/40 hover:ring-2", tone(v))}>{fmt(v)}</button>
                    </td>;
                  })}
                  <td className="px-2 py-1.5 text-center"><span className={cn("inline-block min-w-16 rounded-md px-2 py-1.5 font-semibold tabular-nums", tone(total))}>{fmt(total)}</span></td>
                  <td className="px-3 py-2 text-center font-semibold">{total === null ? "—" : rating(Math.round(total * 100) / 100).ki}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">{done}/{items.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-muted p-1 text-sm" role="tablist" aria-label="Nhóm nhiệm vụ">
          {([["all", "Tất cả"], ...GROUPS.map((g) => [g.key, g.label] as const)] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={group === k} onClick={() => setGroup(k as Group | "all")}
              className={cn("rounded-md px-3 py-1.5", group === k ? "bg-card font-medium text-primary shadow-sm" : "text-muted-foreground")}>{l}</button>
          ))}
        </div>
        <select aria-label="Lọc theo trạng thái chấm" className="h-9 rounded-md border bg-card px-2 text-sm" value={scored} onChange={(ev) => setScored(ev.target.value as typeof scored)}>
          <option value="all">Tất cả nhiệm vụ</option><option value="todo">Chưa chấm</option><option value="done">Đã chấm</option>
        </select>
        <UnitFilter evaluations={evaluations} value={picked} onChange={setPicked} />
        <span className="text-xs text-muted-foreground">Đã chấm <b className="text-foreground tabular-nums">{doneTasks}/{totalTasks}</b> nhiệm vụ</span>
        {previewRole === "council" && (
          <div className="ml-auto flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={copySelf} disabled={!allVisible.some(({ e, c }) => editableOf(e) && c.council === undefined)}><Copy />Sao chép điểm tự đánh giá cho dòng chưa chấm</Button>
            <Button type="button" variant="outline" onClick={() => save()} disabled={!dirty.length}><Save />Lưu{dirty.length ? ` (${dirty.length} phiếu)` : ""}</Button>
            <Button type="button" onClick={() => save(readyToFinish.map((e) => e.id))} disabled={!readyToFinish.length} title="Lưu và Hoàn tất đánh giá các phiếu đã chấm đủ mọi nhiệm vụ"><Check />Hoàn tất {readyToFinish.length} phiếu đã chấm đủ</Button>
          </div>
        )}
      </div>
      {message && <p role="status" className="text-sm text-success">{message}</p>}
      {errors.length > 0 && <ul role="alert" className="space-y-0.5 text-sm text-primary">{errors.map((x) => <li key={x}>{x}</li>)}</ul>}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="bg-muted text-left text-xs">
            <tr>
              <th className="w-10 px-3 py-2.5 font-medium">TT</th>
              <th className="px-3 py-2.5 font-medium">Mục tiêu nhiệm vụ/công việc</th>
              <th className="px-3 py-2.5 font-medium">Nhóm</th>
              <th className="px-3 py-2.5 font-medium">Chỉ số KPI</th>
              <th className="px-3 py-2.5 text-center font-medium">Tỷ trọng</th>
              <th className="px-3 py-2.5 font-medium">T / B / S</th>
              <th className="px-3 py-2.5 font-medium">Kết quả thực hiện</th>
              <th className="px-3 py-2.5 text-center font-medium">CBNV tự ĐG</th>
              <th className="sticky right-0 bg-muted px-3 py-2.5 text-center font-medium shadow-[-2px_0_0_0_var(--color-border)]">CQTT đánh giá (1-5)</th>
            </tr>
          </thead>
          <tbody>
            {units.map((e) => {
              const rows = visibleRows(e);
              if (!rows.length) return null;
              const open = !collapsed.has(e.id);
              const editable = editableOf(e);
              const items = itemsOf(e);
              const done = items.filter((c) => (group === "all" || c.group === group) && c.council !== undefined).length;
              const total = items.filter((c) => group === "all" || c.group === group).length;
              return (
                <Fragment key={e.id}>
                  <tr className="border-t bg-accent/40">
                    <td colSpan={9} className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <button type="button" aria-expanded={open} aria-label={open ? `Thu gọn ${e.unit}` : `Mở ${e.unit}`} onClick={() => setCollapsed((s) => { const n = new Set(s); if (n.has(e.id)) n.delete(e.id); else n.add(e.id); return n; })} className="text-muted-foreground">
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <span className="font-semibold">{e.unit}</span>
                        <span className="text-xs text-muted-foreground">{e.owner} · {e.id}</span>
                        <span className="rounded bg-card px-2 py-0.5 text-xs">Đã chấm {done}/{total}</span>
                        <span className={cn("rounded px-2 py-0.5 text-xs font-medium tabular-nums", tone(groupAvg(items, group)))}>Bình quân {fmt(groupAvg(items, group))}</span>
                        {!editable && <span className="text-xs text-muted-foreground">{e.councilReviewed ? "Đã hoàn tất đánh giá" : "Chỉ xem"}</span>}
                        {drafts[e.id] && <span className="text-xs font-medium text-amber-700">Chưa lưu</span>}
                      </div>
                    </td>
                  </tr>
                  {open && rows.map(({ c, i }, k) => (
                    <tr key={i} className="border-t align-top">
                      <td className="px-3 py-2.5 text-muted-foreground">{k + 1}</td>
                      <td className="max-w-72 px-3 py-2.5"><button type="button" className="text-left text-primary underline-offset-2 hover:underline" onClick={() => setTask({ ev: e, i })}>{c.goal}</button></td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs">{GROUPS.find((g) => g.key === c.group)?.short}</td>
                      <td className="px-3 py-2.5">{c.kpi}<span className="block text-xs text-muted-foreground">{c.unit}</span></td>
                      <td className="px-3 py-2.5 text-center tabular-nums">{Math.round(c.weight * 100)}%</td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{c.target.t} / {c.target.b} / {c.target.s}</td>
                      <td className="max-w-56 px-3 py-2.5">{c.result || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-2.5 text-center font-medium tabular-nums">{c.self || "—"}</td>
                      <td className="sticky right-0 bg-card px-3 py-2 text-center shadow-[-2px_0_0_0_var(--color-border)]">
                        {editable ? (
                          <select aria-label={`CQTT đánh giá ${e.unit} — ${c.goal}`} className={cn("h-9 w-24 rounded-md border bg-card px-2 text-sm", c.council === undefined && "text-muted-foreground")}
                            value={c.council ?? ""} onChange={(ev) => setScore(e, i, ev.target.value ? Number(ev.target.value) : undefined)}>
                            <option value="">Chọn</option>{SCORES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : <span className="font-semibold tabular-nums">{c.council ?? "—"}</span>}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
            {!allVisible.length && <tr><td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">Không có nhiệm vụ phù hợp bộ lọc.</td></tr>}
          </tbody>
        </table>
      </div>
      {task && itemsOf(task.ev)[task.i] && <TaskDetailDialog ev={task.ev} criterion={itemsOf(task.ev)[task.i]!} index={task.i} onClose={() => setTask(null)} />}
    </section>
  );
}

/** Lọc cơ quan/đơn vị có tìm kiếm, chọn nhiều (theo phiếu: cùng tên đơn vị có thể có nhiều người được đánh giá). */
function UnitFilter({ evaluations, value, onChange }: { evaluations: Evaluation[]; value: string[]; onChange: (next: string[]) => void }) {
  const [q, setQ] = useState("");
  const k = q.trim().toLocaleLowerCase("vi");
  const list = evaluations.filter((e) => !k || `${e.unit} ${e.owner} ${e.id}`.toLocaleLowerCase("vi").includes(k));
  const label = !value.length ? "Tất cả CQ/ĐV" : value.length === 1 ? evaluations.find((e) => e.id === value[0])?.unit ?? "1 CQ/ĐV" : `${value.length} CQ/ĐV`;
  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" aria-label="Lọc cơ quan/đơn vị" className={cn("flex h-9 max-w-64 items-center gap-2 rounded-md border bg-card px-2.5 text-sm", value.length && "border-primary/50 text-primary")}>
            <Search className="h-4 w-4 shrink-0 opacity-60" /><span className="truncate">{label}</span><ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 bg-card p-0">
          <div className="border-b p-2">
            <input autoFocus aria-label="Tìm cơ quan/đơn vị" className="h-9 w-full rounded-md border bg-card px-2 text-sm" placeholder="Tìm cơ quan / đơn vị / người" value={q} onChange={(ev) => setQ(ev.target.value)} />
          </div>
          <div className="flex items-center justify-between border-b px-3 py-1.5 text-xs">
            <button type="button" className="text-primary hover:underline" onClick={() => onChange([...new Set([...value, ...list.map((e) => e.id)])])}>Chọn {k ? "kết quả tìm" : "tất cả"} ({list.length})</button>
            <button type="button" className="text-muted-foreground hover:underline" onClick={() => onChange([])}>Bỏ chọn</button>
          </div>
          <ul className="max-h-72 overflow-y-auto p-1" aria-label="Danh sách cơ quan/đơn vị">
            {list.map((e) => (
              <li key={e.id}>
                <label className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={value.includes(e.id)} aria-label={`Chọn ${e.unit} — ${e.owner}`}
                    onChange={(ev) => onChange(ev.target.checked ? [...value, e.id] : value.filter((x) => x !== e.id))} />
                  <span className="min-w-0"><span className="block">{e.unit}</span><span className="block text-xs text-muted-foreground">{e.owner} · {e.block}</span></span>
                </label>
              </li>
            ))}
            {!list.length && <li className="px-2 py-4 text-center text-sm text-muted-foreground">Không tìm thấy cơ quan/đơn vị.</li>}
          </ul>
        </PopoverContent>
      </Popover>
      {value.length > 0 && <button type="button" aria-label="Bỏ lọc cơ quan/đơn vị" className="grid h-9 w-9 place-items-center rounded-md border bg-card text-muted-foreground hover:text-foreground" onClick={() => onChange([])}><X className="h-4 w-4" /></button>}
    </div>
  );
}
