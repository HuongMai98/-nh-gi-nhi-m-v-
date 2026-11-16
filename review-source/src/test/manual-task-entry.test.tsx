import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { CreateEvaluationTable, type FormCriterion } from "@/components/CreateEvaluationTable";
import { EVALUATIONS } from "@/lib/evaluation";
function Probe({ onItems }: { onItems: (items: FormCriterion[]) => void }) {
  const [items, setItems] = useState<FormCriterion[]>(EVALUATIONS[0]!.criteria);
  onItems(items);
  return <CreateEvaluationTable items={items} tasksFor={() => []} onChange={setItems} />;
}
it("manual task: all fields editable; system task fields stay locked", () => {
  let latest: FormCriterion[] = [];
  render(<Probe onItems={(items) => { latest = items; }} />);
  // system row: KPI is read-only
  expect(screen.getByLabelText("Chỉ số đo lường KPI 1")).toHaveAttribute("readonly");
  fireEvent.click(screen.getByRole("button", { name: "Thêm nhiệm vụ nhóm A" }));
  const idx = latest.length;
  fireEvent.change(screen.getByLabelText(`Nhiệm vụ * ${idx}`) ?? screen.getAllByRole("combobox").at(-1)!, { target: { value: "__manual__" } });
  fireEvent.change(screen.getByLabelText(`Tên nhiệm vụ nhập tay ${idx}`), { target: { value: "Việc mới" } });
  fireEvent.change(screen.getByLabelText(`Chỉ số đo lường KPI ${idx}`), { target: { value: "KPI mới" } });
  expect(screen.getByLabelText(`Chỉ số đo lường KPI ${idx}`)).not.toHaveAttribute("readonly");
  fireEvent.change(screen.getByLabelText(`Chỉ tiêu B nhập tay ${idx}`), { target: { value: "10" } });
  const added = latest[idx - 1]!;
  expect(added).toMatchObject({ manual: true, goal: "Việc mới", kpi: "KPI mới", target: { b: "10", t: "", s: "" } });
  expect(added.sourceTaskId).toBeUndefined();
});
