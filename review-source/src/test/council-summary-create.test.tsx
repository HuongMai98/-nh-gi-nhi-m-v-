import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { EvaluationProvider } from "@/components/EvaluationProvider";
import { useEvaluations } from "@/components/evaluation-context";
import { councilStatus } from "@/lib/council-filter";
import { EVALUATIONS } from "@/lib/evaluation";
function Probe() {
  const { evaluations, setPreviewRole, createCouncilSummary, updateEvaluation } = useEvaluations();
  const e = evaluations.find((e) => e.id === "DG-2026-Q3-002")!;
  return <><output>{JSON.stringify(e)}</output><button onClick={() => setPreviewRole("council")}>Vai trò</button><button onClick={() => createCouncilSummary([e.id])}>Tạo tổng hợp</button>
    <button onClick={() => updateEvaluation(e.id, {criteria:e.criteria.map((c,i)=>({...c,council:i%2?3:4}))})}>Lưu điểm</button>
    <button onClick={() => updateEvaluation(e.id, {criteria:e.criteria.map(c=>({...c,council:3.5}))})}>Sửa điểm</button>
    <button onClick={() => updateEvaluation(e.id, {}, "finish")}>Hoàn tất</button>
  </>;
}
it("only creates council summary after the council explicitly requests it", () => {
  render(<EvaluationProvider><Probe /></EvaluationProvider>);
  const record = () => JSON.parse(screen.getByRole("status").textContent!);
  expect(record().councilSummaryCreated).toBeUndefined();
  fireEvent.click(screen.getByText("Vai trò"));
  fireEvent.click(screen.getByText("Tạo tổng hợp"));
  expect(record().councilSummaryCreated).not.toBe(true);
  fireEvent.click(screen.getByText("Lưu điểm"));
  expect(councilStatus(record().step,record().councilReviewed)).toBe("pending");
  fireEvent.click(screen.getByText("Tạo tổng hợp"));
  expect(record().councilSummaryCreated).not.toBe(true);
  fireEvent.click(screen.getByText("Hoàn tất"));
  expect(councilStatus(record().step,record().councilReviewed)).toBe("completed");
  expect(record().councilSummaryCreated).not.toBe(true);
  const before=record();
  fireEvent.click(screen.getByText("Tạo tổng hợp"));
  expect(record().councilSummaryCreated).toBe(true);
  expect(record().councilReviewed).toBe(true);
  expect(record().councilScore).toBe(before.councilScore);
  expect(record().criteria).toEqual(before.criteria);
  fireEvent.click(screen.getByText("Sửa điểm"));
  expect(record().councilSummaryCreated).toBe(false);
  expect(councilStatus(record().step,record().councilReviewed)).toBe("pending");
});

function StaleTotalProbe() {
  const {evaluations, addEvaluation, setPreviewRole, createCouncilSummary} = useEvaluations();
  const id="council-total-from-tasks";
  const e=evaluations.find(e=>e.id===id);
  return <>
    <button onClick={()=>{setPreviewRole("council"); addEvaluation({...EVALUATIONS[1]!,id,step:"council",councilReviewed:true,councilTaskScored:true,councilScore:1,criteria:EVALUATIONS[1]!.criteria.map((c,i)=>({...c,council:i%2?3:4}))});}}>Chuẩn bị</button>
    <button onClick={()=>createCouncilSummary([id])}>Tổng hợp KI</button>
    <output data-testid="stale-record">{JSON.stringify(e)}</output>
  </>;
}
it("Tổng hợp KI tính Điểm đánh giá từ chi tiết Hội đồng, không dùng tổng cũ hoặc Điểm CQTT",()=>{
  render(<EvaluationProvider><StaleTotalProbe/></EvaluationProvider>);
  fireEvent.click(screen.getByText("Chuẩn bị"));
  fireEvent.click(screen.getByText("Tổng hợp KI"));
  const e=JSON.parse(screen.getByTestId("stale-record").textContent!);
  const expected=Math.round(e.criteria.reduce((sum:number,c:{weight:number;council:number})=>sum+c.weight*c.council,0)*100)/100;
  expect(e.councilSummaryCreated).toBe(true);
  expect(e.councilScore).toBe(expected);
  expect(e.councilScore).not.toBe(1);
  expect(e.councilScore).not.toBe(e.cqttKey+e.cqttFunction);
});
