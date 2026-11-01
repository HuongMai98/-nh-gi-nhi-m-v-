import { afterEach, expect, it } from "vitest";
import {
  defaultVersions,
  defaultWorkflow,
  effectiveVersion,
  getWorkflow,
  setWorkflowVersions,
  validateVersion,
  versionStatus,
  type WorkflowVersion,
} from "@/lib/workflow";

const block = "Khối Cơ quan" as const;
const version = (id: string, effectiveFrom: string, officeOn = true): WorkflowVersion => {
  const c = defaultWorkflow(block);
  c.stages.find((s) => s.key === "office")!.enabled = officeOn;
  return { ...c, id, name: id, effectiveFrom };
};
afterEach(() => setWorkflowVersions(defaultVersions()));

it("chọn cấu hình có ngày áp dụng gần nhất không sau ngày xét", () => {
  const list = [version("v1", "2026-01-01"), version("v2", "2026-10-01", false), version("v3", "2026-12-01")];
  expect(effectiveVersion(list, block, "2026-11-01")?.id).toBe("v2");
  expect(effectiveVersion(list, block, "2026-12-01")?.id).toBe("v3");
  expect(effectiveVersion(list, block, "2025-12-31")).toBeUndefined();
});

it("trạng thái: đang áp dụng / sắp áp dụng / hết hiệu lực", () => {
  const list = [version("v1", "2026-01-01"), version("v2", "2026-10-01"), version("v3", "2026-12-01")];
  expect(list.map((v) => versionStatus(v, list, "2026-11-01"))).toEqual(["expired", "active", "upcoming"]);
});

it("không cho trùng ngày áp dụng trong cùng khối, bắt buộc tên", () => {
  const list = [version("v1", "2026-01-01")];
  expect(validateVersion(version("v2", "2026-01-01"), list).join(" ")).toMatch(/đã có cấu hình áp dụng từ 01\/01\/2026/);
  expect(validateVersion({ ...version("v3", "2026-12-01"), name: " " }, list).join(" ")).toMatch(/tên cấu hình/);
  expect(validateVersion(version("v4", "2026-12-01"), list)).toEqual([]);
});

it("engine chạy theo cấu hình đang áp dụng hôm nay, bỏ qua cấu hình tương lai", () => {
  setWorkflowVersions([version("v1", "2000-01-01", true), version("v2", "2999-01-01", false)]);
  expect(getWorkflow(block).stages.find((s) => s.key === "office")!.enabled).toBe(true);
  setWorkflowVersions([version("v1", "2000-01-01", true), version("v2", "2001-01-01", false)]);
  expect(getWorkflow(block).stages.find((s) => s.key === "office")!.enabled).toBe(false);
});

it("Nháp: chưa có hiệu lực, không chặn trùng ngày cho đến khi ban hành", () => {
  const list = [version("v1", "2026-01-01"), { ...version("d1", "2026-01-01", false), published: false }];
  expect(versionStatus(list[1]!, list, "2026-11-01")).toBe("draft");
  expect(effectiveVersion(list, block, "2026-11-01")?.id).toBe("v1");
  expect(validateVersion(list[1]!, list)).toEqual([]);
  expect(validateVersion({ ...list[1]!, published: true }, list).join(" ")).toMatch(/đã có cấu hình áp dụng/);
});

it("Không hiệu lực: không được áp dụng dù ngày áp dụng gần nhất", () => {
  const list = [version("v1", "2026-01-01"), { ...version("x1", "2026-10-01", false), state: "inactive" as const }];
  expect(versionStatus(list[1]!, list, "2026-11-01")).toBe("inactive");
  expect(effectiveVersion(list, block, "2026-11-01")?.id).toBe("v1");
});
