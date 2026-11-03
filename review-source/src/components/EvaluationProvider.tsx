import { CURRENT_USER, canSubmitEvaluation, validateSelfSubmission } from "@/lib/users";
import { useState, type ReactNode } from "react";
import {
  EVALUATIONS,
  allocateCouncilScores,
  kiError,
  processCqttBatch,
  forwardOfficeBatch,
  saveDraft,
  transition,
  type PreviewRole,
  type Draft,
  type Action,
  type Evaluation,
} from "@/lib/evaluation";
import { EvaluationContext } from "@/components/evaluation-context";
import {
  defaultVersions,
  effectiveVersion,
  normalizeBranches,
  setWorkflowVersions,
  todayIso,
  upgradeWorkflow,
  validateVersion,
  versionState,
  versionStatus,
  BLOCKS,
  type Block,
  type WorkflowConfig,
  type WorkflowVersion,
} from "@/lib/workflow";

const VERSIONS_KEY = "danh-gia.workflow-versions.v1";
const LEGACY_KEY = "danh-gia.workflow-config.v1";
const upgrade = (raw: unknown): WorkflowVersion => {
  const v = raw as WorkflowVersion;
  return { ...normalizeBranches(upgradeWorkflow(v as Parameters<typeof upgradeWorkflow>[0])), id: v.id, name: v.name, effectiveFrom: v.effectiveFrom, state: versionState(v) };
};
/** Đọc danh sách phiên bản đã lưu; chuyển cấu hình bản cũ (1 cấu hình/khối) thành phiên bản. */
function loadVersions(): WorkflowVersion[] {
  const defaults = defaultVersions();
  try {
    if (typeof localStorage === "undefined") return defaults;
    const raw = localStorage.getItem(VERSIONS_KEY);
    if (raw) {
      const list = (JSON.parse(raw) as unknown[]).map(upgrade).filter((v, _, all) => !validateVersion(v, all).length);
      if (BLOCKS.every((b) => effectiveVersion(list, b))) return list;
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const saved = JSON.parse(legacy) as Partial<Record<Block, WorkflowConfig>>;
      return defaults.map((d) => (saved[d.block] ? upgrade({ ...saved[d.block], id: d.id, name: d.name, effectiveFrom: d.effectiveFrom }) : d));
    }
  } catch { /* dữ liệu lỗi: dùng mặc định */ }
  return defaults;
}
export function EvaluationProvider({ children }: { children: ReactNode }) {
  const [evaluations, setEvaluations] = useState(EVALUATIONS);
  const [workflowVersions, setVersionState] = useState(() => { const v = loadVersions(); setWorkflowVersions(v); return v; });
  const today = todayIso();
  // Phiên bản đang áp dụng hôm nay của từng khối — các màn xử lý hồ sơ dùng cấu hình này.
  const workflows = Object.fromEntries(BLOCKS.map((b) => [b, effectiveVersion(workflowVersions, b, today)!])) as Record<Block, WorkflowVersion>;
  function commitVersions(next: WorkflowVersion[]): string | null {
    const missing = BLOCKS.find((b) => !effectiveVersion(next, b, today));
    if (missing) return `${missing} phải luôn có một cấu hình đang áp dụng (ngày áp dụng không sau hôm nay).`;
    setWorkflowVersions(next);
    setVersionState(next);
    try { localStorage.setItem(VERSIONS_KEY, JSON.stringify(next)); } catch { /* chỉ lưu trong phiên */ }
    return null;
  }
  function saveWorkflowVersion(version: WorkflowVersion): string | null {
    const existing = workflowVersions.find((v) => v.id === version.id);
    const { published: _legacy, ...clean } = version;
    const normalized: WorkflowVersion = { ...clean, state: versionState(version), ...normalizeBranches(version), id: version.id, name: version.name.trim(), effectiveFrom: version.effectiveFrom, updatedAt: new Date().toLocaleString("vi-VN") };
    const errors = validateVersion(normalized, workflowVersions);
    if (errors.length) return errors[0]!;
    return commitVersions(existing ? workflowVersions.map((v) => (v.id === version.id ? normalized : v)) : [...workflowVersions, normalized]);
  }
  function deleteWorkflowVersion(id: string): string | null {
    const v = workflowVersions.find((x) => x.id === id);
    if (!v) return "Không tìm thấy cấu hình.";
    if (versionStatus(v, workflowVersions, today) === "active") return "Không xóa được cấu hình đang áp dụng.";
    return commitVersions(workflowVersions.filter((x) => x.id !== id));
  }
  /** Lưu nhanh cấu hình đang áp dụng của khối (giữ tương thích). */
  function saveWorkflow(config: WorkflowConfig): string | null {
    const current = workflows[config.block];
    return saveWorkflowVersion({ ...current, ...config, id: current.id, name: current.name, effectiveFrom: current.effectiveFrom });
  }
  const [previewRole, setPreviewRole] = useState<PreviewRole>("performer");
  function updateEvaluation(id: string, patch: Draft, action?: Action): string | null {
    const e = evaluations.find((item) => item.id === id);
    if (!e) return "Không tìm thấy hồ sơ.";
    if (e.step === "office" && action === "send")
      return "Gửi chung các phiếu đang tổng hợp từ bảng Tổng hợp đánh giá.";
    if (e.step === "self" && action === "submit" && !canSubmitEvaluation(e, CURRENT_USER))
      return "Chỉ người thực hiện hoặc người cùng đơn vị được gửi tổng hợp.";
    try {
      const now = new Date().toLocaleString("vi-VN");
      const returnAction = action === "return";
      const editable = Object.keys(patch).length > 0 && !returnAction;
      const saved = editable ? saveDraft(e, previewRole, patch, now) : e;
      if (e.step === "self" && action === "submit") {
        const issue = validateSelfSubmission(saved);
        if (issue) return issue;
      }
      const next = action
        ? transition(saved, previewRole, action, returnAction ? patch : patch.returnStage ? { returnStage: patch.returnStage } : {}, now)
        : saved;
      const attributed = { ...next, history: (next.history ?? []).map((entry, index) => e.step === "self" && index >= (e.history?.length ?? 0) ? { ...entry, actorName: CURRENT_USER.name, actorId: CURRENT_USER.employeeId } : entry) };
      setEvaluations((current) => current.map((item) => (item.id === id ? attributed : item)));
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Không thể cập nhật hồ sơ.";
    }
  }
  function sendOfficeBatch(ids: string[], drafts: Record<string, Draft> = {}): string | null {
    try {
      const next = forwardOfficeBatch(
        evaluations,
        previewRole,
        ids,
        drafts,
        new Date().toLocaleString("vi-VN"),
      );
      setEvaluations(next);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Không thể gửi tổng hợp.";
    }
  }
  function replaceSelfEvaluation(next: Evaluation): string | null {
    const existing = evaluations.find((e) => e.id === next.id);
    if (!existing || existing.step !== "self" || previewRole !== "performer" || !canSubmitEvaluation(existing, CURRENT_USER))
      return "Chỉ người thực hiện hoặc người cùng đơn vị được cập nhật phiếu đang tự đánh giá.";
    if (next.employeeId !== existing.employeeId || next.unit !== existing.unit || next.block !== existing.block)
      return "Không được thay đổi người thực hiện và đơn vị của phiếu.";
    if (!["self", "office"].includes(next.step)) return "Trạng thái cập nhật không hợp lệ.";
    if (next.criteria.filter((c) => c.group !== "A").reduce((sum, c) => sum + c.weight, 0) > 0.8 + 1e-8)
      return "Tổng tỷ trọng nhóm B không được vượt 80%.";
    if (next.step === "office") { const issue = validateSelfSubmission(next); if (issue) return issue; }
    const history = [...(existing.history ?? []), { at: next.updated, role: previewRole, action: next.step === "office" ? "submit" : "Cập nhật phiếu", note: "", actorName: CURRENT_USER.name, actorId: CURRENT_USER.employeeId, before: JSON.stringify(existing.criteria), after: JSON.stringify(next.criteria) }];
    setEvaluations((current) => current.map((e) => e.id === existing.id ? { ...next, history } : e));
    return null;
  }
  return (
    <EvaluationContext.Provider
      value={{
        evaluations,
        processCeoBatch: (ids, action, note, drafts = {}, returnStage) => {
          if (previewRole !== "ceo") return "Chỉ TGĐ được phê duyệt hoặc yêu cầu Hội đồng điều chỉnh.";
          try {
            if (!ids.length) throw new Error("Không có hồ sơ chờ phê duyệt.");
            if (action === "save" && !ids.some((id) => Object.keys(drafts[id] ?? {}).length)) throw new Error("Chưa có thay đổi để lưu.");
            const updates = new Map(ids.map((id) => {
              const e = evaluations.find((e) => e.id === id);
              if (!e || e.step !== "ceo") throw new Error("Hồ sơ không còn chờ TGĐ phê duyệt.");
              const now = new Date().toLocaleString("vi-VN");
              const draft = drafts[id] ?? {};
              // Phê duyệt: áp điều chỉnh trực tiếp của TGĐ (nếu có) rồi phê duyệt.
              const adjusted = action !== "return" && Object.keys(draft).length ? saveDraft(e, "ceo", draft, now) : e;
              // Lưu tất cả: chỉ lưu điều chỉnh trực tiếp, hồ sơ vẫn chờ TGĐ phê duyệt.
              return [id, action === "save" ? adjusted : transition(adjusted, "ceo", action, { note, ...(returnStage ? { returnStage } : {}) }, now)] as const;
            }));
            setEvaluations((current) => current.map((e) => updates.get(e.id) ?? e));
            return null;
          } catch (error) { return error instanceof Error ? error.message : "Không thể xử lý hồ sơ."; }
        },
        saveCouncilBatch: (ids, drafts, submit = false) => {
          if (previewRole !== "council") return "Chỉ Hội đồng được lưu đánh giá.";
          try {
            if (!ids.length) throw new Error("Không có hồ sơ để lưu.");
            const updates = new Map(ids.map((id) => {
              const e = evaluations.find((e) => e.id === id);
              if (!e || !["council", "council_adjust"].includes(e.step)) throw new Error("Hồ sơ không còn ở bước Hội đồng đánh giá.");
              const next = saveDraft(e, "council", drafts[id] ?? {}, new Date().toLocaleString("vi-VN"));
              const issue = kiError(next);
              if (issue) throw new Error(e.owner + ": " + issue);
              return [id, submit ? transition(next, "council", "submit", {}, next.updated) : next] as const;
            }));
            setEvaluations((current) => current.map((e) => updates.get(e.id) ?? e));
            return null;
          } catch (error) { return error instanceof Error ? error.message : "Không thể lưu tất cả."; }
        },
        createCouncilSummary: (ids) => {
          if (previewRole !== "council") return;
          // Tổng hợp KI: để trống các ô Hội đồng cần chấm (trừ phiếu Hội đồng đã chấm); dùng nút Sao chép điểm CQTT để điền.
          setEvaluations((current) => current.map((e) => !ids.includes(e.id) || !["council", "council_adjust"].includes(e.step) ? e
            : e.councilSummaryCreated || e.councilReviewed ? { ...e, councilSummaryCreated: true }
              : (({ councilScore: _s, ki: _k, locationCompliance: _l, laborCompliance: _b, ...rest }) => ({ ...rest, councilSummaryCreated: true, criteria: allocateCouncilScores(e.criteria, undefined) }))(e)));
        },
        replaceSelfEvaluation,
        previewRole,
        setPreviewRole,
        updateEvaluation,
        sendOfficeBatch,
        processCqttBatch: (ids, drafts, request) => {
          try { setEvaluations(processCqttBatch(evaluations, previewRole, ids, drafts, request, new Date().toLocaleString("vi-VN"))); return null; }
          catch (error) { return error instanceof Error ? error.message : "Không thể xử lý danh sách."; }
        },
        addEvaluation: (e) => setEvaluations((current) => [e, ...current]),
        workflows,
        saveWorkflow,
        workflowVersions,
        saveWorkflowVersion,
        deleteWorkflowVersion,
      }}
    >
      {children}
    </EvaluationContext.Provider>
  );
}
