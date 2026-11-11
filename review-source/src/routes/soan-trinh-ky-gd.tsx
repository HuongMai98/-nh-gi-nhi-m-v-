import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Download, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEvaluations } from "@/components/evaluation-context";
import { downloadSigningAttachment } from "@/lib/director-signing";

export const Route = createFileRoute("/soan-trinh-ky-gd")({
  component: DirectorSigningPage,
});

export function DirectorSigningPage() {
  const navigate = useNavigate();
  const { directorSigningDraft: draft, setDirectorSigningDraft, previewRole, submitDirectorSigning } = useEvaluations();
  const [subject, setSubject] = useState(() => draft ? `Tổng hợp kết quả đánh giá và xếp hạng KI · ${draft.period}` : "");
  const [note, setNote] = useState("");
  const [references, setReferences] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function close(submitted = false) {
    setDirectorSigningDraft(null);
    void navigate({ to: "/", search: { council: submitted ? "submitted" : "completed" } });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || busy || previewRole !== "council" || !subject.trim()) return;
    setBusy(true);
    setError("");
    try {
      const issue = await submitDirectorSigning(draft.ids, {
        files: [...draft.files, ...references.map((blob) => ({ name: blob.name, blob }))],
        note: [subject.trim(), note.trim(), `Phiếu GNV kỳ tới: ${draft.refs.join(", ")}`].filter(Boolean).join("\n"),
      });
      if (issue) setError(issue);
      else close(true);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Không gửi được hồ sơ trình ký.");
    } finally {
      setBusy(false);
    }
  }

  return <AppShell title="Chỉnh sửa văn bản trình ký" crumbs={<><span>Ký điện tử</span><span>›</span><span>Văn bản trình ký</span></>}>
    {draft && previewRole === "council" ? <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">Hồ sơ chưa gửi người ký. Kiểm tra file và thông tin, sau đó bấm Trình ký.</p>
      <section className="space-y-4 rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Danh sách file</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 text-sm">
            <h3>File trình ký</h3>
            {draft.files.map((file) => <div key={file.name} className="flex items-center justify-between gap-2 rounded-md border p-2">
              <span>{file.name}</span>
              <Button type="button" variant="ghost" size="action" aria-label={`Tải xuống ${file.name}`} onClick={() => downloadSigningAttachment(file)}><Download /></Button>
            </div>)}
          </div>
          <label className="space-y-2 text-sm">
            <span>File sở cứ</span>
            <Input type="file" multiple onChange={(event) => setReferences(Array.from(event.target.files ?? []))} />
          </label>
          <div className="space-y-2 text-sm">
            <h3>Phiếu GNV kỳ tới</h3>
            <ul className="rounded-md border p-2">{draft.refs.map((ref) => <li key={ref}>{ref}</li>)}</ul>
          </div>
        </div>
      </section>
      <section className="space-y-4 rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Thông tin chi tiết</h2>
        <label className="block space-y-2 text-sm"><span>Trích yếu nội dung văn bản *</span><Input required value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
        <label className="block space-y-2 text-sm"><span>Ghi chú</span><Input value={note} onChange={(event) => setNote(event.target.value)} /></label>
      </section>
      <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-card p-4">
        {error && <p role="alert" className="mr-auto text-sm text-destructive">{error}</p>}
        <Button type="button" variant="outline" disabled={busy} onClick={() => close()}>Hủy</Button>
        <Button type="submit" disabled={busy || !subject.trim()}><Send />{busy ? "Đang gửi…" : "Trình ký"}</Button>
      </div>
    </form> : <div className="space-y-3">
      <p>Chưa có hồ sơ trình ký. Hãy mở hồ sơ từ màn Tổng hợp KPI.</p>
      <Button variant="outline" onClick={() => close()}>Về danh sách đánh giá</Button>
    </div>}
  </AppShell>;
}

