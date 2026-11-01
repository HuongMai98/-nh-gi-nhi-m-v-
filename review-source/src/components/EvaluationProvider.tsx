import { CURRENT_USER, canSubmitEvaluation, validateSelfSubmission } from "@/lib/users";
import { useState, type ReactNode } from "react";
import {
  EVALUATIONS,
  forwardOfficeBatch,
  saveDraft,
  transition,
  type PreviewRole,
  type Draft,
  type Action,
  type Evaluation,
} from "@/lib/evaluation";
import { EvaluationContext } from "@/components/evaluation-context";
export function EvaluationProvider({ children }: { children: ReactNode }) {
  const [evaluations, setEvaluations] = useState(EVALUATIONS);
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
        ? transition(saved, previewRole, action, returnAction ? patch : {}, now)
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
        replaceSelfEvaluation,
        previewRole,
        setPreviewRole,
        updateEvaluation,
        sendOfficeBatch,
        addEvaluation: (e) => setEvaluations((current) => [e, ...current]),
      }}
    >
      {children}
    </EvaluationContext.Provider>
  );
}
