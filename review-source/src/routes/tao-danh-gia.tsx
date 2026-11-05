import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CreateEvaluationDialog, EVALUATION_FORM_ACTIONS_ID } from "@/components/CreateEvaluationDialog";

// Trang Thêm mới đánh giá (bố cục theo trang Thêm mới nhiệm vụ của VOffice).
export const Route = createFileRoute("/tao-danh-gia")({
  head: () => ({ meta: [{ title: "Thêm mới đánh giá — vOffice" }] }),
  component: CreateEvaluationPage,
});

function CreateEvaluationPage() {
  const navigate = useNavigate();
  const back = () => { void navigate({ to: "/" }); };
  return (
    <AppShell
      title="Thêm mới đánh giá"
      crumbs={<><Link to="/" className="hover:text-foreground">Đánh giá</Link><span>›</span><span>Thêm mới đánh giá</span></>}
      actions={<div id={EVALUATION_FORM_ACTIONS_ID} className="flex flex-wrap gap-2" />}
    >
      <CreateEvaluationDialog open onOpenChange={(open) => { if (!open) back(); }} onCreated={back} />
    </AppShell>
  );
}
