import { branches, customStageOf, handlerFor, nextNode, resolveReturn, returnTargets, stageOf, type FlowNode, type StageKey } from "./workflow.ts";
export type Step =
  | "self"
  | "office"
  | "cqtt"
  | "response"
  | "cqtt_report"
  | "council"
  | "ceo"
  | "council_adjust"
  | "approved"
  | "dispatch"
  | "sign"
  | "done"
  /** Bước duyệt tùy chỉnh theo cấu hình (xem customStageId). */
  | "custom";
export type PreviewRole = "performer" | "office" | "cqtt" | "council" | "ceo" | "admin";
export type Ki = "A+" | "A" | "B" | "C" | "D" | "K";
export const ROLES: Record<PreviewRole, string> = {
  performer: "CQĐV/CQ",
  office: "Văn phòng / Ban Chiến lược",
  cqtt: "CQTT",
  council: "Hội đồng",
  ceo: "TGĐ",
  admin: "Quản trị hệ thống",
};
/** Chỉ Quản trị hệ thống được cấu hình luồng duyệt. */
export const canConfigureWorkflow = (role: PreviewRole) => role === "admin";
export const ASSIGNING_UNIT = {
  name: "Tập đoàn Công nghệ - Viễn thông Quân đội",
  label: "Tập đoàn",
};
export const MOCK_CURRENT_PERFORMER = "Đinh Ngọc Tuấn";
export const mockPerformerFor = (e: Evaluation) =>
  ["self", "response", "sign"].includes(e.step) ? e.owner : MOCK_CURRENT_PERFORMER;
export const canSelfEvaluate = (e: Evaluation, performer: string) => e.owner === performer;
/** Đơn vị tổng hợp/phát hành kết quả theo cấu hình luồng duyệt của Khối. */
export const officeFor = (e: Evaluation) =>
  handlerFor(e.block, stageOf(e.step) === "dispatch" ? "dispatch" : "office");
export const appendixFor = (_e: Evaluation) => "Phụ lục Kết quả";
export const STEPS: { key: Step; label: string; actor: string }[] = [
  { key: "self", label: "Tự đánh giá", actor: "CQĐV/CQ" },
  { key: "office", label: "Tổng hợp đầu vào", actor: "VP / Ban CL" },
  { key: "cqtt", label: "Rà soát, chấm điểm", actor: "CQTT" },
  { key: "response", label: "Chờ CQ/CQĐV phản hồi", actor: "CQĐV/CQ" },
  { key: "cqtt_report", label: "Tổng hợp báo cáo", actor: "CQTT" },
  { key: "council", label: "Hội đồng đánh giá", actor: "Hội đồng" },
  { key: "ceo", label: "Phê duyệt kết quả", actor: "TGĐ" },
  { key: "council_adjust", label: "Chờ Hội đồng điều chỉnh", actor: "Hội đồng" },
  { key: "approved", label: "Gửi kết quả đã duyệt", actor: "Hội đồng" },
  { key: "dispatch", label: "Phân phối kết quả", actor: "VP / Ban CL" },
  { key: "sign", label: "Trình ký phiếu ĐG", actor: "CQĐV/CQ" },
  { key: "done", label: "Đã phê duyệt", actor: "CQĐV/CQ" },
  { key: "custom", label: "Bước bổ sung", actor: "Theo cấu hình" },
];
export const MAIN_STEPS = [
  { key: "self", label: "Chờ tự đánh giá", actor: "CQĐV/CQ" },
  { key: "office", label: "Đang tổng hợp", actor: "VP / Ban CL" },
  { key: "cqtt", label: "CQTT đang đánh giá", actor: "CQTT" },
  { key: "council", label: "Hội đồng đánh giá", actor: "Hội đồng" },
  { key: "ceo", label: "Chờ TGĐ phê duyệt", actor: "TGĐ" },
  { key: "approved", label: "Đã phê duyệt", actor: "Hội đồng → VP/Ban CL → CQĐV/CQ" },
] as const;
export type MainStage = (typeof MAIN_STEPS)[number]["key"];
const MAIN_OF_STAGE: Record<StageKey, MainStage> = { self: "self", office: "office", cqtt: "cqtt", council: "council", ceo: "ceo", dispatch: "approved", sign: "approved" };
/** Nhóm trạng thái chính của hồ sơ; bước tùy chỉnh thuộc nhóm của bước đặt trước nó. */
export function mainStageOf(e: Evaluation): MainStage {
  if (e.step !== "custom") return mainStage(e.step);
  return MAIN_OF_STAGE[customStageOf(e.block, e.customStageId)?.after ?? "council"];
}
/** Vai trò xử lý hồ sơ ở bước hiện tại (bước tùy chỉnh lấy theo cấu hình). */
export const roleOf = (e: Evaluation): PreviewRole =>
  e.step === "custom" ? (customStageOf(e.block, e.customStageId)?.role ?? "council") : stageRole[e.step];
/** Nhãn trạng thái hiển thị (bước tùy chỉnh dùng tên bước). */
export const statusLabelOf = (e: Evaluation) =>
  e.step === "custom" ? (customStageOf(e.block, e.customStageId)?.name ?? "Bước bổ sung") : STATUS[e.step].label;
export function mainStage(step: Step): MainStage {
  if (step === "custom") return "council";
  if (step === "response" || step === "cqtt_report") return "cqtt";
  if (step === "council_adjust") return "council";
  if (["approved", "dispatch", "sign", "done"].includes(step)) return "approved";
  return step as MainStage;
}
export type StatusTone =
  "pending" | "info" | "review" | "council" | "warning" | "danger" | "success" | "muted";
