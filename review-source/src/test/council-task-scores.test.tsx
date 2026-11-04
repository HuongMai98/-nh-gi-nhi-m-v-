import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({ Link: ({children}: {children: React.ReactNode}) => <a>{children}</a>, createFileRoute: () => (c: unknown) => c }));
import { EVALUATIONS, saveDraft, transition, cqttTaskScores, cqttTotal, rating, type Evaluation } from "@/lib/evaluation";
import { EvaluationProvider } from "@/components/EvaluationProvider";
import { useEvaluations } from "@/components/evaluation-context";
import { EvaluationDetail } from "@/routes/danh-gia.$id";

const base = EVALUATIONS.find(e=>e.step === "council")!;
it("Hội đồng lưu điểm từng công việc, bảo toàn điểm CQTT và không phân bổ lại khi trình TGĐ", () => {
  const e: Evaluation = { ...base, criteria: base.criteria.map(c=>({...c,cqtt:4})), locationCompliance:"Tuân thủ",laborCompliance:"Tuân thủ" };
  const criteria = e.criteria.map((c,i)=>({...c,council:i%2 ? 4 : 3,cqtt:1,self:1}));
  const saved=saveDraft(e,"council",{criteria},"now");
  expect(saved.criteria.map(c=>c.cqtt)).toEqual(e.criteria.map(c=>c.cqtt));
  expect(saved.criteria.map(c=>c.self)).toEqual(e.criteria.map(c=>c.self));
  expect(saved.criteria.map(c=>c.council)).toEqual(criteria.map(c=>c.council));
  expect(saved.councilReviewed).toBe(true);
  expect(saved.councilScore).toBe(Math.round(criteria.reduce((n,c)=>n+c.weight*c.council!,0)*100)/100);
  expect(()=>transition(saved,"council","submit",{},"now")).toThrow(/tổng hợp KI/);
  expect(transition({...saved,councilSummaryCreated:true},"council","submit",{},"now").criteria).toEqual(saved.criteria);
  expect(()=>saveDraft(e,"council",{criteria:criteria.map(c=>({...c,council:6}))},"now")).toThrow(/1 đến 5/);
  const partial=saveDraft(e,"council",{criteria:criteria.map((c,i)=>({...c,council:i?undefined:4}))},"now");
  expect(partial.councilReviewed).toBe(false);
  expect(()=>transition(partial,"council","submit",{},"now")).toThrow();
});

function Probe() {
  const {evaluations,setPreviewRole,previewRole}=useEvaluations();
  const e=evaluations.find(e=>e.id===base.id)!;
  return <><button onClick={()=>setPreviewRole("council")}>Hội đồng</button><output data-testid="record">{JSON.stringify(e)}</output><EvaluationDetail key={`${e.id}-${e.history?.length}-${previewRole}`} ev={e}/></>;
}
it("Hội đồng thấy tham chiếu CQTT, sao chép và sửa điểm từng công việc rồi Lưu",()=>{
  render(<EvaluationProvider><Probe/></EvaluationProvider>);
  fireEvent.click(screen.getByRole("button",{name:"Hội đồng"}));
  expect(screen.getByTestId("council-task-rating")).toHaveTextContent("—");
  const inputs=screen.getAllByRole("spinbutton",{name:/Hội đồng đánh giá mục tiêu/});
  expect(inputs).toHaveLength(base.criteria.length);
  fireEvent.click(screen.getByRole("button",{name:"Sao chép điểm CQTT từng công việc"}));
  expect((inputs[0] as HTMLInputElement).value).not.toBe("");
  const expected = cqttTaskScores(base.criteria, cqttTotal(base))!;
  inputs.forEach((input, i) => {
    expect(input).toHaveValue(Math.round(expected[i]! * 100) / 100);
    expect((input as HTMLInputElement).validity.stepMismatch).toBe(false);
  });
  const total = Math.round(base.criteria.reduce((sum,c,i)=>sum+c.weight*(Math.round(expected[i]!*100)/100),0)*100)/100;
  expect(screen.getByTestId("council-task-total")).toHaveTextContent(total.toFixed(2));
  expect(screen.getByTestId("council-task-rating")).toHaveTextContent(rating(total).label);
  expect(screen.getByTestId("council-task-total")).toHaveClass("text-primary");
  expect(screen.getByTestId("council-task-rating")).toHaveClass("text-primary");
  fireEvent.change(inputs[0]!,{target:{value:"3.25"}});
  fireEvent.click(screen.getByRole("button",{name:"Lưu"}));
  const saved=JSON.parse(screen.getByTestId("record").textContent!);
  expect(saved.criteria[0].council).toBe(3.25);
  expect(saved.councilReviewed).toBe(true);
});
