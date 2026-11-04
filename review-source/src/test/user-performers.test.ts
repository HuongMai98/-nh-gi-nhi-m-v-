import { expect, it } from "vitest";
import { unitLeaders, type User } from "@/lib/users";
it("chỉ lấy lãnh đạo cao nhất của đơn vị người tạo phiếu", () => {
  const leader: User = { employeeId: "01", name: "A", unit: "Ban A", block: "Khối Cơ quan" };
  const staff = { ...leader, employeeId: "02", name: "B" };
  const other = { ...leader, employeeId: "03", unit: "Ban B" };
  expect(unitLeaders([other, leader, staff], staff)).toEqual([leader]);
  expect(unitLeaders([], staff)).toEqual([staff]);
});