const statusTones: Record<Step, StatusTone> = {
  self: "pending",
  office: "info",
  cqtt: "review",
  response: "warning",
  cqtt_report: "review",
  council: "council",
  council_adjust: "warning",
  ceo: "danger",
  approved: "success",
  dispatch: "success",
  sign: "success",
  done: "success",
  custom: "review",
};
export const STATUS = Object.fromEntries(
  STEPS.map((s) => [s.key, { label: s.label, tone: statusTones[s.key] }]),
) as Record<Step, { label: string; tone: StatusTone }>;
export type Criterion = {
  group: "A" | "B-I" | "B-II";
  goal: string;
  kpi: string;
  unit: string;
  method?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  weight: number;
  target: { t: string; b: string; s: string };
  result: string;
  self: number;
  council?: number | undefined;
  /** QLTT (CQTT) đánh giá từng công việc, thang 1–5. */
  cqtt?: number | undefined;
};
export type HistoryEntry = {
  actorName?: string;
  actorId?: string;
  at: string;
  role: PreviewRole;
  action: string;
  note: string;
  before: string;
  after: string;
};
export type Evaluation = {
  id: string;
  unit: string;
  block: "Khối Cơ quan" | "Khối Đơn vị";
  period: string;
  owner: string;
  step: Step;
  deadline: string;
  evaluationDate?: string;
  updated: string;
  criteria: Criterion[];
  history?: HistoryEntry[];
  employeeId?: string;
  jobTitle?: string;
  location?: string;
  assignmentRef?: string;
  selfSubmittedAt?: string;
  officeBatchId?: string;
  cqttKey?: number | undefined;
  cqttFunction?: number | undefined;
  /** CQTT đã tổng hợp điểm nhóm từ chi tiết đánh giá từng công việc. */
  cqttSummarized?: boolean | undefined;
  cqttAdjustmentPercent?: number | undefined;
  proposedKi?: Ki | undefined;
  reviewAssistant?: string;
  reviewRemark?: string;
  councilSummaryCreated?: boolean;
  councilReviewed?: boolean;
  councilTaskScored?: boolean;
  councilScore?: number | undefined;
  ki?: Ki | undefined;
  note?: string;
  response?: "Tiếp thu" | "Bảo lưu";
  responseNote?: string;
  /** Dữ liệu cá nhân tại thời điểm CQTT gửi điều chỉnh — dùng để giữ nguyên khi CQ/CQĐV bảo lưu. */
  responseBaseline?: Criterion[] | undefined;
  locationCompliance?: string;
  laborCompliance?: string;
  cultureCompliance?: string;
  /** Bước tùy chỉnh hiện tại (khi step = "custom"). */
  customStageId?: string | undefined;
  /** Bước cố định đặt trước bước tùy chỉnh — để đi tiếp nếu bước tùy chỉnh bị xóa khỏi cấu hình. */
  customAfter?: StageKey | undefined;
  /** Thời điểm hồ sơ vào bước hiện tại (ISO) — dùng tính hạn xử lý. */
  stageEnteredAt?: string;
  /** TGĐ đã điều chỉnh trực tiếp điểm/Ki của Hội đồng trước khi phê duyệt. */
  ceoAdjusted?: boolean;
  approvedScore?: number | undefined;
  approvedKi?: Ki | undefined;
  submittedForSignatureAt?: string;
};
export type Draft = { /** Bước đích người xử lý chọn khi trả về (không lưu vào hồ sơ). */ returnStage?: StageKey } & Partial<
  Pick<
    Evaluation,
    | "criteria"
    | "cqttKey"
    | "cqttFunction"
    | "cqttAdjustmentPercent"
    | "proposedKi"
    | "reviewAssistant"
    | "reviewRemark"
    | "councilScore"
    | "ki"
    | "note"
    | "response"
    | "responseNote"
    | "locationCompliance"
    | "laborCompliance"
    | "cultureCompliance"
  >
>;
export type Action =
  "submit" | "send" | "return" | "request" | "respond" | "finish" | "approve" | "sign";
export const stageRole: Record<Step, PreviewRole> = {
  self: "performer",
  office: "office",
  cqtt: "cqtt",
  response: "performer",
  cqtt_report: "cqtt",
  council: "council",
  ceo: "ceo",
  council_adjust: "council",
  approved: "council",
  dispatch: "office",
  sign: "performer",
  done: "performer",
  custom: "council",
};
export const selfEditable = (e: Evaluation, role: PreviewRole) =>
  role === "performer" && e.step === "self";
export const totalScore = (items: Criterion[]) =>
  Math.round(items.reduce((n, c) => n + c.weight * c.self, 0) * 100) / 100;
export const groupScore = (e: Evaluation, key: boolean) =>
  totalScore(e.criteria.filter((c) => (c.group === "A") === key));
/** Điểm nhóm CQTT tính từ điểm chấm từng công việc; null khi chưa chấm đủ. */
export const cqttScoredCount = (items: Criterion[]) => items.filter((c) => c.cqtt !== undefined).length;
export function cqttGroupsFromTasks(items: Criterion[]): { cqttKey: number; cqttFunction: number } | null {
  if (!items.length || cqttScoredCount(items) !== items.length) return null;
  const sum = (key: boolean) =>
    Math.round(items.filter((c) => (c.group === "A") === key).reduce((n, c) => n + c.weight * c.cqtt!, 0) * 100) / 100;
  return { cqttKey: sum(true), cqttFunction: sum(false) };
}
export const cqttTaskTotal = (items: Criterion[]) =>
  Math.round(items.reduce((n, c) => n + c.weight * (c.cqtt ?? 0), 0) * 100) / 100;
/**
 * Điểm "CQTT đánh giá (phân bổ)" cho từng công việc: lấy trực tiếp điểm CQTT đã chấm từng công việc;
 * hồ sơ cũ chỉ có điểm nhóm thì phân bổ theo tỷ lệ điểm tự đánh giá.
 */
export function cqttTaskScores(criteria: Criterion[], total: number | null): (number | null)[] | null {
  if (criteria.length && criteria.every((c) => c.cqtt !== undefined)) return criteria.map((c) => c.cqtt!);
  if (total === null) return null;
  try { return allocateCouncilScores(criteria, total).map((c) => c.council ?? null); } catch { return null; }
}
export const cqttTotal = (e: Evaluation) =>
  e.cqttKey === undefined || e.cqttFunction === undefined
    ? null
    : Math.round((e.cqttKey + e.cqttFunction) * 100) / 100;
// decimals: bước phản hồi nhận điểm CQTT phân bổ (số lẻ) điền ngược vào cột tự đánh giá.
export const scoresComplete = (items: Criterion[], decimals = false) =>
  items.length > 0 &&
  items.every((c) => (decimals ? Number.isFinite(c.self) : Number.isInteger(c.self)) && c.self >= 1 && c.self <= 5);
