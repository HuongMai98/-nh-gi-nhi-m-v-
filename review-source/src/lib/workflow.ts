import type { Evaluation, PreviewRole, Step } from "./evaluation";

/** Cấu hình luồng duyệt theo Khối. Engine (transition) đọc cấu hình này khi chuyển bước. */
export type Block = Evaluation["block"];
export const BLOCKS: Block[] = ["Khối Cơ quan", "Khối Đơn vị"];

export type StageKey = "self" | "office" | "cqtt" | "council" | "ceo" | "dispatch" | "sign";
/** Thứ tự bước cố định theo phụ thuộc dữ liệu: điểm tự ĐG → điểm CQTT → Ki Hội đồng → phê duyệt → phát hành. */
export const STAGE_ORDER: StageKey[] = ["self", "office", "cqtt", "council", "ceo", "dispatch", "sign"];

export type StageConfig = {
  key: StageKey;
  enabled: boolean;
  /** Đơn vị/bộ phận xử lý bước (hiển thị trên tiến trình, thông báo, nút chuyển). */
  handler: string;
  /** Hạn xử lý (số ngày) kể từ khi hồ sơ vào bước. 0 = không giới hạn. */
  slaDays: number;
  /** Các bước được phép trả về (đứng trước, đang bật). Rỗng = không cho trả về. Người xử lý chọn 1 bước khi trả về. */
  returnTo: StageKey[];
};
export type BranchConfig = {
  /** GĐ điều chỉnh trực tiếp điểm/Ki trước khi phê duyệt. */
  ceoDirectAdjust: boolean;
};
/** Bước có thể cấu hình trả về, và các bước có thể là đích trả về. */
export const RETURNABLE: StageKey[] = ["office", "cqtt", "council", "ceo"];
export const RETURN_TARGETS: StageKey[] = ["self", "office", "cqtt", "council"];
/** Bước duyệt tùy chỉnh chèn sau một bước cố định: chỉ xem và Duyệt / Trả về. */
export type CustomStage = {
  id: string;
  name: string;
  /** Đặt sau bước cố định này. */
  after: StageKey;
  role: PreviewRole;
  handler: string;
  slaDays: number;
  enabled: boolean;
  returnTo: StageKey[];
};
/** Thông báo & nhắc hạn của luồng duyệt. */
export type NotificationConfig = {
  /** Thông báo cho người xử lý khi hồ sơ đến bước. */
  onArrival: boolean;
  /** Nhắc trước hạn N ngày (0 = không nhắc). */
  remindBeforeDays: number;
  /** Cảnh báo khi quá hạn. */
  overdueAlert: boolean;
  inApp: boolean;
  email: boolean;
};
export const DEFAULT_NOTIFICATIONS: NotificationConfig = { onArrival: true, remindBeforeDays: 1, overdueAlert: true, inApp: true, email: false };
export type WorkflowConfig = {
  block: Block;
  stages: StageConfig[];
  branches: BranchConfig;
  customStages?: CustomStage[];
  notifications?: NotificationConfig;
  updatedAt?: string;
};
/** Bước cố định có thể đặt bước tùy chỉnh phía sau. */
export const CUSTOM_ANCHORS: StageKey[] = ["self", "office", "cqtt", "council", "ceo"];

export const STAGES: Record<
  StageKey,
  { name: string; role: PreviewRole; required: boolean; description: string; handlers: string[]; steps: Step[] }
