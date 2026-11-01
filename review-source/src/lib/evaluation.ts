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
  | "done";
export type PreviewRole = "performer" | "office" | "cqtt" | "council" | "ceo";
export type Ki = "A+" | "A" | "B" | "C" | "D" | "K";
export const ROLES: Record<PreviewRole, string> = {
  performer: "CQĐV/CQ",
  office: "Văn phòng / Ban Chiến lược",
  cqtt: "CQTT",
  council: "Hội đồng",
  ceo: "TGĐ",
};
export const ASSIGNING_UNIT = {
  name: "Tập đoàn Công nghệ - Viễn thông Quân đội",
  label: "Tập đoàn",
};
export const MOCK_CURRENT_PERFORMER = "Đinh Ngọc Tuấn";
export const mockPerformerFor = (e: Evaluation) =>
  ["self", "response", "sign"].includes(e.step) ? e.owner : MOCK_CURRENT_PERFORMER;
export const canSelfEvaluate = (e: Evaluation, performer: string) => e.owner === performer;
export const officeFor = (e: Evaluation) =>
  e.block === "Khối Cơ quan" ? "Văn phòng" : "Ban Chiến lược";
export const appendixFor = (e: Evaluation) =>
  e.block === "Khối Cơ quan" ? "PL I — Kết quả Khối Cơ quan" : "PL2 — Kết quả Khối Đơn vị";
export const STEPS: { key: Step; label: string; actor: string }[] = [
  { key: "self", label: "Tự đánh giá", actor: "CQĐV/CQ" },
  { key: "office", label: "Tổng hợp đầu vào", actor: "VP / Ban CL" },
  { key: "cqtt", label: "Rà soát, chấm điểm", actor: "CQTT" },
  { key: "response", label: "Tiếp thu / bảo lưu", actor: "CQĐV/CQ" },
  { key: "cqtt_report", label: "Tổng hợp báo cáo", actor: "CQTT" },
  { key: "council", label: "Tổng hợp KPI", actor: "Hội đồng" },
  { key: "ceo", label: "Phê duyệt kết quả", actor: "TGĐ" },
  { key: "council_adjust", label: "Điều chỉnh theo TGĐ", actor: "Hội đồng" },
  { key: "approved", label: "Gửi kết quả đã duyệt", actor: "Hội đồng" },
  { key: "dispatch", label: "Phân phối kết quả", actor: "VP / Ban CL" },
  { key: "sign", label: "Trình ký phiếu ĐG", actor: "CQĐV/CQ" },
  { key: "done", label: "Đã trình ký", actor: "CQĐV/CQ" },
];
export const MAIN_STEPS = [
  { key: "self", label: "Chờ tự đánh giá", actor: "CQĐV/CQ" },
  { key: "office", label: "Đang tổng hợp", actor: "VP / Ban CL" },
  { key: "cqtt", label: "CQTT đang rà soát", actor: "CQTT" },
  { key: "council", label: "Hội đồng đánh giá", actor: "Hội đồng" },
  { key: "ceo", label: "Chờ TGĐ phê duyệt", actor: "TGĐ" },
  { key: "approved", label: "Đã phê duyệt", actor: "Hội đồng → VP/Ban CL → CQĐV/CQ" },
] as const;
export type MainStage = (typeof MAIN_STEPS)[number]["key"];
export function mainStage(step: Step): MainStage {
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
  cqttAdjustmentPercent?: number | undefined;
  proposedKi?: Ki | undefined;
  reviewAssistant?: string;
  reviewRemark?: string;
  councilScore?: number | undefined;
  ki?: Ki | undefined;
  note?: string;
  response?: "Tiếp thu" | "Bảo lưu";
  responseNote?: string;
  locationCompliance?: string;
  laborCompliance?: string;
  cultureCompliance?: string;
  approvedScore?: number | undefined;
  approvedKi?: Ki | undefined;
  submittedForSignatureAt?: string;
};
export type Draft = Partial<
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
};
export const selfEditable = (e: Evaluation, role: PreviewRole) =>
  role === "performer" && e.step === "self";