export function rating(score: number) {
  if (score >= 4.5) return { ki: "A+" as Ki, label: "Vượt xa yêu cầu" };
  if (score >= 3.5) return { ki: "A" as Ki, label: "Vượt yêu cầu" };
  if (score >= 2.5) return { ki: "B" as Ki, label: "Đạt yêu cầu" };
  if (score >= 2) return { ki: "C" as Ki, label: "Gần đạt yêu cầu" };
  return { ki: "D" as Ki, label: "Không đạt yêu cầu" };
}
export function kiError(e: Evaluation): string {
  if (e.councilScore === undefined) return e.ki === "K" ? "" : "Không đánh giá phải xếp Ki K.";
  if (e.ki === "K") return "Có điểm đánh giá phải xếp Ki khác K.";
  if (!e.ki) return "Vui lòng chọn Ki.";
  if (
    (e.locationCompliance === "Không tuân thủ" ||
      e.laborCompliance === "Bị xử lý kỷ luật lao động" ||
      e.councilScore < 2) &&
    e.ki !== "D"
  )
    return "Điều kiện đánh giá/tuân thủ yêu cầu Ki D.";
  if (
    e.laborCompliance === "Vi phạm nhưng chưa đến mức bị xử lý kỷ luật" &&
    ["A+", "A"].includes(e.ki)
  )
    return "Vi phạm nội quy: Ki tối đa B.";
  if (e.councilScore < 2.5 && ["A+", "A"].includes(e.ki)) return "Gần đạt yêu cầu: Ki tối đa B.";
  if (e.councilScore < 3.5 && e.ki === "A+") return "Đạt yêu cầu chưa đủ điều kiện Ki A+.";
  return "";
}
/** Keep self-score ratios until a goal reaches the 1–5 bounds; solve the weighted total. */
export function allocateCouncilScores(
  criteria: Criterion[],
  target: number | undefined,
): Criterion[] {
  if (target === undefined) return criteria.map((c) => ({ ...c, council: undefined }));
  if (!Number.isFinite(target) || target < 1 || target > 5)
    throw new Error("Tổng điểm phân bổ phải từ 1–5.");
  const weight = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (
    !criteria.length ||
    !Number.isFinite(weight) ||
    Math.abs(weight - 1) > 1e-8 ||
    criteria.some(
      (c) =>
        !Number.isFinite(c.weight) ||
        c.weight < 0 ||
        !Number.isFinite(c.self) ||
        c.self < 1 ||
        c.self > 5,
    )
  ) {
    throw new Error("Cần đủ điểm tự đánh giá 1–5 và tổng tỷ trọng 100% để phân bổ.");
  }
  const score = (c: Criterion, factor: number) => Math.max(1, Math.min(5, c.self * factor));
  let low = 0,
    high = 5;
  for (let iteration = 0; iteration < 80; iteration++) {
    const factor = (low + high) / 2;
    const total = criteria.reduce((sum, c) => sum + (c.weight / weight) * score(c, factor), 0);
    if (total < target) low = factor;
    else high = factor;
  }
  const factor = (low + high) / 2;
  return criteria.map((c) => ({
    ...c,
    council: target === 1 || target === 5 ? target : score(c, factor),
  }));
}
export function allocatedTotal(criteria: Criterion[]): number | null {
  if (!criteria.length || criteria.some((c) => c.council === undefined)) return null;
  return Math.round(criteria.reduce((sum, c) => sum + c.weight * c.council!, 0) * 100) / 100;
}
export function templateResult(e: Evaluation) {
  const unreviewed = e.step === "council" && !e.councilReviewed;
  const score = unreviewed ? undefined : e.approvedScore ?? e.councilScore,
    ki = unreviewed ? undefined : e.approvedKi ?? e.ki;
  const completion =
    ki === "K"
      ? "Không đánh giá"
      : !ki
        ? "Chưa xếp Ki"
        : ki === "D" &&
            ((score ?? 0) < 2.5 ||
              e.locationCompliance === "Không tuân thủ" ||
              e.laborCompliance !== "Tuân thủ")
          ? "Không hoàn thành NV/CV"
          : "Hoàn thành NV/CV";
  return {
    score: score ?? null,
    ki: ki ?? "—",
    rating:
      score === undefined ? (ki === "K" ? "Không đánh giá" : "Chưa đánh giá") : rating(score).label,
    completion,
  };
}
function record(
  e: Evaluation,
  next: Evaluation,
  role: PreviewRole,
  action: string,
  note: string,
  at: string,
): Evaluation {
  const snapshot = (x: Evaluation) =>
    JSON.stringify({
      step: x.step,
      cqttKey: x.cqttKey,
      cqttFunction: x.cqttFunction,
      cqtt: cqttTotal(x),
      council: x.councilScore,
      proposedKi: x.proposedKi,
      cqttAdjustmentPercent: x.cqttAdjustmentPercent,
      reviewAssistant: x.reviewAssistant,
      reviewRemark: x.reviewRemark,
      ki: x.ki,
      location: x.locationCompliance,
      labor: x.laborCompliance,
      culture: x.cultureCompliance,
      response: x.response,
      responseNote: x.responseNote,
      criteria: x.criteria,
    });
  const enteredNewStage =
    stageOf(next.step) !== stageOf(e.step) ||
    next.customStageId !== e.customStageId ||
    (next.step !== e.step && ["response", "council_adjust", "custom"].includes(next.step));
  return {
    ...next,
    updated: at,
    ...(enteredNewStage ? { stageEnteredAt: new Date().toISOString() } : {}),
    history: [
      ...(e.history ?? []),
      { at, role, action, note, before: snapshot(e), after: snapshot(next) },
    ],
  };
}
/** CQTT tổng hợp: điểm nhóm Thường trực đánh giá lấy từ chi tiết đánh giá từng công việc. */
export const cqttTasksComplete = (e: Evaluation) => cqttGroupsFromTasks(e.criteria) !== null;
/** Có thể tổng hợp: đủ điểm từng công việc, hoặc hồ sơ cũ đã có điểm nhóm CQTT. */
export const cqttSummarizable = (e: Evaluation) => cqttTasksComplete(e) || cqttTotal(e) !== null;
/** Tab Tổng hợp đánh giá của CQTT chỉ có dữ liệu sau khi bấm Tổng hợp đánh giá. */
export const cqttInSummary = (e: Evaluation) => !["cqtt", "cqtt_report"].includes(e.step) || !!e.cqttSummarized;
export function summarizeCqtt(e: Evaluation, role: PreviewRole, at: string): Evaluation {
  if (role !== "cqtt" || !["cqtt", "cqtt_report"].includes(e.step)) throw new Error("Chỉ CQTT tổng hợp hồ sơ đang rà soát.");
  const fromTasks = cqttGroupsFromTasks(e.criteria);
  const groups = fromTasks ?? (cqttTotal(e) !== null ? { cqttKey: e.cqttKey!, cqttFunction: e.cqttFunction! } : null);
  if (!groups) throw new Error(`${e.id}: chưa đánh giá đủ từng công việc.`);
  const next = { ...e, ...groups, cqttSummarized: true };
  return record(e, next, role, "Tổng hợp đánh giá", "Tổng hợp từ chi tiết đánh giá từng công việc", at);
}
export function saveDraft(e: Evaluation, role: PreviewRole, draft: Draft, at: string): Evaluation {
  const { returnStage: _returnStage, ...patch } = draft;
  if (
    roleOf(e) !== role ||
    ["approved", "dispatch", "sign", "done"].includes(e.step)
  )
    throw new Error("Vai trò hoặc trạng thái không cho phép sửa hồ sơ.");
  let next = { ...e };
  const allowed =
    role === "office" && e.step === "office"
      ? ["reviewAssistant", "reviewRemark"]
      : selfEditable(e, role)
        ? ["criteria"]
        : role === "cqtt" && e.step === "cqtt"
          ? ["criteria", "cqttKey", "cqttFunction", "cqttAdjustmentPercent", "note", "proposedKi", "reviewAssistant", "reviewRemark", "locationCompliance", "laborCompliance", "cultureCompliance"]
          : role === "cqtt" && e.step === "cqtt_report"
            ? ["note"]
          : role === "council"
            ? [
                "criteria",
                "councilScore",
                "ki",
                "locationCompliance",
                "laborCompliance",
                "cultureCompliance",
                "note",
              ]
            : role === "ceo" && e.step === "ceo"
              ? branches(e.block).ceoDirectAdjust
                ? ["councilScore", "ki", "locationCompliance", "laborCompliance", "cultureCompliance"]
                : ["locationCompliance", "laborCompliance", "cultureCompliance"]
            : role === "performer" && e.step === "response"
              ? ["response", "responseNote", "criteria"]
              : [];
  if (Object.keys(patch).some((k) => !allowed.includes(k)))
    throw new Error("Không được sửa trường dữ liệu ở bước này.");
  if (role === "council" && e.councilTaskScored && "councilScore" in patch && patch.councilScore !== e.councilScore)
    throw new Error("Điểm đánh giá được tổng hợp từ chi tiết công việc. Vui lòng sửa điểm tại chi tiết công việc.");
  if (patch.criteria && e.step === "response") {
    // Tiếp thu: cá nhân được cập nhật lại toàn bộ dữ liệu đã chấm (nhiệm vụ, tỷ trọng, kết quả, điểm).
    if (!patch.criteria.length) throw new Error("Phiếu phải có ít nhất một nhiệm vụ.");
    if (patch.criteria.some((c) => !Number.isFinite(c.self) || c.self < 0 || c.self > 5))
      throw new Error("Điểm tự đánh giá từ 1–5.");
    next.criteria = patch.criteria.map((c) => ({ ...c, target: { ...c.target }, council: undefined }));
  } else if (patch.criteria && role === "council") {
    if (patch.criteria.length !== e.criteria.length) throw new Error("Không được thay đổi mục tiêu gốc.");
    next.criteria = e.criteria.map((c, i) => {
      const value = patch.criteria![i]!.council;
      if (value !== undefined && (!Number.isFinite(value) || value < 1 || value > 5))
        throw new Error("Điểm Hội đồng từng công việc phải từ 1 đến 5.");
      return { ...c, council: value };
    });
    next.councilTaskScored = true;
    if (next.criteria.some((c, i) => c.council !== e.criteria[i]!.council)) next.councilSummaryCreated = false;
  } else if (patch.criteria && role === "cqtt") {
    // CQTT đánh giá từng công việc (cột QLTT đánh giá): chỉ ghi điểm CQTT, không sửa dữ liệu cá nhân.
    if (patch.criteria.length !== e.criteria.length)
      throw new Error("Không được thay đổi mục tiêu gốc.");
    next.criteria = e.criteria.map((c, i) => {
      const incoming = patch.criteria![i]!;
      if (incoming.cqtt !== undefined && (!Number.isFinite(incoming.cqtt) || incoming.cqtt < 1 || incoming.cqtt > 5))
        throw new Error("Điểm QLTT đánh giá từng công việc phải từ 1 đến 5.");
      return { ...c, cqtt: incoming.cqtt };
    });
    // Sửa điểm chi tiết sau khi đã tổng hợp thì cần tổng hợp lại.
    if (next.criteria.some((c, i) => c.cqtt !== e.criteria[i]!.cqtt)) next.cqttSummarized = false;
  } else if (patch.criteria) {
    if (patch.criteria.length !== e.criteria.length)
      throw new Error("Không được thay đổi mục tiêu gốc.");
    next.criteria = e.criteria.map((c, i) => {
      const incoming = patch.criteria![i]!;
      if (!Number.isInteger(incoming.self) || incoming.self < 0 || incoming.self > 5)
        throw new Error("Điểm tự đánh giá từ 1–5.");
      return { ...c, self: incoming.self, result: incoming.result };
    });
  }
  const { criteria: ignored, ...fields } = patch;
  next = { ...next, ...fields };
  // Điểm nhóm CQTT chỉ cập nhật khi CQTT bấm Tổng hợp đánh giá (summarizeCqtt) hoặc chuyển bước.
  for (const key of ["cqttKey", "cqttFunction", "councilScore"] as const) {
    const value = next[key];
    if (
      value !== undefined &&
      (!Number.isFinite(value) || value < (key === "councilScore" ? 1 : 0) || value > 5)
    )
      throw new Error("Điểm đánh giá không hợp lệ (1–5; điểm nhóm 0–5).");
  }
  if (next.proposedKi !== undefined && !["A+", "A", "B", "C", "D", "K"].includes(next.proposedKi))
    throw new Error("Đề xuất Ki không hợp lệ.");
  if (cqttTotal(next) !== null && cqttTotal(next)! > 5)
    throw new Error("Tổng điểm CQTT không được vượt 5.");
  if (role === "cqtt") {
    const score = cqttTotal(next);
    if (score !== null && next.proposedKi) { cqttScoreForKi(next, next.proposedKi, score); const issue = kiError({ ...next, councilScore: score, ki: next.proposedKi }); if (issue) throw new Error(issue); }
  }
  if (role === "cqtt")
    for (const key of [true, false]) {
      const value = key ? next.cqttKey : next.cqttFunction;
      const max = e.criteria
        .filter((c) => (c.group === "A") === key)
        .reduce((s, c) => s + c.weight * 5, 0);
      if (value !== undefined && value > max + 0.00001)
        throw new Error("Điểm nhóm vượt tỷ trọng đã giao.");
    }
  if (role === "council") {
    if (patch.criteria) {
      const complete = next.criteria.length > 0 && next.criteria.every(c => c.council !== undefined);
      next.councilScore = complete ? allocatedTotal(next.criteria)! : undefined;
      next.ki = complete ? councilAutoKi(next) : undefined;
      next.councilReviewed = !!e.councilReviewed && complete && !next.criteria.some((c, i) => c.council !== e.criteria[i]!.council);
    } else {
      if (!next.councilTaskScored || next.councilScore !== e.councilScore) {
        next.criteria = allocateCouncilScores(next.criteria, next.councilScore);
        next.councilTaskScored = false;
      }
      next.councilReviewed = !!e.councilReviewed && !!next.ki;
    }
    const complianceChanged = (["locationCompliance", "laborCompliance", "cultureCompliance"] as const)
      .some(key => key in patch && next[key] !== e[key]);
    if (complianceChanged) {
      next.ki = councilAutoKi(next);
      if (next.councilTaskScored) {
        next.councilReviewed = false;
        next.councilSummaryCreated = false;
      }
    }
  }
  if (role === "ceo") {
    // TGĐ điều chỉnh trực tiếp: kiểm tra điều kiện Ki và phân bổ lại điểm xuống từng mục tiêu.
    const issue = kiError(next);
    if (issue) throw new Error(issue);
    next.criteria = allocateCouncilScores(next.criteria, next.councilScore);
    if (next.councilScore !== e.councilScore || next.ki !== e.ki) next.ceoAdjusted = true;
  }
  if (role === "ceo") {
    const changes = [
      next.councilScore !== e.councilScore && `Điểm ${e.councilScore?.toFixed(2) ?? "—"} → ${next.councilScore?.toFixed(2) ?? "—"}`,
      next.ki !== e.ki && `Ki ${e.ki ?? "—"} → ${next.ki ?? "—"}`,
    ].filter(Boolean).join("; ");
    if (!changes) return record(e, next, role, "TGĐ đánh giá tuân thủ", "", at);
    return record(e, next, role, "TGĐ điều chỉnh trực tiếp", changes, at);
  }
  return record(e, next, role, "Lưu nháp", patch.note ?? patch.responseNote ?? "", at);
}
/**
 * Đưa hồ sơ vào bước `key` theo cấu hình luồng duyệt, khởi tạo dữ liệu còn thiếu khi bỏ qua bước
 * (vd. tắt CQTT → Hội đồng kế thừa điểm tự đánh giá; tắt TGĐ → kết quả Hội đồng là kết quả phê duyệt).
 */
