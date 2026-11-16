import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
  createFileRoute: () => (config: unknown) => config,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
import { toast } from "sonner";
import { EvaluationProvider } from "@/components/EvaluationProvider";
import { useEvaluations } from "@/components/evaluation-context";
import { EvaluationDetail } from "@/routes/danh-gia.$id";
import { EVALUATIONS } from "@/lib/evaluation";
import { CURRENT_USER } from "@/lib/users";

const own = EVALUATIONS.find((e) => e.step === "self" && e.employeeId === CURRENT_USER.employeeId)!;
function Screen() {
  const { evaluations } = useEvaluations();
  const e = evaluations.find((x) => x.id === own.id)!;
  return <EvaluationDetail key={`${e.updated}-${e.step}`} ev={e} />;
}

function ViewScreen() {
  const { evaluations } = useEvaluations();
  const e = evaluations.find((x) => x.id === own.id)!;
  return <EvaluationDetail key={`${e.updated}-${e.step}`} ev={e} readOnly />;
}

it("thao tác thành công hiện thông báo theo tên nút", () => {
  render(<EvaluationProvider><Screen /></EvaluationProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
  expect(toast.success).toHaveBeenLastCalledWith("Cập nhật đánh giá thành công");
  fireEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
  expect(toast.success).toHaveBeenLastCalledWith("Gửi đánh giá thành công");
});

it("nút Gửi đánh giá ở chế độ xem phiếu cũng hiện thông báo", () => {
  render(<EvaluationProvider><ViewScreen /></EvaluationProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
  expect(toast.success).toHaveBeenLastCalledWith("Gửi đánh giá thành công");
});
