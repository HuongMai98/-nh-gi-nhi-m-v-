import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { EvaluationProvider } from "@/components/EvaluationProvider";
import { useEvaluations } from "@/components/evaluation-context";
function Probe() {
  const { evaluations, setPreviewRole, createCouncilSummary } = useEvaluations();
  const e = evaluations.find((e) => e.id === "DG-2026-Q3-002")!;
  return <><output>{JSON.stringify(e)}</output><button onClick={() => setPreviewRole("council")}>Vai trò</button><button onClick={() => createCouncilSummary([e.id])}>Tạo tổng hợp</button></>;
}
it("only creates council summary after the council explicitly requests it", () => {
  render(<EvaluationProvider><Probe /></EvaluationProvider>);
  const record = () => JSON.parse(screen.getByRole("status").textContent!);
  expect(record().councilSummaryCreated).toBeUndefined();
  fireEvent.click(screen.getByText("Vai trò"));
  fireEvent.click(screen.getByText("Tạo tổng hợp"));
  expect(record().councilSummaryCreated).toBe(true);
  expect(record().councilReviewed).toBeUndefined();
});