export function enterStage(e: Evaluation, key: StageKey): Evaluation {
  const withScore = (x: Evaluation): Evaluation => {
    if (x.councilScore !== undefined && x.ki) return x;
    const score = cqttTotal(x) ?? Math.round(totalScore(x.criteria) * 100) / 100;
    return { ...x, councilScore: score, ki: rating(score).ki, criteria: allocateCouncilScores(x.criteria, score) };
  };
  const approved = (x: Evaluation): Evaluation =>
    x.approvedScore !== undefined ? x : { ...x, approvedScore: x.councilScore, approvedKi: x.ki };
  switch (key) {
    case "office":
      return { ...e, step: "office" };
    case "cqtt":
      return { ...e, step: "cqtt", note: "" };
    case "council": {
      const score = cqttTotal(e) ?? Math.round(totalScore(e.criteria) * 100) / 100;
      return { ...e, step: "council", councilScore: score, ki: rating(score).ki, criteria: allocateCouncilScores(e.criteria, score) };
    }
    case "ceo":
      return { ...withScore(e), step: "ceo" };
    case "dispatch":
      return { ...approved(withScore(e)), step: "approved" };
    case "sign":
      return { ...approved(withScore(e)), step: "sign" };
    default:
      return { ...e, step: "self" };
  }
}
/** Trả hồ sơ từ bước `from` về bước đích đã cấu hình, bắt buộc lý do; dữ liệu đã chấm được giữ để tham chiếu. */
/** Chuyển hồ sơ sang bước bật kế tiếp sau nút `from` theo cấu hình (có thể là bước tùy chỉnh). */
export function advance(e: Evaluation, from: FlowNode): Evaluation {
  const anchor = from.kind === "custom" ? e.customAfter : from.key;
  const node = nextNode(e.block, from, anchor);
  const base: Evaluation = { ...e, customStageId: undefined, customAfter: undefined };
  if (node.kind === "fixed") return enterStage(base, node.key);
  const cs = customStageOf(e.block, node.id)!;
  return { ...base, step: "custom", customStageId: node.id, customAfter: cs.after, note: "" };
}
function returnTo(e: Evaluation, role: PreviewRole, from: StageKey | "custom", chosen: StageKey | undefined, reason: string, at: string): Evaluation {
  const allowed = from === "custom" ? (customStageOf(e.block, e.customStageId)?.returnTo ?? []) : returnTargets(e.block, from);
  const target = chosen ? (allowed.includes(chosen) ? chosen : null) : (allowed[0] ?? null);
  if (!target) throw new Error("Luồng duyệt của khối không cho phép trả về ở bước này.");
  if (!reason) throw new Error("Vui lòng nhập lý do trả về.");
  const step: Step = target === "self" ? "self" : target === "office" ? "office" : target === "cqtt" ? "cqtt" : "council_adjust";
  const { response: _r, responseNote: _n, responseBaseline: _b, ...rest } = e;
  const next: Evaluation = { ...rest, step, customStageId: undefined, customAfter: undefined, note: reason, ...(target === "self" || target === "office" ? { councilSummaryCreated: false } : {}) };
  return record(e, next, role, `Trả về ${handlerFor(e.block, target)}`, reason, at);
}
export function transition(
  e: Evaluation,
  role: PreviewRole,
  action: Action,
  patch: Draft,
  at: string,
): Evaluation {
  if (roleOf(e) !== role) throw new Error("Vai trò không được thực hiện bước này.");
  const reason = (patch.note ?? e.note ?? "").trim();
  const requireReason = () => {
    if (!reason) throw new Error("Vui lòng nhập lý do yêu cầu điều chỉnh.");
  };
  let next = e;
  if (e.step === "self") {
    if (action !== "submit") throw new Error("Thao tác không hợp lệ.");
    if (patch.criteria) next = saveDraft(e, role, { criteria: patch.criteria }, at);
    if (
      !scoresComplete(next.criteria) ||
      Math.abs(next.criteria.reduce((s, c) => s + c.weight, 0) - 1) > 0.00001 ||
      next.criteria.some((c) => !c.result.trim())
    )
      throw new Error("Nhập đủ kết quả, điểm 1–5 và tổng tỷ trọng 100%.");
    next = { ...advance(next, { kind: "fixed", key: "self" }), selfSubmittedAt: at };
  } else if (e.step === "office") {
    if (action === "send") next = advance(e, { kind: "fixed", key: "office" });
    else if (action === "return") return returnTo(e, role, "office", patch.returnStage, reason, at);
    else throw new Error("Thao tác không hợp lệ.");
  } else if (e.step === "cqtt" || (e.step === "cqtt_report" && action === "request")) {
    // Gửi điều chỉnh được thực hiện ở màn Tổng hợp đánh giá, kể cả phiếu đã Hoàn tất đánh giá.
    if (!["request", "finish"].includes(action)) throw new Error("Thao tác không hợp lệ.");
    // Hoàn tất đánh giá: đủ điểm từng công việc (tổng hợp sau) hoặc đã có điểm nhóm CQTT.
    if (cqttTotal(e) === null && !(action === "finish" && cqttTasksComplete(e)))
      throw new Error("Nhập đủ điểm QLTT đánh giá (1-5) cho tất cả công việc trước khi chuyển bước.");
    const cqttTarget = resolveReturn(e.block, "cqtt", patch.returnStage);
    if (action === "request" && !cqttTarget)
      throw new Error("Luồng duyệt của khối không cho phép CQTT trả về.");
    if (action === "request") requireReason();
    if (action === "request" && cqttTarget !== "self") return returnTo(e, role, "cqtt", cqttTarget!, reason, at);
    next =
      action === "request"
        ? (({ response: _response, responseNote: _responseNote, ...rest }) => ({
            ...rest,
            step: "response" as const,
            note: reason,
            responseBaseline: e.criteria.map((c) => ({ ...c, target: { ...c.target } })),
          }))(e)
        : { ...e, step: "cqtt_report", note: reason };
  } else if (e.step === "response" && action === "respond") {
    next = saveDraft(e, role, patch, at);
    if (next.response === "Bảo lưu") {
      // Bảo lưu: CQTT ghi nhận, giữ nguyên dữ liệu cá nhân và điểm CQTT → Tổng hợp báo cáo.
      if (!next.responseNote?.trim()) throw new Error("Vui lòng nhập lý do bảo lưu.");
      next = {
        ...next,
        criteria: e.responseBaseline ?? e.criteria,
        responseBaseline: undefined,
        step: "cqtt_report",
      };
    } else if (next.response === "Tiếp thu") {
      // Tiếp thu: cá nhân cập nhật lại dữ liệu và gửi CQTT rà soát, chấm điểm lại.
      if (
        !scoresComplete(next.criteria, true) ||
        Math.abs(next.criteria.reduce((s, c) => s + c.weight, 0) - 1) > 0.00001 ||
        next.criteria.some((c) => !c.result.trim())
      )
        throw new Error("Nhập đủ kết quả, điểm 1–5 và tổng tỷ trọng 100% trước khi gửi lại CQTT.");
      next = { ...next, responseBaseline: undefined, step: "cqtt" };
    } else throw new Error("Chọn Tiếp thu hoặc Bảo lưu.");
    return record(
      e,
      next,
      role,
      next.response === "Bảo lưu" ? "Bảo lưu" : "Tiếp thu",
      next.responseNote?.trim() ?? "",
      at,
    );
  } else if (e.step === "cqtt_report" && action === "send") {
    const score = cqttTotal(e);
    if (score === null) throw new Error("Chưa tổng hợp đánh giá CQTT.");
    if (score < 1 || score > 5) throw new Error("Điểm CQTT phải từ 1–5.");
    next = advance(e, { kind: "fixed", key: "cqtt" });
  } else if (["council", "council_adjust"].includes(e.step) && action === "return") {
    return returnTo(e, role, "council", patch.returnStage, reason, at);
  } else if (["council", "council_adjust"].includes(e.step) && action === "finish") {
    if (!e.criteria.length || e.criteria.some(c => c.council === undefined || !Number.isFinite(c.council) || c.council < 1 || c.council > 5))
      throw new Error("Nhập đủ điểm QLTT đánh giá từ 1 đến 5 cho từng công việc trước khi hoàn tất.");
    if (kiError(e)) throw new Error(kiError(e));
    return record(e, { ...e, councilReviewed: true }, role, "Hoàn tất đánh giá", "Chờ tổng hợp KI từ danh sách Hội đồng đã đánh giá.", at);
  } else if (["council", "council_adjust"].includes(e.step) && action === "submit") {
    if (e.councilTaskScored && (!e.councilReviewed || !e.councilSummaryCreated)) throw new Error("Hãy hoàn tất đánh giá và tổng hợp KI từ danh sách Hội đồng đã đánh giá trước khi trình TGĐ.");
    if (kiError(e)) throw new Error(kiError(e));
    if (!e.locationCompliance || !e.laborCompliance)
      throw new Error("Vui lòng xác nhận đánh giá tuân thủ.");
    next = advance({ ...e, councilReviewed: true, criteria: e.councilTaskScored ? e.criteria : allocateCouncilScores(e.criteria, e.councilScore) }, { kind: "fixed", key: "council" });
  } else if (e.step === "ceo") {
    if (action === "return") {
      const ceoTarget = resolveReturn(e.block, "ceo", patch.returnStage);
      if (!ceoTarget) throw new Error("Luồng duyệt của khối không cho phép TGĐ trả về.");
      if (ceoTarget !== "council") return returnTo(e, role, "ceo", ceoTarget, reason, at);
      requireReason();
      next = { ...e, step: "council_adjust", note: reason };
    } else if (action === "approve") {
      if (kiError(e)) throw new Error(kiError(e));
      next = advance({ ...e, approvedScore: e.councilScore, approvedKi: e.ki }, { kind: "fixed", key: "ceo" });
    } else throw new Error("Thao tác không hợp lệ.");
  } else if (e.step === "approved" && action === "send") next = { ...e, step: "dispatch" };
  else if (e.step === "dispatch" && action === "send") next = advance(e, { kind: "fixed", key: "dispatch" });
  else if (e.step === "custom" && action === "send") {
    const cs = customStageOf(e.block, e.customStageId);
    next = advance(e, { kind: "custom", id: e.customStageId ?? "" });
    return record(e, next, role, `Duyệt — ${cs?.name ?? "Bước bổ sung"}`, (patch.note ?? "").trim(), at);
  } else if (e.step === "custom" && action === "return") return returnTo(e, role, "custom", patch.returnStage, reason, at);
  else if (e.step === "sign" && action === "sign")
    next = { ...e, step: "done", submittedForSignatureAt: at };
  else throw new Error("Thao tác không hợp lệ ở trạng thái hiện tại.");
  // CQTT gửi điều chỉnh: lịch sử ghi đích danh cá nhân đánh giá nhận yêu cầu.
  if (action === "request" && next.step === "response")
    return record(e, next, role, "Gửi điều chỉnh cho CQĐV/CQ", `Gửi đến: ${e.owner}${e.employeeId ? ` (${e.employeeId})` : ""} · ${e.unit} — Lý do: ${reason}`, at);
  return record(e, next, role, action, patch.responseNote ?? reason, at);
}
export function forwardOfficeBatch(
  evaluations: Evaluation[],
  role: PreviewRole,
  ids: string[],
  drafts: Record<string, Draft>,
  at: string,
): Evaluation[] {
  if (role !== "office") throw new Error("Chỉ Văn phòng/Ban Chiến lược được gửi tổng hợp.");
  const selectedIds = new Set(ids);
  if (!selectedIds.size) throw new Error("Không có phiếu đang tổng hợp để gửi CQTT.");
  const selected = evaluations.filter((e) => selectedIds.has(e.id));
  if (selected.length !== selectedIds.size || selected.some((e) => e.step !== "office"))
    throw new Error("Danh sách đã thay đổi. Chỉ gửi các phiếu đang tổng hợp.");
  const scope = selected[0]!;
  if (selected.some((e) => e.period !== scope.period))
    throw new Error("Mỗi lần gửi phải cùng kỳ đánh giá.");
  const forwarded = new Map(
    selected.map((e) => {
      const draft = drafts[e.id];
      const saved = draft && Object.keys(draft).length ? saveDraft(e, role, draft, at) : e;
      return [e.id, { ...transition(saved, role, "send", {}, at), officeBatchId: `${e.period}|${e.block}|${at}` }] as const;
    }),
  );
  return evaluations.map((e) => forwarded.get(e.id) ?? e);
}
const base: Criterion[] = [
  {
    group: "A",
    goal: "Triển khai nền tảng vOffice cho 5 đơn vị thành viên",
    kpi: "Số đơn vị go-live",
    unit: "Đơn vị",
    weight: 0.1,
    target: { t: "3", b: "5", s: "6" },
    result: "6 đơn vị",
    self: 5,
  },
  {
    group: "A",
    goal: "Chuyển đổi số quy trình giao nhiệm vụ",
    kpi: "% quy trình số hoá",
    unit: "%",
    weight: 0.1,
    target: { t: "70", b: "85", s: "95" },
    result: "88%",
    self: 5,
  },
  {
    group: "B-I",
    goal: "Đảm bảo SLA hỗ trợ người dùng",
    kpi: "Tỷ lệ ticket đúng SLA",
    unit: "%",
    weight: 0.15,
    target: { t: "90", b: "95", s: "98" },
    result: "96,4%",
    self: 4,
  },
  {
    group: "B-I",
    goal: "Tối ưu chi phí vận hành",
    kpi: "Chi phí giảm so với KH",
    unit: "%",
    weight: 0.15,
    target: { t: "3", b: "5", s: "8" },
    result: "4,1%",
    self: 3,
  },
  {
    group: "B-I",
    goal: "Đào tạo nội bộ",
    kpi: "Giờ đào tạo / CBNV",
    unit: "Giờ",
    weight: 0.15,
    target: { t: "16", b: "24", s: "32" },
    result: "22",
    self: 3,
  },
  {
    group: "B-II",
    goal: "Tuân thủ an toàn thông tin",
    kpi: "Số sự cố ATTT",
    unit: "Sự cố",
    weight: 0.15,
    target: { t: "1", b: "0", s: "0" },
    result: "0",
    self: 4,
  },
  {
    group: "B-II",
    goal: "Kiểm soát tài chính",
    kpi: "Sai lệch quyết toán",
    unit: "%",
    weight: 0.1,
    target: { t: "2", b: "1", s: "0,5" },
    result: "0,9%",
    self: 3,
  },
  {
    group: "B-II",
    goal: "Kiểm soát pháp chế",
    kpi: "Văn bản bị trả lại",
    unit: "Văn bản",
    weight: 0.1,
    target: { t: "3", b: "1", s: "0" },
    result: "1",
    self: 4,
  },
];

