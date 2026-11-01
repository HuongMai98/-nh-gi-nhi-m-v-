<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep mockup evaluations in the root EvaluationProvider's React state so newly created records remain available across list and detail navigation without persistent storage or server mutations.
- Treat evaluation owner as the work performer and unit as the performing unit; shared assigning-unit metadata keeps list labels consistent without duplicating records.
- Keep the creation form in CreateEvaluationDialog and reuse the shared design-system controls to preserve the existing vOffice presentation.
- Prebundle the creation form's Radix and variant dependencies in Vite so late optimization does not replace the browser's React dependency graph during editing.
- Preserve task-owned criterion dates when saving evaluation descriptions; evaluation forms display these values without editing them so task data remains the source of truth.
- Keep evaluation context and its hook outside the provider component module and retain context identity in Vite HMR data when that module updates; never cache evaluation records globally or share SSR user state.

- Business workflow agreed 2026-10-31: self → office (aggregate and batch-forward from the root summary only; never return to performer or send an individual detail) → CQTT aggregate KPI review (with acceptance/reservation) → CQTT report → council Tong hop Ki → CEO (with council corrections) → council delivery → office distribution → performer signature submission. No independent manager step.
- Council inherits CQTT aggregate scores and edits only the Tong hop Ki total, Ki and compliance. Personal template summary derives from the same fields. Allocate the council total to individual criteria proportionally to original self scores using a common factor clamped to 1–5. Keep original self scores and task weights unchanged; persist allocated council scores and audit history.
- Preserve independent self, CQTT and council scores and immutable history snapshots. Enforce editable fields and actions by preview role and workflow stage in evaluation.ts. Preview roles are not real authentication.

- Office batch sending includes only office-stage records in the selected period/block. Preserve pending metadata drafts across filtering, validate the whole batch before updating React state, and leave other stages untouched.
