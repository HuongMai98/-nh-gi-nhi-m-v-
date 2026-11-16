import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { CreateEvaluationTable, type FormCriterion } from "@/components/CreateEvaluationTable";
import { EVALUATIONS } from "@/lib/evaluation";
function Probe() {
  const [items, setItems] = useState<FormCriterion[]>(EVALUATIONS[0]!.criteria);
  return <><output data-testid="count">{items.length}</output><CreateEvaluationTable items={items} tasksFor={() => []} onChange={setItems} /></>;
}
it("asks before deleting a task and removes it only on confirm", () => {
  render(<Probe />);
  const before = Number(screen.getByTestId("count").textContent);
  const goal = EVALUATIONS[0]!.criteria[0]!.goal;
  fireEvent.click(screen.getByRole("button", { name: "Xóa nhiệm vụ 1" }));
  expect(screen.getByText(`Bạn có chắc chắn muốn xóa nhiệm vụ ${goal}?`)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
  expect(Number(screen.getByTestId("count").textContent)).toBe(before);
  fireEvent.click(screen.getByRole("button", { name: "Xóa nhiệm vụ 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Đồng ý" }));
  expect(Number(screen.getByTestId("count").textContent)).toBe(before - 1);
});