const units: [string, Evaluation["block"], Step, string][] = [
  ["Tổng công ty Giải pháp doanh nghiệp Viettel", "Khối Đơn vị", "ceo", "Đinh Ngọc Tuấn"],
  ["Ban Chiến lược Tập đoàn", "Khối Cơ quan", "council", "Phạm Hoàng Giang"],
  ["Trung tâm Công nghệ thông tin", "Khối Đơn vị", "cqtt", "Lê Minh Châu"],
  ["Văn phòng Tập đoàn", "Khối Cơ quan", "self", "Nguyễn Thu Hà"],
  ["Ban Tài chính", "Khối Cơ quan", "office", "Trần Quốc Bảo"],
  ["Tổng công ty Viễn thông Viettel", "Khối Đơn vị", "done", "Vũ Đức Anh"],
  ["Ban Tổ chức lao động", "Khối Cơ quan", "done", "Hoàng Lan Phương"],
  ["Tổng công ty Mạng lưới Viettel", "Khối Đơn vị", "cqtt", "Đỗ Văn Khoa"],
];

export const EVALUATIONS: Evaluation[] = units.map(([unit, block, step, owner], i) => ({
  id: `DG-2026-Q3-${String(i + 1).padStart(3, "0")}`,
  unit,
  block,
  period: "Quý III/2026",
  owner,
  step,
  deadline: `${String(10 + i).padStart(2, "0")}/11/2026`,
  updated: `${String(20 + (i % 9)).padStart(2, "0")}/10/2026 1${i % 6}:0${i}:12`,
  employeeId: String(91599 + i),
  jobTitle: "Chỉ huy cơ quan/đơn vị",
  location: "Hà Nội",
  assignmentRef: `GNV-2026-Q3-${String(i + 1).padStart(3, "0")}`,
  cqttKey: ["self", "office", "cqtt"].includes(step) ? undefined : 0.9,
  cqttFunction: ["self", "office", "cqtt"].includes(step) ? undefined : 3.2,
  councilScore: ["council", "ceo", "done"].includes(step) ? 4.1 : undefined,
  ki: ["council", "ceo", "done"].includes(step) ? "A" : undefined,
  locationCompliance: "Tuân thủ",
  laborCompliance: "Tuân thủ",
  cultureCompliance: "Tuân thủ",
  approvedScore: step === "done" ? 4.1 : undefined,
  approvedKi: step === "done" ? "A" : undefined,
  history: [],
  criteria: allocateCouncilScores(
    base.map((c, j) => ({
      ...c,
      // Sample task dates for the Q3 mockup, not live task-screen data.
      startDate: `2026-07-${String(1 + j * 2).padStart(2, "0")}`,
      endDate: `2026-09-${String(20 + j).padStart(2, "0")}`,
      self: Math.max(1, Math.min(5, c.self - ((i + j) % 3 === 0 ? 1 : 0))),
    })),
    ["council", "ceo", "done"].includes(step) ? 4.1 : undefined,
  ),
}));

