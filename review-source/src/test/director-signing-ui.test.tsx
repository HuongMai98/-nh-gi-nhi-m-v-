import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({ Link: ({children}: {children: React.ReactNode}) => <a>{children}</a> }));
vi.mock("@/lib/pdf-runtime", () => ({ createPdfBlob: vi.fn(async () => new Blob(["pdf"], { type: "application/pdf" })) }));
import { EvaluationProvider } from "@/components/EvaluationProvider";
import { useEvaluations } from "@/components/evaluation-context";
import { AggregateForm } from "@/components/AggregateForm";
import { EVALUATIONS } from "@/lib/evaluation";
import { nextPeriod } from "@/components/DirectorSigningDialog";

function Probe() {
  const { evaluations, setPreviewRole, addEvaluation, signingFiles } = useEvaluations();
  const e = evaluations.find(e => e.id === "SIGNING-TEST");
  return <><button onClick={() => { setPreviewRole("council"); addEvaluation({ ...EVALUATIONS[1]!, id: "SIGNING-TEST", assignmentRef: "GNV-2026-Q3-777", step: "council", councilReviewed: true, councilSummaryCreated: true, councilTaskScored: true, councilScore: 4, ki: "A", locationCompliance: "Tuân thủ", laborCompliance: "Tuân thủ", criteria: EVALUATIONS[1]!.criteria.map(c => ({ ...c, council: 4 })) }); }}>Chuẩn bị</button>
    <output data-testid="state">{JSON.stringify({ step: e?.step, note: e?.history?.at(-1)?.note, files: e?.directorSigningId ? signingFiles[e.directorSigningId]?.map(f => f.name) : [] })}</output>
    {e && <AggregateForm mode="ki" evaluations={[e]} />}
</>;
}
const state = () => JSON.parse(screen.getByTestId("state").textContent!);

it("kỳ tới của Quý IV là Quý I năm sau", () => {
  expect(nextPeriod("Quý III/2026").label).toBe("Quý IV/2026");
  expect(nextPeriod("Quý IV/2026").label).toBe("Quý I/2027");
});

it("Hội đồng bấm Trình ký GĐ: xem PDF phiếu cá nhân + Tổng hợp KI, chọn phiếu GNV kỳ tới rồi gửi", async () => {
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:test", revokeObjectURL: () => {} }));
  render(<EvaluationProvider><Probe /></EvaluationProvider>);
  fireEvent.click(screen.getByText("Chuẩn bị"));
  fireEvent.click(screen.getByRole("button", { name: "Trình ký GĐ" }));
  const dialog = await screen.findByRole("dialog");
  const docs = await within(dialog).findByRole("list", { name: "Tài liệu trình ký" });
  await waitFor(() => expect(within(docs).getAllByRole("listitem")).toHaveLength(2));
  expect(docs).toHaveTextContent("Phieu-danh-gia-SIGNING-TEST.pdf");
  expect(docs).toHaveTextContent("Tong-hop-KI.pdf");
  expect(within(dialog).getByTitle("Xem Phieu-danh-gia-SIGNING-TEST.pdf")).toBeInTheDocument();
  // Bỏ chọn hết phiếu GNV kỳ tới thì không gửi được.
  const gnv = within(dialog).getByLabelText("Chọn GNV-2026-Q4-777");
  fireEvent.click(gnv);
  expect(within(dialog).getByRole("button", { name: "Gửi trình ký" })).toBeDisabled();
  fireEvent.click(gnv);
  fireEvent.click(within(dialog).getByRole("button", { name: "Gửi trình ký" }));
  await waitFor(() => expect(state().step).toBe("ceo"));
  expect(state().files).toEqual(["Phieu-danh-gia-SIGNING-TEST.pdf", "Tong-hop-KI.pdf"]);
  expect(state().note).toContain("GNV-2026-Q4-777");
  vi.unstubAllGlobals();
});
