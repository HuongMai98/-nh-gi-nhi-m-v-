import { expect, it } from "vitest";
import { ALL_ORG_LEAVES, compactOrgSelection, filterOrgTree, leaves, ORG_TREE } from "@/lib/orgs";
import { defaultWorkflow, upgradeWorkflow, validateWorkflow } from "@/lib/workflow";

it("cây tổ chức: org_type 1 là cơ quan, 0 là đơn vị", () => {
  const coQuan = filterOrgTree(ORG_TREE, 1, "").flatMap(leaves);
  const donVi = filterOrgTree(ORG_TREE, 0, "").flatMap(leaves);
  expect(coQuan.every((o) => o.orgType === 1)).toBe(true);
  expect(donVi.every((o) => o.orgType === 0)).toBe(true);
  expect(coQuan.length + donVi.length).toBe(ALL_ORG_LEAVES.length);
  expect(coQuan.map((o) => o.name)).toContain("Cơ quan Chính trị");
});

it("chọn đủ nhóm thì hiển thị gọn bằng tên nhóm", () => {
  const khoi = ORG_TREE[0]!.children![0]!.children![0]!;
  expect(compactOrgSelection(leaves(khoi).map((l) => l.id))).toEqual(["khoi-co-quan"]);
  expect(compactOrgSelection(["van-phong"])).toEqual(["van-phong"]);
});

it("đơn vị xử lý mặc định và bắt buộc chọn ở bước đang bật", () => {
  const c = defaultWorkflow("Khối Đơn vị");
  expect(c.stages.find((s) => s.key === "office")!.handlerOrgs).toEqual(["ban-chien-luoc"]);
  expect(c.stages.find((s) => s.key === "council")!.handlerOrgs).toEqual(["van-phong", "co-quan-chinh-tri"]);
  c.stages = c.stages.map((s) => (s.key === "support" ? { ...s, handlerOrgs: [] } : s));
  expect(validateWorkflow(c).join(" ")).toMatch(/Chọn đơn vị xử lý cho bước "Tổ giúp việc đánh giá"/);
  const old = defaultWorkflow("Khối Cơ quan");
  old.stages = old.stages.map(({ handlerOrgs: _h, ...s }) => s);
  expect(upgradeWorkflow(old).stages.find((s) => s.key === "office")!.handlerOrgs).toEqual(["van-phong"]);
});