// Hồ sơ mẫu đã được CQTT gửi về để cá nhân tiếp thu/bảo lưu.
EVALUATIONS.push({
  ...EVALUATIONS[3]!,
  id: "DG-2026-Q3-009",
  step: "response",
  assignmentRef: "GNV-2026-Q3-009",
  evaluationDate: "2026-11-01",
  deadline: "20/11/2026",
  updated: "01/11/2026 14:50:00",
  cqttKey: 0.8,
  cqttFunction: 2.5,
  proposedKi: "B",
  note: "Bổ sung số liệu chứng minh kết quả thực hiện và giải trình chênh lệch điểm CQTT so với điểm tự đánh giá.",
  history: [{ at: "01/11/2026 14:50:00", role: "cqtt", action: "request", note: "Bổ sung số liệu chứng minh kết quả thực hiện.", before: JSON.stringify({ step: "cqtt" }), after: JSON.stringify({ step: "response", cqttKey: 0.8, cqttFunction: 2.5 }) }],
});

// Dữ liệu minh họa bổ sung cho hai khối và các bước xử lý.
const extraSamples: [string, string, Evaluation["block"], Step][] = [
  ["Phạm Minh Anh", "Văn phòng Tập đoàn", "Khối Cơ quan", "self"],
  ["Trần Hải Nam", "Tổng công ty Giải pháp doanh nghiệp Viettel", "Khối Đơn vị", "self"],
  ["Nguyễn Thanh Mai", "Ban Tài chính", "Khối Cơ quan", "office"],
  ["Lê Quốc Hưng", "Ban Nhân sự", "Khối Cơ quan", "office"],
  ["Vũ Minh Đức", "Tổng công ty Viễn thông Viettel", "Khối Đơn vị", "office"],
  ["Đặng Thu Trang", "Tổng công ty Mạng lưới Viettel", "Khối Đơn vị", "office"],
  ["Hoàng Anh Tuấn", "Ban Kỹ thuật", "Khối Cơ quan", "cqtt"],
  ["Phan Ngọc Linh", "Trung tâm Công nghệ thông tin", "Khối Đơn vị", "response"],
  ["Ngô Minh Phúc", "Ban Chiến lược", "Khối Cơ quan", "cqtt_report"],
  ["Đỗ Thanh Bình", "Tổng công ty Công nghiệp Công nghệ cao", "Khối Đơn vị", "council"],
  ["Bùi Thu Hương", "Ban Pháp chế", "Khối Cơ quan", "ceo"],
  ["Trịnh Quốc Việt", "Tổng công ty Viễn thông Viettel", "Khối Đơn vị", "council_adjust"],
  ["Dương Khánh An", "Ban Đầu tư", "Khối Cơ quan", "approved"],
  ["Mai Đức Long", "Tổng công ty Mạng lưới Viettel", "Khối Đơn vị", "dispatch"],
  ["Nguyễn Hồng Nhung", "Văn phòng Tập đoàn", "Khối Cơ quan", "sign"],
  ["Trần Việt Hoàng", "Tổng công ty Giải pháp doanh nghiệp Viettel", "Khối Đơn vị", "done"],
];
extraSamples.forEach(([owner, unit, block, step], index) => {
  const sequence = String(index + 10).padStart(3, "0");
  const reviewed = !["self", "office", "cqtt"].includes(step);
  const council = ["council", "ceo", "council_adjust", "approved", "dispatch", "sign", "done"].includes(step);
  const approved = ["approved", "dispatch", "sign", "done"].includes(step);
  const criteria = EVALUATIONS[3]!.criteria.map((c) => ({ ...c, target: { ...c.target } }));
  const note = step === "response" ? "CQTT yêu cầu bổ sung minh chứng và phản hồi về điểm đánh giá." : step === "council_adjust" ? "TGĐ yêu cầu Hội đồng rà soát lại điểm và căn cứ xếp Ki." : "";
  EVALUATIONS.push({
    id: "DG-2026-Q3-" + sequence, owner, unit, block, step,
    period: "Quý III/2026", employeeId: String(92000 + index), jobTitle: "Chỉ huy cơ quan/đơn vị", location: "Hà Nội",
    assignmentRef: "GNV-2026-Q3-" + sequence, evaluationDate: "2026-11-01", deadline: String(20 + index % 9) + "/11/2026", updated: "01/11/2026 14:55:00",
    criteria: allocateCouncilScores(criteria, council ? 4.1 : undefined),
    ...(step !== "self" ? { selfSubmittedAt: "01/11/2026 09:00:00" } : {}),
    ...(!["self", "office"].includes(step) ? { officeBatchId: "Quý III/2026|" + block + "|Mau-bo-sung" } : {}),
    ...(reviewed ? { cqttKey: 0.9, cqttFunction: 3.2, proposedKi: "A" as Ki } : {}),
    ...(council ? { councilScore: 4.1, ki: "A" as Ki } : {}),
    ...(approved ? { approvedScore: 4.1, approvedKi: "A" as Ki } : {}),
    ...(step === "done" ? { submittedForSignatureAt: "01/11/2026 14:00:00" } : {}),
    locationCompliance: "Tuân thủ", laborCompliance: "Tuân thủ", cultureCompliance: "Tuân thủ", note,
    history: [{ at: "01/11/2026 14:55:00", role: stageRole[step], action: "Khởi tạo dữ liệu mẫu", note, before: "{}", after: JSON.stringify({ step }) }],
  });
});

