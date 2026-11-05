import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ListPagination({ total, page, pageSize, onPageChange, onPageSizeChange }: {
  total: number; page: number; pageSize: number;
  onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <nav aria-label="Phân trang danh sách" className="flex flex-wrap items-center justify-between gap-4 border-t bg-muted/30 px-4 py-4 text-sm">
    <div className="flex items-center gap-3">
      <select aria-label="Số dòng mỗi trang" className="h-9 rounded-md border bg-card px-3" value={pageSize} onChange={event => onPageSizeChange(Number(event.target.value))}>{[10, 20, 50, 100].map(size => <option key={size} value={size}>{size} dòng</option>)}</select>
      <span>Hiển thị {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} / {total}</span>
    </div>
    <div className="flex items-center gap-2">
      <Button type="button" variant="ghost" size="icon" aria-label="Trang đầu" disabled={page === 1} onClick={() => onPageChange(1)}><ChevronsLeft /></Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Trang trước" disabled={page === 1} onClick={() => onPageChange(page - 1)}><ChevronLeft /></Button>
      <select aria-label="Trang hiện tại" className="h-9 min-w-14 rounded-md border bg-card px-2 text-center" value={page} onChange={event => onPageChange(Number(event.target.value))}>{Array.from({ length: pages }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select><span className="px-2">/ {pages}</span>
      <Button type="button" variant="ghost" size="icon" aria-label="Trang sau" disabled={page === pages} onClick={() => onPageChange(page + 1)}><ChevronRight /></Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Trang cuối" disabled={page === pages} onClick={() => onPageChange(pages)}><ChevronsRight /></Button>
    </div>
  </nav>;
}
