# Evaluation workflow implementation plan

Goal: implement the workflow agreed in this chat in the existing in-memory vOffice prototype.

Architecture: pure workflow transitions in evaluation.ts, shared React state in EvaluationProvider, role-specific aggregate forms and read-only personal template. No external notifications, authentication, or signature service.

1. Write workflow regression tests: direct self-to-office submission, office returns, CQTT response, council inheritance and override, CEO correction, distribution/signing, and unauthorized edits.
2. Replace the independent manager stage with office/CQTT/council roles. Preserve task dates and original scores. Council edits aggregate scores only; personal summary derives from those same fields.
3. Update list, detail, roles and notifications. Add aggregate KPI, block appendix, Tong hop Ki and personal template views using existing controls.
4. Run workflow tests, UI tests, TypeScript and production build. Package updated source without node_modules.

Review focus: incomplete scores; blank return reasons; score zero/NaN/out of range; stale or wrong-role actions; post-approval edits; totals inherited only once; council overrides never distributed to task scores.