// Tăng số lượng mẫu để thử bảng tổng hợp, tìm kiếm và lọc hai khối.
const summaryUnits = [
  ["Ban Tài chính", "Ban Nhân sự", "Ban Kỹ thuật", "Ban Pháp chế", "Văn phòng Tập đoàn"],
  ["Tổng công ty Viễn thông Viettel", "Tổng công ty Mạng lưới Viettel", "Trung tâm Công nghệ thông tin", "Tổng công ty Giải pháp doanh nghiệp Viettel", "Tổng công ty Công nghiệp Công nghệ cao"],
];
const summaryNames = ["Nguyễn Minh", "Trần Thanh", "Lê Hoàng", "Phạm Ngọc", "Vũ Quốc", "Đỗ Hải", "Bùi Thu", "Hoàng Anh", "Phan Đức", "Đặng Hồng"];
for (let i = 0; i < 60; i++) {
  const blockIndex = i % 2;
  const block: Evaluation["block"] = blockIndex === 0 ? "Khối Cơ quan" : "Khối Đơn vị";
  const pending = i < 40;
  const step: Step = pending ? "office" : ["cqtt", "council", "ceo", "done"][Math.floor((i - 40) / 2) % 4] as Step;
  const sequence = String(i + 26).padStart(3, "0");
  const council = ["council", "ceo", "done"].includes(step);
  const baseRecord = EVALUATIONS[3]!;
  EVALUATIONS.push({
    ...baseRecord, id: "DG-2026-Q3-" + sequence,
    owner: summaryNames[i % summaryNames.length] + " " + ["An", "Bình", "Dũng", "Hà", "Linh", "Nam"][Math.floor(i / 10)],
    employeeId: String(93000 + i), unit: summaryUnits[blockIndex]![Math.floor(i / 2) % 5]!, block, step,
    assignmentRef: "GNV-2026-Q3-" + sequence, evaluationDate: "2026-11-01", deadline: String(20 + i % 9) + "/11/2026", updated: "01/11/2026 15:00:00",
    selfSubmittedAt: "01/11/2026 09:00:00",
    criteria: allocateCouncilScores(baseRecord.criteria.map((c) => ({ ...c, target: { ...c.target } })), council ? 4.1 : undefined),
    cqttKey: council ? 0.9 : undefined, cqttFunction: council ? 3.2 : undefined,
    councilScore: council ? 4.1 : undefined, ki: council ? "A" : undefined,
    ...(pending ? {} : { officeBatchId: "Quý III/2026|" + block + "|Dot-mau-" + Math.floor((i - 40) / 4) }),
    ...(step === "done" ? { approvedScore: 4.1, approvedKi: "A" as Ki, submittedForSignatureAt: "01/11/2026 14:00:00" } : {}),
    note: "", history: [],
  });
}

