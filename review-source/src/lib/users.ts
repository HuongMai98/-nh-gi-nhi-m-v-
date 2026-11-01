import { EVALUATIONS, type Evaluation } from "./evaluation";

export type User = {
  employeeId: string;
  name: string;
  unit: string;
  block: Evaluation["block"];
};

export function sameUnitPerformers(users: User[], currentUser: User): User[] {
  return [...new Map([currentUser, ...users.filter((user) => user.unit === currentUser.unit)]
    .map((user) => [user.employeeId, user])).values()];
}

// shortcut: danh bạ và phiên đăng nhập mẫu, thay bằng API người dùng và phiên QLTT khi tích hợp.
export const USERS: User[] = EVALUATIONS.map((e) => ({
  employeeId: e.employeeId!, name: e.owner, unit: e.unit, block: e.block,
}));
export const CURRENT_USER = USERS.find((user) => user.employeeId === EVALUATIONS.find((e) => e.step === "self")?.employeeId)!;

export function canSubmitEvaluation(e: Evaluation, user: User): boolean {
  return e.employeeId === user.employeeId || e.unit === user.unit;
}
export function validateSelfSubmission(e: Evaluation): string | null {
  const total = e.criteria.reduce((sum, c) => sum + c.weight, 0);
  const key = e.criteria.filter((c) => c.group === "A").reduce((sum, c) => sum + c.weight, 0);
  if (!e.criteria.length || Math.abs(total - 1) > 0.00001 || Math.abs(key - 0.2) > 0.00001)
    return "Tỷ trọng phải đủ 100%: nhiệm vụ trọng tâm 20%, các nhóm còn lại 80%.";
  if (e.criteria.some((c) => !c.result.trim() || !Number.isInteger(c.self) || c.self < 1 || c.self > 5))
    return "Nhập đủ kết quả và điểm tự đánh giá 1–5 cho từng nhiệm vụ.";
  return null;
}

export function personalMetadata(employeeId: string) {
  const e = EVALUATIONS.find((e) => e.employeeId === employeeId);
  return {
    ...(e?.jobTitle ? { jobTitle: e.jobTitle } : {}),
    ...(e?.location ? { location: e.location } : {}),
    ...(e?.assignmentRef ? { assignmentRef: e.assignmentRef } : {}),
  };
}