> = {
  self: {
    name: "Tự đánh giá",
    role: "performer",
    required: true,
    description: "Cá nhân nhập kết quả và tự chấm điểm theo phiếu giao nhiệm vụ.",
    handlers: ["CQĐV/CQ"],
    steps: ["self"],
  },
  office: {
    name: "Thẩm định phiếu",
    role: "office",
    required: false,
    description: "Văn phòng thẩm định phiếu CQĐV/CQ gửi; có thể yêu cầu điều chỉnh trước khi tổng hợp.",
    handlers: ["Văn phòng", "Ban Chiến lược", "Ban Tổ chức lao động"],
    steps: ["office"],
  },
  cqtt: {
    name: "Rà soát, chấm điểm",
    role: "cqtt",
    required: false,
    description: "CQTT chấm điểm trọng tâm/chức năng, có thể gửi điều chỉnh và tổng hợp báo cáo.",
    handlers: ["CQTT", "Ban Tổ chức lao động"],
    steps: ["cqtt", "response", "cqtt_report"],
  },
  council: {
    name: "Chấm điểm, tính Ki",
    role: "council",
    required: false,
    description: "Hội đồng kế thừa điểm, xếp Ki, xác nhận tuân thủ và trình phê duyệt.",
    handlers: ["Hội đồng", "Hội đồng thi đua"],
    steps: ["council", "council_adjust"],
  },
  ceo: {
    name: "Trình ký GĐ",
    role: "ceo",
    required: true,
    description: "Hội đồng trình ký hồ sơ và tài liệu đính kèm; nhận kết quả GĐ duyệt hoặc trả lại.",
    handlers: ["GĐ"],
    steps: ["ceo"],
  },
  dispatch: {
    name: "Gửi kết quả",
    role: "office",
    required: true,
    description: "Hội đồng gửi kết quả đã duyệt, đơn vị tổng hợp gửi lại CQĐV/CQ.",
    handlers: ["Văn phòng", "Ban Chiến lược", "Ban Tổ chức lao động"],
    steps: ["approved", "dispatch"],
  },
  sign: {
    name: "Trình ký phiếu ĐG",
    role: "performer",
    required: true,
    description: "CQĐV/CQ trình ký phiếu đánh giá kèm phiếu giao nhiệm vụ.",
    handlers: ["CQĐV/CQ"],
    steps: ["sign", "done"],
  },
};

export function stageOf(step: Step): StageKey {
  return STAGE_ORDER.find((key) => STAGES[key].steps.includes(step)) ?? "self";
}

const DEFAULT_RETURN: Partial<Record<StageKey, StageKey[]>> = { office: ["self"], cqtt: ["self"], ceo: ["council"] };
export function defaultWorkflow(block: Block): WorkflowConfig {
  const unit = block === "Khối Cơ quan" ? "Văn phòng" : "Ban Chiến lược";
  const sla: Record<StageKey, number> = { self: 7, office: 3, cqtt: 5, council: 5, ceo: 3, dispatch: 3, sign: 5 };
  return {
    block,
    stages: STAGE_ORDER.map((key) => ({
      key,
      enabled: true,
      handler: key === "office" || key === "dispatch" ? unit : STAGES[key].handlers[0]!,
      slaDays: sla[key],
      returnTo: [...(DEFAULT_RETURN[key] ?? [])],
    })),
    branches: { ceoDirectAdjust: false },
    customStages: [],
    notifications: { ...DEFAULT_NOTIFICATIONS },
  };
}
/** Các bước có thể trả về từ `key`: bước đứng trước, đang bật, thuộc danh sách đích hợp lệ. */
export function returnOptions(c: WorkflowConfig, key: StageKey): StageKey[] {
  if (!RETURNABLE.includes(key)) return [];
  const idx = STAGE_ORDER.indexOf(key);
  return RETURN_TARGETS.filter(
    (t) => STAGE_ORDER.indexOf(t) < idx && c.stages.find((s) => s.key === t)?.enabled,
  );
}
/** Đọc cấu hình đã lưu theo phiên bản cũ (nhánh cqttReturn/ceoReturn) sang dạng trả về theo bước. */
export function upgradeWorkflow(raw: WorkflowConfig & { branches: Partial<BranchConfig> & { cqttReturn?: boolean; ceoReturn?: boolean } }): WorkflowConfig {
  const base = defaultWorkflow(raw.block);
  return {
    ...raw,
    stages: STAGE_ORDER.map((key) => {
      const s = raw.stages.find((x) => x.key === key) ?? base.stages.find((x) => x.key === key)!;
      const legacy = key === "cqtt" ? raw.branches.cqttReturn : key === "ceo" ? raw.branches.ceoReturn : undefined;
      const stored = (s as { returnTo?: StageKey[] | StageKey | null }).returnTo;
      const configuredReturn: StageKey[] = Array.isArray(stored)
        ? stored
        : typeof stored === "string"
          ? [stored]
          : stored === null || legacy === false
            ? []
            : [...(DEFAULT_RETURN[key] ?? [])];
      // Office must be able to return a submitted evaluation to the performer for correction.
      const returnTo: StageKey[] = key === "office" && !configuredReturn.includes("self")
        ? [...configuredReturn, "self"]
        : configuredReturn;
      return { ...s, ...(key === "ceo" ? { enabled: true, handler: "GĐ" } : {}), returnTo };
    }),
    branches: { ceoDirectAdjust: false },
    customStages: (raw.customStages ?? []).map((s) => ({ ...s, returnTo: [...(s.returnTo ?? [])] })),
    notifications: { ...DEFAULT_NOTIFICATIONS, ...(raw.notifications ?? {}) },
  };
}

