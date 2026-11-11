import type { SigningAttachment } from "@/lib/director-signing";
import { createContext, useContext, type Context } from "react";
import type { Evaluation, PreviewRole, Draft, Action } from "@/lib/evaluation";
import type { Block, StageKey, WorkflowConfig, WorkflowVersion } from "@/lib/workflow";
export type DirectorSigningDraft = { ids: string[]; files: SigningAttachment[]; refs: string[]; period: string };

type EvaluationState = {
  directorSigningDraft: DirectorSigningDraft | null;
  setDirectorSigningDraft: (draft: DirectorSigningDraft | null) => void;
  evaluations: Evaluation[];
  signingFiles: Record<string, SigningAttachment[]>;
  submitDirectorSigning: (ids: string[], options?: { files?: SigningAttachment[]; note?: string }) => Promise<string | null>;
  processCeoBatch: (ids: string[], action: "approve" | "return" | "save", note: string, drafts?: Record<string, Draft>, returnStage?: StageKey) => string | null;
  saveCouncilBatch: (ids: string[], drafts: Record<string, Draft>, submit?: boolean) => string | null;
  createCouncilSummary: (ids: string[]) => void;
  replaceSelfEvaluation: (evaluation: Evaluation) => string | null;
  addEvaluation: (evaluation: Evaluation) => void;
  previewRole: PreviewRole;
  setPreviewRole: (role: PreviewRole) => void;
  processCqttBatch: (ids: string[], drafts: Record<string, Draft>, request: boolean | "council") => string | null;
  /** CQTT tổng hợp điểm Thường trực đánh giá từ chi tiết đánh giá từng công việc. */
  summarizeCqtt: (ids: string[]) => string | null;
  sendOfficeBatch: (ids: string[], drafts?: Record<string, Draft>) => string | null;
  updateEvaluation: (id: string, patch: Draft, action?: Action) => string | null;
  /** Cấu hình đang áp dụng hôm nay của từng khối. */
  workflows: Record<Block, WorkflowVersion>;
  saveWorkflow: (config: WorkflowConfig) => string | null;
  /** Tất cả phiên bản cấu hình (kể cả sắp áp dụng / hết hiệu lực). */
  workflowVersions: WorkflowVersion[];
  saveWorkflowVersion: (version: WorkflowVersion) => string | null;
  deleteWorkflowVersion: (id: string) => string | null;
};
const previousContext = import.meta.hot?.data?.evaluationContext as
  Context<EvaluationState | null> | undefined;
export const EvaluationContext = previousContext ?? createContext<EvaluationState | null>(null);
if (import.meta.hot?.data) import.meta.hot.data.evaluationContext = EvaluationContext;
export function useEvaluations() {
  const context = useContext(EvaluationContext);
  if (!context) throw new Error("EvaluationProvider is required");
  return context;
}
