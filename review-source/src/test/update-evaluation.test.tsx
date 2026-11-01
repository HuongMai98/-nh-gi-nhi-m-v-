import { CURRENT_USER } from "@/lib/users";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { EvaluationProvider } from "@/components/EvaluationProvider";
import { useEvaluations } from "@/components/evaluation-context";
import { CreateEvaluationDialog } from "@/components/CreateEvaluationDialog";
import { EVALUATIONS } from "@/lib/evaluation";
function EditProbe() {
  const { evaluations, addEvaluation } = useEvaluations();
  const [ready, setReady] = useState(false);
  const e = evaluations.find((e) => e.id === "edit-test")!;
  return <><button onClick={() => { addEvaluation({ ...EVALUATIONS.find((e) => e.employeeId === CURRENT_USER.employeeId)!, id: "edit-test", step: "self", evaluationDate: "2026-10-30" }); setReady(true); }}>Chuẩn bị</button>{ready && <><output data-testid="state">{JSON.stringify({ count: evaluations.length, record: e })}</output><CreateEvaluationDialog existing={e} open onCreated={vi.fn()} onOpenChange={vi.fn()} /></>}</>;
}
it("updates the original self-evaluation without creating another record", () => {
  render(<EvaluationProvider><EditProbe /></EvaluationProvider>);
  fireEvent.click(screen.getByText("Chuẩn bị"));
  expect(screen.getByRole("heading", { name: "Cập nhật phiếu đánh giá" })).toBeInTheDocument();
  expect(screen.getByLabelText(/^Ngày đánh giá/)).toHaveValue("2026-10-30");
  fireEvent.change(screen.getByLabelText(/^Ngày đánh giá/), { target: { value: "2026-11-01" } });
  fireEvent.change(screen.getByLabelText(/^Hạn đánh giá/), { target: { value: "2026-11-25" } });
  fireEvent.change(screen.getByLabelText("Điểm tự đánh giá nhiệm vụ 1"), { target: { value: "3" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu cập nhật" }));
  const state = JSON.parse(screen.getByTestId("state").textContent!);
  expect(state.count).toBe(9);
  expect(state.record.criteria[0].self).toBe(3);
  expect(state.record.evaluationDate).toBe("2026-11-01");
  expect(state.record.deadline).toBe("25/11/2026");
  expect(state.record.step).toBe("self");
  expect(state.record.history.at(-1).action).toBe("Cập nhật phiếu");
});
