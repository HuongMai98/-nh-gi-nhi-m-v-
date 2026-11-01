import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EvaluationProvider } from "@/components/EvaluationProvider";
import { useEvaluations } from "@/components/evaluation-context";
import { EVALUATIONS } from "@/lib/evaluation";
function Probe() {
  const { evaluations, addEvaluation, updateEvaluation } = useEvaluations();
  const source = EVALUATIONS[3]!;
  const e = evaluations.find((item) => item.id === "date-test");
  return (
    <>
      <button onClick={() => addEvaluation({ ...source, id: "date-test" })}>Load</button>
      <button
        onClick={() => {
          if (e)
            updateEvaluation(e.id, {
              criteria: e.criteria.map((c) => ({
                ...c,
                startDate: "wrong",
                endDate: "wrong",
                kpi: "wrong",
                result: "10",
                self: 4,
              })),
            });
        }}
      >
        Save
      </button>
      <output data-testid="saved">{JSON.stringify(e?.criteria[0])}</output>
    </>
  );
}
describe("task data ownership", () => {
  it("preserves task dates and KPI while saving result and self score", () => {
    render(
      <EvaluationProvider>
        <Probe />
      </EvaluationProvider>,
    );
    fireEvent.click(screen.getByText("Load"));
    fireEvent.click(screen.getByText("Save"));
    const c = JSON.parse(screen.getByTestId("saved").textContent ?? "{}");
    expect(c.startDate).toBe(EVALUATIONS[3]!.criteria[0]!.startDate);
    expect(c.endDate).toBe(EVALUATIONS[3]!.criteria[0]!.endDate);
    expect(c.kpi).toBe(EVALUATIONS[3]!.criteria[0]!.kpi);
    expect(c.result).toBe("10");
    expect(c.self).toBe(4);
  });
});