export const getEvaluation = (id: string) => EVALUATIONS.find((e) => e.id === id);

export function cqttBounds(e: Evaluation) {
  const percent = e.cqttAdjustmentPercent ?? 10;
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error("Biên độ điều chỉnh phải từ 0–100%.");
  const self = totalScore(e.criteria);
  return { min: Math.max(1, self * (1 - percent / 100)), max: Math.min(5, self * (1 + percent / 100)) };
}
export const KI_SCORE_RANGES = {
  "A+": { min: 4.5, max: 5 }, A: { min: 3.5, max: 4.49 },
  B: { min: 2.5, max: 3.49 }, C: { min: 2, max: 2.49 }, D: { min: 1, max: 1.99 },
} as const;
export function cqttScoreForKi(e: Evaluation, ki: Ki, score: number): Draft {
  if (ki === "K") throw new Error("Ki K là không đánh giá, không nhập điểm.");
  const range = KI_SCORE_RANGES[ki];
  if (!Number.isFinite(score) || score < range.min - 1e-8 || score > range.max + 1e-8)
    throw new Error("Điểm Ki " + ki + " phải trong khoảng " + range.min + "–" + range.max + ".");
  const issue = kiError({ ...e, councilScore: score, ki });
  if (issue) throw new Error(issue);
  const allocated = allocateCouncilScores(e.criteria, score);
  const key = Math.round(allocated.filter((c) => c.group === "A").reduce((sum, c) => sum + c.weight * c.council!, 0) * 100) / 100;
  return { proposedKi: ki, cqttKey: key, cqttFunction: Math.round((score - key) * 100) / 100 };
}
export function proposeCqttKi(e: Evaluation, ki: Ki): Draft {
  if (ki === "K") throw new Error("Ki K là không đánh giá, không nhập điểm.");
  return cqttScoreForKi(e, ki, KI_SCORE_RANGES[ki].min);
}

export function processCqttBatch(evaluations: Evaluation[], role: PreviewRole, ids: string[], drafts: Record<string, Draft>, request: boolean | "council", at: string): Evaluation[] {
  if (role !== "cqtt") throw new Error("Chỉ CQTT được thực hiện thao tác này.");
  if (!ids.length || new Set(ids).size !== ids.length) throw new Error("Không có hồ sơ hợp lệ để xử lý.");
  const updates = new Map<string, Evaluation>();
  for (const id of ids) {
    const e = evaluations.find((item) => item.id === id);
    if (!e || (e.step !== "cqtt" && !(request !== false && e.step === "cqtt_report"))) throw new Error("Danh sách đã thay đổi, hồ sơ chưa đủ điều kiện CQTT xử lý.");
    try {
      const saved = e.step === "cqtt_report" ? e : saveDraft(e, role, drafts[id] ?? {}, at);
      const next = request === "council" ? transition(saved.step === "cqtt" ? transition(saved, role, "finish", {}, at) : saved, role, "send", {}, at) : request ? transition(saved, role, "request", { ...(drafts[id]?.returnStage ? { returnStage: drafts[id]!.returnStage } : {}), ...(drafts[id]?.note ? { note: drafts[id]!.note } : {}) }, at) : saved;
      updates.set(id, next);
    } catch (error) { throw new Error(e.owner + ": " + (error instanceof Error ? error.message : "Dữ liệu không hợp lệ")); }
  }
  return evaluations.map((e) => updates.get(e.id) ?? e);
}

export function councilAutoKi(e: Evaluation): Ki {
  if (e.councilScore === undefined) return "K";
  if (e.locationCompliance === "Không tuân thủ" || e.laborCompliance === "Bị xử lý kỷ luật lao động") return "D";
  const ki = rating(e.councilScore).ki;
  return e.laborCompliance === "Vi phạm nhưng chưa đến mức bị xử lý kỷ luật" && ["A+", "A"].includes(ki) ? "B" : ki;
}
/**
 * Hội đồng sao chép kết quả CQTT: Điểm đánh giá = Điểm CQTT, Ki = Ki CQTT đề xuất (nếu có, không thì theo điểm),
 * và điền Tuân thủ địa điểm / nội quy sao cho khớp Ki đó (Ki D: bị xử lý kỷ luật; Ki thấp hơn mức điểm: vi phạm nội quy).
 */
export function councilCopyFromCqtt(e: Evaluation): Draft {
  const score = cqttTotal(e);
  if (score === null) return {};
  const byScore = rating(score).ki;
  const ki = e.proposedKi && e.proposedKi !== "K" ? e.proposedKi : byScore;
  const order: Ki[] = ["D", "C", "B", "A", "A+"];
  const laborCompliance =
    ki === "D" && score >= 2 ? "Bị xử lý kỷ luật lao động"
      : order.indexOf(ki) < order.indexOf(byScore) ? "Vi phạm nhưng chưa đến mức bị xử lý kỷ luật"
        : "Tuân thủ";
  return { councilScore: score, ki, locationCompliance: "Tuân thủ", laborCompliance };
}
export function councilKiDraft(ki: Ki): Draft {
  return { ki, councilScore: ki === "K" ? undefined : KI_SCORE_RANGES[ki].min };
}