export const cloneWorkflow = (c: WorkflowConfig): WorkflowConfig => ({
  ...c,
  stages: c.stages.map((s) => ({ ...s, returnTo: [...s.returnTo] })),
  branches: { ...c.branches },
  customStages: (c.customStages ?? []).map((s) => ({ ...s, returnTo: [...s.returnTo] })),
  notifications: { ...DEFAULT_NOTIFICATIONS, ...(c.notifications ?? {}) },
});
/** Bước có thể trả về từ bước tùy chỉnh: bước cố định đang bật, tới bước đặt trước nó. */
export function customReturnOptions(c: WorkflowConfig, cs: CustomStage): StageKey[] {
  const idx = STAGE_ORDER.indexOf(cs.after);
  return RETURN_TARGETS.filter((t) => STAGE_ORDER.indexOf(t) <= idx && c.stages.find((s) => s.key === t)?.enabled);
}

/** Kiểm tra cấu hình; trả về danh sách lỗi (rỗng = hợp lệ). */
export function validateWorkflow(c: WorkflowConfig): string[] {
  const errors: string[] = [];
  const on = (k: StageKey) => c.stages.find((s) => s.key === k)?.enabled ?? false;
  for (const key of STAGE_ORDER) {
    const s = c.stages.find((x) => x.key === key);
    if (!s) errors.push(`Thiếu bước ${STAGES[key].name}.`);
    else {
      if (STAGES[key].required && !s.enabled) errors.push(`Bước "${STAGES[key].name}" là bắt buộc.`);
      if (!Number.isInteger(s.slaDays) || s.slaDays < 0 || s.slaDays > 60)
        errors.push(`Hạn xử lý bước "${STAGES[key].name}" phải là số ngày nguyên 0–60.`);
      if (!s.handler.trim()) errors.push(`Chọn đơn vị xử lý cho bước "${STAGES[key].name}".`);
    }
  }
  if (!on("cqtt") && !on("council") && !on("ceo"))
    errors.push("Cần bật ít nhất một bước chấm điểm/phê duyệt (CQTT, Hội đồng hoặc GĐ).");
  for (const s of c.stages)
    if (s.enabled && s.returnTo.some((t) => !returnOptions(c, s.key).includes(t)))
      errors.push(`Bước "${STAGES[s.key].name}" chỉ được trả về bước đứng trước và đang bật.`);
  if (c.branches.ceoDirectAdjust && !on("ceo")) errors.push("GĐ điều chỉnh trực tiếp cần bật bước Phê duyệt kết quả.");
  for (const cs of c.customStages ?? []) {
    const label = cs.name.trim() || "Bước bổ sung";
    if (!cs.name.trim()) errors.push("Nhập tên cho bước bổ sung.");
    if (!CUSTOM_ANCHORS.includes(cs.after)) errors.push(`Vị trí của bước "${label}" không hợp lệ.`);
    if (!Number.isInteger(cs.slaDays) || cs.slaDays < 0 || cs.slaDays > 60) errors.push(`Hạn xử lý bước "${label}" phải là số ngày nguyên 0–60.`);
    if (!cs.handler.trim()) errors.push(`Nhập đơn vị xử lý cho bước "${label}".`);
  }
  const n = c.notifications ?? DEFAULT_NOTIFICATIONS;
  if (!Number.isInteger(n.remindBeforeDays) || n.remindBeforeDays < 0 || n.remindBeforeDays > 30)
    errors.push("Số ngày nhắc trước hạn phải là số nguyên 0–30.");
  return errors;
}

