import { afterEach, expect, it } from "vitest";
import { EVALUATIONS, confirmCouncilSummary, supportComment, transition, type Evaluation } from "@/lib/evaluation";
import { councilConfirmers, defaultWorkflow, normalizeBranches, setWorkflows, stageRoles, upgradeWorkflow } from "@/lib/workflow";

afterEach(() => setWorkflows([defaultWorkflow("Khối Cơ quan"), defaultWorkflow("Khối Đơn vị")]));
const atSupport = (): Evaluation => structuredClone(EVALUATIONS.find((e) => e.step === "support")!);

it("mặc định: vai trò từng bước, chủ trì đứng đầu", () => {
  expect(stageRoles("Khối Cơ quan", "support")).toEqual(["support_office", "politics", "hr", "strategy"]);
  expect(stageRoles("Khối Cơ quan", "council")).toEqual(["council", "politics"]);
  expect(stageRoles("Khối Cơ quan", "office")).toEqual(["office"]);
});

it("bỏ Ban Chiến lược khỏi bước Tổ giúp việc: không còn cho ý kiến / gửi điều chỉnh", () => {
  const e = atSupport();
  const c = defaultWorkflow(e.block);
  c.stages = c.stages.map((s) => (s.key === "support" ? { ...s, roles: ["politics"] } : s));
  setWorkflows([normalizeBranches(c)]);
  expect(stageRoles(e.block, "support")).toEqual(["support_office", "politics"]);
  expect(() => supportComment(e, "strategy", "ý kiến", "t1")).toThrow();
  expect(() => transition(e, "strategy", "return", { note: "x" }, "t1")).toThrow();
  expect(supportComment(e, "politics", "ý kiến", "t1").supportOpinions?.some((o) => o.role === "politics" && o.note === "ý kiến")).toBe(true);
});

it("bước CQTT: vai trò phối hợp là bộ phận phải xác nhận Tổng hợp KI", () => {
  const c = defaultWorkflow("Khối Cơ quan");
  c.stages = c.stages.map((s) => (s.key === "council" ? { ...s, roles: ["council", "hr"] } : s));
  setWorkflows([normalizeBranches(c)]);
  expect(councilConfirmers("Khối Cơ quan")).toEqual(["hr"]);
  const e = { ...structuredClone(EVALUATIONS.find((x) => x.step === "council" && x.block === "Khối Cơ quan")!), councilSummaryCreated: true };
  expect(() => confirmCouncilSummary(e, "politics", "t1")).toThrow(/không có quyền/);
  expect(confirmCouncilSummary(e, "hr", "t1").councilConfirmed?.role).toBe("hr");
});

it("bộ phận xác nhận bị bỏ khỏi vai trò bước CQTT thì không còn yêu cầu xác nhận", () => {
  const c = defaultWorkflow("Khối Cơ quan");
  c.stages = c.stages.map((s) => (s.key === "council" ? { ...s, roles: ["council"] } : s));
  expect(normalizeBranches(c).stages.find((s) => s.key === "council")!.confirmBy).toEqual([]);
});

it("cấu hình đã lưu trước đây (chưa có vai trò) nhận vai trò mặc định", () => {
  const old = defaultWorkflow("Khối Đơn vị");
  old.stages = old.stages.map(({ roles: _r, ...s }) => s);
  expect(upgradeWorkflow(old).stages.find((s) => s.key === "support")!.roles).toEqual(["support_office", "politics", "hr", "strategy"]);
});
