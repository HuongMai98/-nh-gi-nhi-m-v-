import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Download, Send, Plus, X, FileText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEvaluations } from "@/components/evaluation-context";
import { downloadSigningAttachment, loadSigningTemplate } from "@/lib/director-signing";

export const Route = createFileRoute("/soan-trinh-ky-gd")({
  component: DirectorSigningPage,
});

function AttachmentLabel({ name }: { name: string }) {
  const extension = name.match(/\.([a-z0-9]{1,5})$/i)?.[1]?.toUpperCase();
  const color = extension === "PDF" ? "bg-rose-700 text-white"
    : extension === "XLSX" || extension === "XLS" ? "bg-emerald-700 text-white"
    : "bg-muted text-muted-foreground";
  return <span className="flex min-w-0 items-center gap-2">
    <span aria-hidden="true" className={"inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-[10px] font-semibold " + color}>
      <FileText className="size-3.5" />{extension}
    </span>
    <span className="break-all">{name}</span>
  </span>;
}

export function DirectorSigningPage() {
  const navigate = useNavigate();
  const { directorSigningDraft: draft, setDirectorSigningDraft, previewRole, submitDirectorSigning } = useEvaluations();
  const [subject, setSubject] = useState(() => draft ? `Tổng hợp kết quả đánh giá và xếp hạng KI · ${draft.period}` : "");
  const [note, setNote] = useState(subject);
  const [basis, setBasis] = useState<string[]>([]);
  const [choosingBasis, setChoosingBasis] = useState(false);
  const [people, setPeople] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const { evaluations } = useEvaluations();
  const recipients = evaluations.filter((evaluation) => draft?.ids.includes(evaluation.id));
  const recipientUnits = [...new Set(recipients.map((evaluation) => evaluation.unit))];
  const dropzone = "flex min-h-12 items-center justify-center gap-2 rounded-md border border-dashed bg-muted/25 p-2 text-center text-muted-foreground";
  const field = "block space-y-2 text-sm";
  const toggle = (name: string, label: string) => <label className="inline-flex items-center gap-2 text-sm"><input className="accent-primary" type="checkbox" name={name} />{label}</label>;
  const heading = (number: number, title: string) => <h2 className="flex items-center gap-3 font-semibold"><span className="grid size-6 place-items-center rounded-full bg-muted text-xs">{number}</span>{title}</h2>;
  const select = (name: string, label: string, options: string[]) => <label className={field}><span>{label} <span className="text-primary">*</span></span><select required name={name} className="h-10 w-full rounded-md border bg-background px-3">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
  function addReferences(files: FileList | null) {
    setReferences((current) => [...current, ...Array.from(files ?? []).filter((file) => !current.some((existing) => existing.name === file.name && existing.size === file.size))]);
  }
  const [references, setReferences] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function close(submitted = false) {
    setDirectorSigningDraft(null);
    void navigate({ to: "/", search: { council: submitted ? "submitted" : "completed" } });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || busy || previewRole !== "council" || !subject.trim() || !note.trim()) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const issue = await submitDirectorSigning(draft.ids, {
        files: [...draft.files, loadSigningTemplate(), ...references.map((blob) => ({ name: blob.name, blob }))],
        note: [subject.trim(), note.trim(),
          ...["Độ khẩn", "Độ mật", "Ngành", "Hình thức văn bản", "Ký hiệu văn bản", "Nơi nhận", "Đơn vị ban hành"].map((label) => label + ": " + fields.get(label)),
          ...["Văn bản Đảng", "Phát hành bên ngoài", "Trình ký song song", "Ban hành tự động"].filter((label) => fields.has(label)),
          "Người ký: Giám đốc",
          ...basis.map((ref) => "Văn bản sở cứ: " + ref),
          ...recipients.filter((e) => people[e.id]).map((e) => people[e.id] + ": " + e.owner),
          ...units.map((unit) => "Đơn vị nhận: " + unit),
          ...groups.map((group) => "Nhóm nhận: " + group), `Phiếu GNV kỳ tới: ${draft.refs.join(", ")}`].filter(Boolean).join("\n"),
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
        {heading(1, "Danh sách file")}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 text-sm">
            <h3>File trình ký <span className="text-primary">*</span></h3><div className={dropzone}><FileText aria-hidden="true" className="size-4" />File PDF sinh từ phiếu đã xem trước</div>
            {draft.files.map((file) => <div key={file.name} className="flex items-center justify-between gap-2 rounded-md border p-2">
              <AttachmentLabel name={file.name} />
              <Button type="button" variant="ghost" size="action" aria-label={`Tải xuống ${file.name}`} onClick={() => downloadSigningAttachment(file)}><Download /></Button>
            </div>)}
          </div>
          <div className="space-y-2 text-sm">
            <h3>File sở cứ</h3>
            <label className={dropzone + " cursor-pointer focus-within:ring-2 focus-within:ring-ring"} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addReferences(event.dataTransfer.files); }}>
              <Plus className="size-4" /> Chọn hoặc kéo thả file tại đây
              <input type="file" className="sr-only" multiple onChange={(event) => { addReferences(event.target.files); event.target.value = ""; }} />
            </label>
            {references.map((file, index) => <div key={index} className="flex items-center justify-between gap-2 rounded-md border p-2">
              <AttachmentLabel name={file.name} />
              <Button type="button" variant="ghost" size="action" aria-label={"Bỏ " + file.name} onClick={() => setReferences((current) => current.filter((_, i) => i !== index))}><X /></Button>
            </div>)}
          </div>
          <div className="space-y-2 text-sm">
            <h3>File biểu mẫu</h3><div className={dropzone}>Biểu mẫu XLSX tự động đính kèm</div>
            <div className="flex items-center justify-between gap-2 rounded-md border p-2">
              <AttachmentLabel name="BM 01.xlsx" />
              <Button type="button" variant="ghost" size="action" aria-label="Tải xuống biểu mẫu BM 01.xlsx" onClick={() => downloadSigningAttachment(loadSigningTemplate())}><Download /></Button>
            </div>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <h3>Văn bản sở cứ</h3>
          <Button type="button" variant="outline" size="sm" aria-expanded={choosingBasis} onClick={() => setChoosingBasis(!choosingBasis)}><Plus /> Chọn văn bản</Button>
          {choosingBasis && draft.refs.map((ref) => <label key={ref} className="flex items-center gap-2"><input type="checkbox" checked={basis.includes(ref)} onChange={(event) => setBasis(event.target.checked ? [...basis, ref] : basis.filter((item) => item !== ref))} />{ref}</label>)}
          {basis.length > 0 && <p>{basis.join(", ")}</p>}
          <p className="text-muted-foreground">Phiếu GNV kỳ tới: {draft.refs.join(", ")}</p>
        </div>
      </section>
      <section className="space-y-4 rounded-lg border bg-card p-4">
        {heading(2, "Thông tin chi tiết")}
        <label className={field}><span>Trích yếu nội dung văn bản *</span><Input required value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
        <label className={field}><span>Ghi chú *</span><Input required value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_2fr]">
          {select("Độ khẩn", "Độ khẩn", ["Bình thường", "Khẩn", "Hỏa tốc"])}
          {select("Độ mật", "Độ mật", ["Bình thường", "Mật", "Tối mật"])}
          {select("Ngành", "Ngành", ["Kế hoạch", "Tổ chức", "Công nghệ thông tin"])}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {select("Hình thức văn bản", "Hình thức văn bản", ["Tờ trình", "Phiếu giao nhiệm vụ", "Quyết định"])}
          <label className={field}>Ký hiệu văn bản *<Input required name="Ký hiệu văn bản" defaultValue={"KI-" + draft.period.replace("Quý ", "Q").replace("/", "-")} /></label>
        </div>
        {toggle("Văn bản Đảng", "Văn bản Đảng")}
      </section>
      <section className="space-y-4 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap justify-between gap-4">{heading(3, "Danh sách cá nhân ký duyệt")}<div className="flex flex-wrap gap-4">{toggle("Phát hành bên ngoài", "Phát hành bên ngoài")}{toggle("Trình ký song song", "Trình ký song song")}</div></div>
        <table className="w-full text-left text-sm"><thead className="bg-muted"><tr><th className="p-3">TT</th><th>Ký ban hành</th><th>Đơn vị - Chức danh</th><th>Chữ ký</th></tr></thead><tbody><tr><td className="p-3">1</td><td>Giám đốc</td><td>Giám đốc</td><td><input type="checkbox" checked disabled aria-label="Chữ ký Giám đốc" /></td></tr></tbody></table>
      </section>
      <section className="space-y-4 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap justify-between gap-4">{heading(4, "Ban hành")}{toggle("Ban hành tự động", "Ban hành tự động")}</div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={field}>Nơi nhận *<textarea required name="Nơi nhận" defaultValue="Các cơ quan, đơn vị liên quan" className="block min-h-16 w-full rounded-md border bg-background p-3" /></label>
          <label className={field}>Đơn vị ban hành *<Input required name="Đơn vị ban hành" defaultValue="Văn phòng / Ban Chiến lược" /></label>
        </div>
      </section>
      <section className="space-y-4 rounded-lg border bg-card p-4">
        {heading(5, "Chuyển văn bản")}
        <div className="grid gap-4 md:grid-cols-3">
          <label className={field}>Danh sách cá nhân nhận văn bản<select className="h-10 w-full rounded-md border bg-background px-3" value="" onChange={(event) => setPeople({ ...people, [event.target.value]: "TO" })}><option value="">+ Chọn cá nhân nhận</option>{recipients.filter((e) => !people[e.id]).map((e) => <option key={e.id} value={e.id}>{e.owner} · {e.unit}</option>)}</select></label>
          <label className={field}>Danh sách đơn vị nhận văn bản<select className="h-10 w-full rounded-md border bg-background px-3" value="" onChange={(event) => setUnits([...units, event.target.value])}><option value="">+ Chọn đơn vị nhận</option>{recipientUnits.filter((unit) => !units.includes(unit)).map((unit) => <option key={unit}>{unit}</option>)}</select></label>
          <label className={field}>Danh sách nhóm cá nhân nhận văn bản<select className="h-10 w-full rounded-md border bg-background px-3" value="" onChange={(event) => setGroups([...groups, event.target.value])}><option value="">+ Chọn nhóm cá nhân nhận</option>{["Hội đồng", "CQTT", "Văn phòng / Ban Chiến lược"].filter((group) => !groups.includes(group)).map((group) => <option key={group}>{group}</option>)}</select></label>
        </div>
        {recipients.filter((e) => people[e.id]).map((e) => <div key={e.id} className="flex items-center gap-3 text-sm">
          <select className="rounded border bg-background p-1" aria-label={"Loại người nhận " + e.owner} value={people[e.id]} onChange={(event) => setPeople({ ...people, [e.id]: event.target.value })}><option>TO</option><option>CC</option></select>{e.owner} · {e.unit}
          <Button type="button" size="action" variant="ghost" aria-label={"Bỏ " + e.owner} onClick={() => setPeople({ ...people, [e.id]: "" })}><X /></Button>
        </div>)}
        {units.map((unit) => <Button key={unit} type="button" size="sm" variant="outline" onClick={() => setUnits(units.filter((item) => item !== unit))}>{unit}<X /></Button>)}
        {groups.map((group) => <Button key={group} type="button" size="sm" variant="outline" onClick={() => setGroups(groups.filter((item) => item !== group))}>{group}<X /></Button>)}
      </section>
      <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-card p-4">
        <span className="mr-auto text-xs text-muted-foreground">Bản đang soạn</span>
        {error && <p role="alert" className="mr-auto text-sm text-destructive">{error}</p>}
        <Button type="button" variant="outline" disabled={busy} onClick={() => close()}>Hủy</Button>
        <Button type="submit" disabled={busy || !subject.trim() || !note.trim()}><Send />{busy ? "Đang gửi…" : "Trình ký"}</Button>
      </div>
    </form> : <div className="space-y-3">
      <p>Chưa có hồ sơ trình ký. Hãy mở hồ sơ từ màn Tổng hợp KPI.</p>
      <Button variant="outline" onClick={() => close()}>Về danh sách đánh giá</Button>
    </div>}
  </AppShell>;
}

