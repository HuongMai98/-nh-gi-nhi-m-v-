import { createContext, useContext, type Context } from "react";
import type { Evaluation, PreviewRole, Draft, Action } from "@/lib/evaluation";
type EvaluationState = {
  evaluations: Evaluation[];
  replaceSelfEvaluation: (evaluation: Evaluation) => string | null;
  addEvaluation: (evaluation: Evaluation) => void;
  previewRole: PreviewRole;
  setPreviewRole: (role: PreviewRole) => void;
  sendOfficeBatch: (ids: string[], drafts?: Record<string, Draft>) => string | null;
  updateEvaluation: (id: string, patch: Draft, action?: Action) => string | null;
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
