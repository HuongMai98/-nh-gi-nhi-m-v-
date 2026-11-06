import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
import { AssessmentSummary } from "@/components/AssessmentSummary";
import { EvaluationProvider } from "@/components/EvaluationProvider";
import { useEvaluations } from "@/components/evaluation-context";
import { EVALUATIONS, type PreviewRole } from "@/lib/evaluation";
function Probe({ role }: { role: PreviewRole }) {
  const { setPreviewRole } = useEvaluations();
  return <><button onClick={() => setPreviewRole(role)}>Vai trò</button><AssessmentSummary evaluations={[EVALUATIONS[0]!]} onExport={() => {}} /></>;
}
it.each(["performer", "office", "cqtt", "council", "ceo", "admin"] as PreviewRole[])("offers PDF and CSV for %s", async role => {
  render(<EvaluationProvider><Probe role={role} /></EvaluationProvider>);
  fireEvent.click(screen.getByText("Vai trò"));
  fireEvent.keyDown(screen.getByRole("button", { name: "Xuất file tổng hợp" }), { key: "ArrowDown" });
  expect(await screen.findByRole("menuitem", { name: "Xuất PDF" })).toBeEnabled();
  expect(screen.getByRole("menuitem", { name: "Xuất CSV" })).toBeEnabled();
});