/** Tự tắt các nhánh không còn hợp lệ khi tắt bước liên quan. */
export function normalizeBranches(c: WorkflowConfig): WorkflowConfig {
  const on = (k: StageKey) => c.stages.find((s) => s.key === k)?.enabled ?? false;
  return {
    ...c,
    stages: c.stages.map((s) => ({
      ...s,
      // Bước bắt buộc (Tự đánh giá, Gửi kết quả, Trình ký) luôn bật.
      enabled: STAGES[s.key].required ? true : s.enabled,
      // Gửi kết quả do chính đơn vị tổng hợp đầu vào thực hiện.
      handler: s.key === "dispatch" ? (c.stages.find((x) => x.key === "office")?.handler ?? s.handler) : s.handler,
      returnTo: s.returnTo.filter((t) => returnOptions(c, s.key).includes(t)),
    })),
    branches: { ceoDirectAdjust: false },
    customStages: (c.customStages ?? []).map((cs) => ({ ...cs, returnTo: cs.returnTo.filter((t) => customReturnOptions(c, cs).includes(t)) })),
  };
}

// --- Phiên bản cấu hình theo ngày áp dụng ---
/** Một phiên bản cấu hình luồng duyệt của Khối, có hiệu lực từ `effectiveFrom` đến khi có phiên bản mới hơn. */
export type WorkflowVersion = WorkflowConfig & {
  id: string;
  name: string;
  /** Ngày áp dụng (YYYY-MM-DD). */
  effectiveFrom: string;
  /** Trạng thái do người cấu hình chọn. Không có giá trị = Hiệu lực. */
  state?: VersionState;
  /** @deprecated dữ liệu cũ: false = Nháp. */
  published?: boolean;
};
export type VersionState = "draft" | "effective" | "inactive";
export const VERSION_STATES: VersionState[] = ["draft", "effective", "inactive"];
export const VERSION_STATE_LABEL: Record<VersionState, string> = {
  draft: "Nháp",
  effective: "Hiệu lực",
  inactive: "Không hiệu lực",
};
export const versionState = (v: WorkflowVersion): VersionState => v.state ?? (v.published === false ? "draft" : "effective");
/** Tình trạng áp dụng (chỉ với cấu hình Hiệu lực). */
export type VersionStatus = "draft" | "inactive" | "active" | "upcoming" | "expired";
export const isPublished = (v: WorkflowVersion) => versionState(v) === "effective";
export const VERSION_STATUS_LABEL: Record<VersionStatus, string> = {
  draft: "Nháp",
  inactive: "Không hiệu lực",
  active: "Đang áp dụng",
  upcoming: "Sắp áp dụng",
  expired: "Đã thay thế",
};
/** Ngày hôm nay theo giờ Việt Nam (YYYY-MM-DD). */
export const todayIso = (now: Date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
export const formatIsoDate = (iso: string) => iso.split("-").reverse().join("/");
export const DEFAULT_EFFECTIVE_FROM = "2026-01-01";
export function defaultVersions(): WorkflowVersion[] {
  return BLOCKS.map((block) => ({
    ...defaultWorkflow(block),
    id: `mac-dinh-${block === "Khối Cơ quan" ? "cq" : "dv"}`,
    name: `Luồng duyệt mặc định — ${block}`,
    effectiveFrom: DEFAULT_EFFECTIVE_FROM,
  }));
}
/** Phiên bản hiệu lực của Khối tại ngày `on`: ngày áp dụng gần nhất không vượt quá `on`. */
export function effectiveVersion(list: WorkflowVersion[], block: Block, on: string = todayIso()): WorkflowVersion | undefined {
  return list
    .filter((v) => v.block === block && isPublished(v) && v.effectiveFrom <= on)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}
export function versionStatus(v: WorkflowVersion, list: WorkflowVersion[], on: string = todayIso()): VersionStatus {
  if (!isPublished(v)) return versionState(v) as "draft" | "inactive";
  if (v.effectiveFrom > on) return "upcoming";
  return effectiveVersion(list, v.block, on)?.id === v.id ? "active" : "expired";
}
/** Kiểm tra phiên bản: cấu hình hợp lệ, có tên, ngày hợp lệ, không trùng ngày áp dụng trong cùng Khối. */
export function validateVersion(v: WorkflowVersion, list: WorkflowVersion[]): string[] {
  const errors: string[] = [];
  if (!v.name.trim()) errors.push("Nhập tên cấu hình.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.effectiveFrom) || Number.isNaN(Date.parse(v.effectiveFrom))) errors.push("Chọn ngày áp dụng hợp lệ.");
  else if (isPublished(v) && list.some((x) => x.id !== v.id && isPublished(x) && x.block === v.block && x.effectiveFrom === v.effectiveFrom))
    errors.push(`${v.block} đã có cấu hình áp dụng từ ${formatIsoDate(v.effectiveFrom)}.`);
  return [...errors, ...validateWorkflow(v)];
}

// --- Registry: danh sách phiên bản (Provider cập nhật khi lưu); engine dùng phiên bản hiệu lực hôm nay ---
let versions: WorkflowVersion[] = defaultVersions();
export const getWorkflow = (block: Block): WorkflowConfig =>
  effectiveVersion(versions, block) ?? versions.find((v) => v.block === block) ?? defaultWorkflow(block);
export function setWorkflowVersions(list: WorkflowVersion[]) {
  versions = list.map((v) => ({ ...cloneWorkflow(v), id: v.id, name: v.name, effectiveFrom: v.effectiveFrom, state: versionState(v) }));
}
/** Đặt một cấu hình duy nhất cho mỗi Khối (dùng trong test / dữ liệu cũ). */
export function setWorkflows(configs: WorkflowConfig[]) {
  const others = versions.filter((v) => !configs.some((c) => c.block === v.block));
  setWorkflowVersions([
    ...others,
    ...configs.map((c) => ({ ...cloneWorkflow(c), id: `cfg-${c.block}`, name: c.block, effectiveFrom: "2000-01-01" })),
  ]);
}
export const stageConfig = (block: Block, key: StageKey): StageConfig =>
  getWorkflow(block).stages.find((s) => s.key === key)!;
export const isStageEnabled = (block: Block, key: StageKey) => stageConfig(block, key).enabled;
export const branches = (block: Block) => getWorkflow(block).branches;
/** Bước bật kế tiếp sau `from` (không tính `from`). */
export function nextStage(block: Block, from: StageKey): StageKey {
  const idx = STAGE_ORDER.indexOf(from);
  return STAGE_ORDER.slice(idx + 1).find((k) => isStageEnabled(block, k)) ?? "sign";
}
/** Nút trong chuỗi bước: bước cố định hoặc bước tùy chỉnh. */
export type FlowNode = { kind: "fixed"; key: StageKey } | { kind: "custom"; id: string };
/** Toàn bộ chuỗi bước (gồm bước đang tắt) theo thứ tự: mỗi bước cố định, rồi các bước tùy chỉnh đặt sau nó. */
export function flowNodes(c: WorkflowConfig): (FlowNode & { enabled: boolean })[] {
  const nodes: (FlowNode & { enabled: boolean })[] = [];
  for (const key of STAGE_ORDER) {
    nodes.push({ kind: "fixed", key, enabled: c.stages.find((s) => s.key === key)?.enabled ?? false });
    for (const cs of c.customStages ?? []) if (cs.after === key) nodes.push({ kind: "custom", id: cs.id, enabled: cs.enabled });
  }
  return nodes;
}
/** Bước bật kế tiếp sau nút `from` (bước tùy chỉnh đã xóa khỏi cấu hình: đi tiếp sau bước neo cũ). */
export function nextNode(block: Block, from: FlowNode, fallbackAfter?: StageKey): FlowNode {
  const nodes = flowNodes(getWorkflow(block));
  let idx = nodes.findIndex((n) => (from.kind === "fixed" ? n.kind === "fixed" && n.key === from.key : n.kind === "custom" && n.id === from.id));
  if (idx < 0 && fallbackAfter) idx = nodes.findIndex((n) => n.kind === "fixed" && n.key === fallbackAfter);
  const next = nodes.slice(idx + 1).find((n) => n.enabled);
  return next ? (next.kind === "fixed" ? { kind: "fixed", key: next.key } : { kind: "custom", id: next.id }) : { kind: "fixed", key: "sign" };
}
export const customStageOf = (block: Block, id: string | undefined): CustomStage | undefined =>
  id ? getWorkflow(block).customStages?.find((s) => s.id === id) : undefined;
export const notificationsFor = (block: Block): NotificationConfig => ({ ...DEFAULT_NOTIFICATIONS, ...(getWorkflow(block).notifications ?? {}) });
export const handlerFor = (block: Block, key: StageKey) => stageConfig(block, key).handler;
/** Các bước được phép trả về từ bước `key` (rỗng = không cho trả về). */
export const returnTargets = (block: Block, key: StageKey): StageKey[] => stageConfig(block, key).returnTo ?? [];
/** Bước đích: bước người xử lý chọn (null nếu không được phép); không chọn thì lấy bước đầu tiên được phép. */
export function resolveReturn(block: Block, key: StageKey, chosen?: StageKey): StageKey | null {
  const allowed = returnTargets(block, key);
  if (chosen) return allowed.includes(chosen) ? chosen : null;
  return allowed[0] ?? null;
}
/** Nhãn nút trả về theo bước nguồn/đích. */
export function returnLabel(block: Block, from: StageKey, to: StageKey): string {
  if (from === "office" && to === "self") return "Yêu cầu CQ/CQĐV điều chỉnh";
  if (from === "cqtt" && to === "self") return "Gửi điều chỉnh CQ/CQĐV";
  if (from === "ceo" && to === "council") return "Yêu cầu Hội đồng điều chỉnh";
  return `Trả về ${handlerFor(block, to)}`;
}

// --- Hạn xử lý (SLA) ---
const DAY = 24 * 60 * 60 * 1000;
/** Đọc "dd/mm/yyyy hh:mm:ss", "hh:mm:ss d/m/yyyy" (vi-VN) hoặc ISO. */
export function parseVnDate(value: string | undefined): Date | null {
  if (!value) return null;
  const iso = Date.parse(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(iso)) return new Date(iso);
  const d = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!d) return null;
  const t = value.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  return new Date(Number(d[3]), Number(d[2]) - 1, Number(d[1]), Number(t?.[1] ?? 0), Number(t?.[2] ?? 0), Number(t?.[3] ?? 0));
}
export type SlaInfo = { due: Date; daysLeft: number; overdue: boolean; slaDays: number };
export function slaFor(e: Evaluation, now: Date = new Date()): SlaInfo | null {
  if (e.step === "done" || ["dispatch", "sign"].includes(stageOf(e.step))) return null;
  const cfg = e.step === "custom" ? customStageOf(e.block, e.customStageId) : stageConfig(e.block, stageOf(e.step));
  if (!cfg) return null;
  if (!cfg.slaDays) return null;
  const start = parseVnDate(e.stageEnteredAt) ?? parseVnDate(e.updated);
  if (!start) return null;
  const due = new Date(start.getTime() + cfg.slaDays * DAY);
  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / DAY);
  return { due, daysLeft, overdue: due.getTime() < now.getTime(), slaDays: cfg.slaDays };
}
export const slaLabel = (s: SlaInfo) =>
  s.overdue ? `Quá hạn ${Math.max(1, -s.daysLeft)} ngày` : s.daysLeft <= 0 ? "Đến hạn hôm nay" : `Còn ${s.daysLeft} ngày`;