export const totalScore = (items: Criterion[]) =>
  Math.round(items.reduce((n, c) => n + c.weight * c.self, 0) * 100) / 100;
export const groupScore = (e: Evaluation, key: boolean) =>
  totalScore(e.criteria.filter((c) => (c.group === "A") === key));
export const cqttTotal = (e: Evaluation) =>
  e.cqttKey === undefined || e.cqttFunction === undefined
    ? null
    : Math.round((e.cqttKey + e.cqttFunction) * 100) / 100;
export const scoresComplete = (items: Criterion[]) =>
  items.length > 0 && items.every((c) => Number.isInteger(c.self) && c.self >= 1 && c.self <= 5);
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
  const score = e.approvedScore ?? e.councilScore,
    ki = e.approvedKi ?? e.ki;
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
  return {
    ...next,
    updated: at,
    history: [
      ...(e.history ?? []),
      { at, role, action, note, before: snapshot(e), after: snapshot(next) },
    ],
  };
}
export function saveDraft(e: Evaluation, role: PreviewRole, patch: Draft, at: string): Evaluation {
  if (
    stageRole[e.step] !== role ||
    ["approved", "dispatch", "sign", "done", "ceo"].includes(e.step)
  )
    throw new Error("Vai trò hoặc trạng thái không cho phép sửa hồ sơ.");
  let next = { ...e };
  const allowed =
    role === "office" && e.step === "office"
      ? ["reviewAssistant", "reviewRemark"]
      : selfEditable(e, role)
        ? ["criteria"]
        : role === "cqtt" && e.step === "cqtt"
          ? ["cqttKey", "cqttFunction", "cqttAdjustmentPercent", "note", "proposedKi", "reviewAssistant", "reviewRemark"]
          : role === "council"
            ? [
                "councilScore",
                "ki",
                "locationCompliance",
                "laborCompliance",
                "cultureCompliance",
                "note",
              ]
            : role === "performer" && e.step === "response"
              ? ["response", "responseNote", "criteria"]
              : [];
  if (Object.keys(patch).some((k) => !allowed.includes(k)))
    throw new Error("Không được sửa trường dữ liệu ở bước này.");
  if (patch.criteria) {
    if (patch.criteria.length !== e.criteria.length)
      throw new Error("Không được thay đổi mục tiêu gốc.");
    next.criteria = e.criteria.map((c, i) => {
      const incoming = patch.criteria![i]!;
      if (!Number.isInteger(incoming.self) || incoming.self < 0 || incoming.self > 5)
        throw new Error("Điểm tự đánh giá từ 1–5.");
      return e.step === "response"
        ? { ...c, result: incoming.result }
        : { ...c, self: incoming.self, result: incoming.result };
    });
  }
  const { criteria: ignored, ...fields } = patch;
  next = { ...next, ...fields };
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
    if (score !== null && next.proposedKi) { const issue = kiError({ ...next, councilScore: score, ki: next.proposedKi }); if (issue) throw new Error(issue); }
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
  if (role === "council") next.criteria = allocateCouncilScores(next.criteria, next.councilScore);
  return record(e, next, role, "Lưu nháp", patch.note ?? patch.responseNote ?? "", at);
}
export function transition(
  e: Evaluation,
  role: PreviewRole,
  action: Action,
  patch: Draft,
  at: string,
): Evaluation {
  if (stageRole[e.step] !== role) throw new Error("Vai trò không được thực hiện bước này.");
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
    next = { ...next, step: "office", selfSubmittedAt: at };
  } else if (e.step === "office") {
    if (action === "send") next = { ...e, step: "cqtt", note: "" };
    else throw new Error("Thao tác không hợp lệ.");
  } else if (e.step === "cqtt") {
    if (!["request", "finish"].includes(action)) throw new Error("Thao tác không hợp lệ.");
    if (cqttTotal(e) === null) throw new Error("Nhập đủ điểm CQTT trước khi chuyển bước.");
    if (action === "request") requireReason();
    next = { ...e, step: action === "request" ? "response" : "cqtt_report", note: reason };
  } else if (e.step === "response" && action === "respond") {
    next = saveDraft(e, role, patch, at);
    if (!["Tiếp thu", "Bảo lưu"].includes(next.response ?? "") || !next.responseNote?.trim())
      throw new Error("Chọn tiếp thu/bảo lưu và nhập nội dung phản hồi.");
    next = { ...next, step: "cqtt_report" };
  } else if (e.step === "cqtt_report" && action === "send") {
    const score = cqttTotal(e);
    if (score === null || score < 1 || score > 5) throw new Error("Điểm CQTT phải từ 1–5.");
    next = {
      ...e,
      step: "council",
      councilScore: score,
      ki: rating(score).ki,
      criteria: allocateCouncilScores(e.criteria, score),
    };
  } else if (["council", "council_adjust"].includes(e.step) && action === "submit") {
    if (kiError(e)) throw new Error(kiError(e));
    if (!e.locationCompliance || !e.laborCompliance)
      throw new Error("Vui lòng xác nhận đánh giá tuân thủ.");
    next = { ...e, step: "ceo", criteria: allocateCouncilScores(e.criteria, e.councilScore) };
  } else if (e.step === "ceo") {
    if (action === "return") {
      requireReason();
      next = { ...e, step: "council_adjust", note: reason };
    } else if (action === "approve") {
      if (kiError(e)) throw new Error(kiError(e));
      next = { ...e, step: "approved", approvedScore: e.councilScore, approvedKi: e.ki };
    } else throw new Error("Thao tác không hợp lệ.");
  } else if (e.step === "approved" && action === "send") next = { ...e, step: "dispatch" };
  else if (e.step === "dispatch" && action === "send") next = { ...e, step: "sign" };
  else if (e.step === "sign" && action === "sign")
    next = { ...e, step: "done", submittedForSignatureAt: at };
  else throw new Error("Thao tác không hợp lệ ở trạng thái hiện tại.");
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
  if (selected.some((e) => e.period !== scope.period || e.block !== scope.block))
    throw new Error("Mỗi lần gửi phải cùng kỳ và cùng khối đánh giá.");
  const forwarded = new Map(
    selected.map((e) => {
      const draft = drafts[e.id];
      const saved = draft && Object.keys(draft).length ? saveDraft(e, role, draft, at) : e;
      return [e.id, { ...transition(saved, role, "send", {}, at), officeBatchId: `${scope.period}|${scope.block}|${at}` }] as const;
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

export const getEvaluation = (id: string) => EVALUATIONS.find((e) => e.id === id);

export function cqttBounds(e: Evaluation) {
  const percent = e.cqttAdjustmentPercent ?? 10;
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error("Biên độ điều chỉnh phải từ 0–100%.");
  const self = totalScore(e.criteria);
  return { min: Math.max(1, self * (1 - percent / 100)), max: Math.min(5, self * (1 + percent / 100)) };
}
export function proposeCqttKi(e: Evaluation, ki: Ki): Draft {
  if (ki === "K") throw new Error("Ki K là không đánh giá; không tự điều chỉnh điểm để đạt Ki K.");
  const bounds = { min: 1, max: 5 };
  const minimum = { "A+": 3.5, A: 3.5, B: 2, C: 2, D: 1 }[ki];
  const lower = Math.max(bounds.min, minimum);
  const score = Math.ceil(Math.max(lower, Math.min(cqttTotal(e) ?? totalScore(e.criteria), bounds.max)) * 100 - 1e-8) / 100;
  if (score > bounds.max + 1e-8) throw new Error("Biên độ hiện tại không đủ để đề xuất Ki " + ki + ".");
  const issue = kiError({ ...e, councilScore: score, ki });
  if (issue) throw new Error(issue);
  const allocated = allocateCouncilScores(e.criteria, score);
  const key = Math.round(allocated.filter((c) => c.group === "A").reduce((sum, c) => sum + c.weight * c.council!, 0) * 100) / 100;
  return { proposedKi: ki, cqttKey: key, cqttFunction: Math.round((score - key) * 100) / 100 };
}
