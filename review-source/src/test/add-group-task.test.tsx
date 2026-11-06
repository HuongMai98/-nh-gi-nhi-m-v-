import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { CreateEvaluationTable, type FormCriterion } from "@/components/CreateEvaluationTable";
import { EVALUATIONS } from "@/lib/evaluation";
function Probe() {
  const [items, setItems] = useState<FormCriterion[]>(EVALUATIONS[0]!.criteria);
  return <><output data-testid="items">{JSON.stringify(items)}</output><CreateEvaluationTable items={items} tasksFor={() => []} onChange={setItems} /></>;
}
it.each(["A", "B-I", "B-II"] as const)("adds a blank task in group %s without changing existing weights", group => {
  render(<Probe />);
  const before = EVALUATIONS[0]!.criteria;
  expect(screen.queryByRole("columnheader", { name: "Nhóm mục tiêu" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/^Nhóm mục tiêu/)).not.toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /^Thêm nhiệm vụ nhóm/ })).toHaveLength(3);
  fireEvent.click(screen.getByRole("button", { name: `Thêm nhiệm vụ nhóm ${group}` }));
  const items: FormCriterion[] = JSON.parse(screen.getByTestId("items").textContent!);
  expect(items).toHaveLength(before.length + 1);
  const added = items.find(c => !c.goal)!;
  expect(added).toMatchObject({ group, weight: 0, self: 0 });
  expect(items.filter(c => c.goal)).toEqual(before);
  expect(items.map(c => c.group)).toEqual([...items.map(c => c.group)].sort((a,b) => ["A","B-I","B-II"].indexOf(a)-["A","B-I","B-II"].indexOf(b)));
});