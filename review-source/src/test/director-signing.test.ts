import { expect, it } from "vitest";
import { EVALUATIONS, transition, receiveDirectorSigningResult, statusLabelOf, saveDraft, type Evaluation } from "@/lib/evaluation";
import { councilStatus } from "@/lib/council-filter";
function ready(): Evaluation {
  const e = structuredClone(EVALUATIONS.find(e => e.step === "council")!);
  return { ...e, councilReviewed: true, councilSummaryCreated: true, councilTaskScored: true, councilScore: 4, ki: "A", locationCompliance: "Tuân thủ", laborCompliance: "Tuân thủ", criteria: e.criteria.map(c => ({ ...c, council: 4 })) };
}
it("council submits signing; approval ends the evaluation without another approval stage", () => {
  const pending = transition(ready(), "council", "submit", {}, "t1");
  expect(statusLabelOf(pending)).toBe("Đang trình ký");
  expect(pending.directorSigningStatus).toBe("pending");
  expect(() => saveDraft(pending,"ceo",{ councilScore: 5 },"t2")).toThrow();
  const done = receiveDirectorSigningResult(pending,"approved","","t2");
  expect(done.step).toBe("done");
  expect(statusLabelOf(done)).toBe("Đã phê duyệt");
  expect(done.approvedScore).toBe(4);
  expect(() => receiveDirectorSigningResult(done,"approved","","t3")).toThrow();
});
it("a returned signing resets council completion and rejects stale signing results", () => {
  const pending = transition(ready(),"council","submit",{},"t1");
  expect(() => receiveDirectorSigningResult(pending,"returned"," ","t2")).toThrow(/lý do/);
  expect(() => receiveDirectorSigningResult(pending,"approved","","t2","old-request")).toThrow();
  const returned = receiveDirectorSigningResult(pending,"returned","Cần bổ sung minh chứng","t2");
  expect(statusLabelOf(returned)).toBe("Chờ Hội đồng điều chỉnh");
  expect(councilStatus(returned.step,returned.councilReviewed)).toBe("adjustment");
  expect(returned.councilSummaryCreated).toBe(false);
  expect(() => transition(returned,"council","submit",{},"t3")).toThrow(/hoàn tất/);
  const resent = transition({ ...returned,councilReviewed:true,councilSummaryCreated:true },"council","submit",{},"t3");
  expect(resent.directorSigningId).not.toBe(pending.directorSigningId);
});