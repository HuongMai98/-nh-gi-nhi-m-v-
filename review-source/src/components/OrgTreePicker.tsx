import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ALL_ORG_LEAVES, ORG_TREE, compactOrgSelection, filterOrgTree, leaves, orgName, type OrgNode, type OrgType } from "@/lib/orgs";

/** Chọn nhiều đơn vị xử lý theo cây tổ chức (VHR_ORG): chọn nút cha = chọn toàn bộ đơn vị bên dưới. */
export function OrgTreePicker({ label, value, disabled, placeholder = "Chọn đơn vị", onChange }: {
  label: string;
  value: string[];
  disabled?: boolean;
  placeholder?: string;
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const shown = compactOrgSelection(value);
  return (
    <>
      <button type="button" disabled={disabled} aria-label={label} onClick={() => setOpen(true)}
        className="flex min-h-9 w-56 items-start justify-between gap-2 rounded-md border bg-card px-2 py-1.5 text-left text-sm disabled:bg-muted disabled:text-muted-foreground">
        <span className="flex flex-wrap gap-1">
          {shown.length ? shown.map((id) => <span key={id} className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">{orgName(id)}</span>) : <span className="text-muted-foreground">{placeholder}</span>}
        </span>
        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />
      </button>
      {open && <OrgTreeDialog title={label} value={value} onClose={() => setOpen(false)} onApply={(next) => { onChange(next); setOpen(false); }} />}
    </>
  );
}

function OrgTreeDialog({ title, value, onClose, onApply }: { title: string; value: string[]; onClose: () => void; onApply: (next: string[]) => void }) {
  const [selected, setSelected] = useState(() => new Set(value));
  const [type, setType] = useState<OrgType | "all">("all");
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const tree = useMemo(() => filterOrgTree(ORG_TREE, type, q), [type, q]);
  const visibleLeaves = tree.flatMap(leaves);
  const toggle = (node: OrgNode, on: boolean) => setSelected((cur) => {
    const next = new Set(cur);
    for (const l of leaves(node)) if (on) next.add(l.id); else next.delete(l.id);
    return next;
  });
  const allOn = visibleLeaves.length > 0 && visibleLeaves.every((l) => selected.has(l.id));
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 bg-card p-0 sm:max-w-xl">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Chọn đơn vị</DialogTitle>
          <DialogDescription>{title} · Đã chọn {selected.size}/{ALL_ORG_LEAVES.length} đơn vị</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 border-b px-5 py-3">
          <label className="flex h-9 items-center gap-2 rounded-md border bg-card px-2 text-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input aria-label="Tìm đơn vị" className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Tìm cơ quan / đơn vị" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <div className="grid grid-cols-3 rounded-lg bg-muted p-1 text-sm" role="tablist" aria-label="Loại tổ chức">
            {([["all", "Tất cả"], [1, "Cơ quan"], [0, "Đơn vị"]] as const).map(([k, l]) => (
              <button key={String(k)} type="button" role="tab" aria-selected={type === k} onClick={() => setType(k)}
                className={cn("rounded-md py-1.5", type === k ? "bg-card font-medium text-primary shadow-sm" : "text-muted-foreground")}>{l}</button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          <label className="flex items-center justify-between gap-3 border-b px-2 py-2.5 text-sm">
            Chọn tất cả các đơn vị{type === 1 ? " (cơ quan)" : type === 0 ? " (đơn vị)" : ""}
            <input type="checkbox" className="h-5 w-5 accent-primary" aria-label="Chọn tất cả các đơn vị" checked={allOn}
              onChange={(e) => setSelected((cur) => { const next = new Set(cur); for (const l of visibleLeaves) if (e.target.checked) next.add(l.id); else next.delete(l.id); return next; })} />
          </label>
          {!tree.length && <p className="px-2 py-6 text-center text-sm text-muted-foreground">Không tìm thấy đơn vị phù hợp.</p>}
          <ul role="tree" aria-label="Cây tổ chức">
            {tree.map((n) => <TreeRow key={n.id} node={n} depth={0} selected={selected} collapsed={collapsed} searching={!!q.trim()} onToggle={toggle}
              onCollapse={(id) => setCollapsed((c) => { const next = new Set(c); if (next.has(id)) next.delete(id); else next.add(id); return next; })} />)}
          </ul>
        </div>
        <DialogFooter className="border-t px-5 py-3">
          <Button type="button" variant="outline" onClick={() => setSelected(new Set())}>Bỏ chọn</Button>
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button type="button" onClick={() => onApply(ALL_ORG_LEAVES.map((l) => l.id).filter((id) => selected.has(id)))}>Áp dụng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TreeRow({ node, depth, selected, collapsed, searching, onToggle, onCollapse }: {
  node: OrgNode; depth: number; selected: Set<string>; collapsed: Set<string>; searching: boolean;
  onToggle: (node: OrgNode, on: boolean) => void; onCollapse: (id: string) => void;
}) {
  const ls = leaves(node);
  const count = ls.filter((l) => selected.has(l.id)).length;
  const isGroup = !!node.children?.length;
  const open = searching || !collapsed.has(node.id);
  return (
    <li role="treeitem" aria-expanded={isGroup ? open : undefined} aria-selected={count === ls.length}>
      <div className="flex items-center gap-1 rounded px-2 py-2 text-sm hover:bg-accent/60" style={{ paddingLeft: 8 + depth * 20 }}>
        {isGroup ? (
          <button type="button" aria-label={open ? `Thu gọn ${node.name}` : `Mở ${node.name}`} className="grid h-5 w-5 place-items-center text-muted-foreground" onClick={() => onCollapse(node.id)}>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : <span className="w-5" />}
        <span className={cn("flex-1", isGroup && "font-medium")}>{node.name}
          {!isGroup && <span className="ml-2 text-[11px] text-muted-foreground">{node.orgType === 1 ? "Cơ quan" : "Đơn vị"}</span>}
          {isGroup && count > 0 && count < ls.length && <span className="ml-2 text-[11px] font-normal text-primary">{count}/{ls.length}</span>}
        </span>
        <input type="checkbox" className="h-5 w-5 shrink-0 accent-primary" aria-label={`Chọn ${node.name}`}
          checked={count === ls.length}
          ref={(el) => { if (el) el.indeterminate = count > 0 && count < ls.length; }}
          onChange={(e) => onToggle(node, e.target.checked)} />
      </div>
      {isGroup && open && <ul role="group">{node.children!.map((c) => <TreeRow key={c.id} node={c} depth={depth + 1} selected={selected} collapsed={collapsed} searching={searching} onToggle={onToggle} onCollapse={onCollapse} />)}</ul>}
    </li>
  );
}
