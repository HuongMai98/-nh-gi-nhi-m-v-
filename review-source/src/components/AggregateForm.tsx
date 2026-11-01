import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AssessmentSummary } from "@/components/AssessmentSummary";
import { Button } from "@/components/ui/button";
import { useEvaluations } from "@/components/evaluation-context";
import {
  cqttTotal,
  groupScore,
  templateResult,
  rating,
  kiError,
  appendixFor,
  type Evaluation,
  type Draft,
  type Ki,
} from "@/lib/evaluation";

export const fieldClass =
  "h-9 rounded-md border border-input bg-card px-2 text-sm disabled:bg-muted disabled:text-muted-foreground";
const number = (v: number | undefined | null) => (v == null ? "—" : v.toFixed(2));
const KI: Ki[] = ["A+", "A", "B", "C", "D", "K"];
export const LABOR = [
  "Tuân thủ",
  "Vi phạm nhưng chưa đến mức bị xử lý kỷ luật",
  "Bị xử lý kỷ luật lao động",
];
export function exportCsv(name: string, rows: (string | number | null | undefined)[][]) {
  const csv =
    "\ufeff" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value ?? "");
            if (/^[=+@-]/.test(text)) text = "'" + text;
            return '"' + text.replaceAll('"', '""') + '"';
          })
          .join(","),
      )
      .join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name + ".csv";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function AggregateForm({
  evaluations,
  mode,
  onDraftChange,
  batchCandidates,
}: {
  batchCandidates?: Evaluation[] | undefined;
  onDraftChange?: ((draft: Draft) => void) | undefined;
  evaluations: Evaluation[];
  mode: "kpi" | "ki" | "appendix";
}) {
  const { previewRole } = useEvaluations();
  const title =
    mode === "kpi"
      ? "Tổng hợp đánh giá"
      : mode === "ki"
        ? "Tổng hợp KPI — BM01"
        : "Phụ lục kết quả theo khối";
  const isKpi = mode === "kpi";
  const counts = KI.map((ki) => ({
    ki,
    n: evaluations.filter((e) => templateResult(e).ki === ki).length,
  }));
  const denominator = counts.filter((c) => c.ki !== "K").reduce((n, c) => n + c.n, 0);
  function exportData() {
    exportCsv(title, [
      isKpi
        ? [
            "TT",
            "Mã số",
            "Họ và tên",
            "Đơn vị",
            "Tự ĐG trọng tâm",
            "Tự ĐG chức năng",
            "Tổng tự ĐG",
            "CQTT trọng tâm",
            "CQTT chức năng",
            "Tổng CQTT",
            "Lý do",
            "Đề xuất xếp hạng Ki",
            "Trợ lý",
            "Ghi chú",
            "Phản hồi",
          ]
        : [
            "Mã nhân viên",
            "Họ tên",
            "Chức danh",
            "Đơn vị",
            "Điểm CQTT",
            "Điểm đánh giá",
            "Xếp loại",
            "Địa điểm làm việc",
            "Nội quy",
            "Ki",
            "Mức độ hoàn thành",
          ],
      ...evaluations.map((e, index) => {
        const result = templateResult(e);
        return isKpi
          ? [
              index + 1,
              e.employeeId,
              e.owner,
              e.unit,
              groupScore(e, true),
              groupScore(e, false),
              groupScore(e, true) + groupScore(e, false),
              e.cqttKey,
              e.cqttFunction,
              cqttTotal(e),
              e.note,
              e.proposedKi,
              e.reviewAssistant,
              e.reviewRemark,
              e.responseNote,
            ]
          : [
              e.employeeId,
              e.owner,
              e.jobTitle,
              e.unit,
              cqttTotal(e),
              result.score,
              result.rating,
              e.locationCompliance,
              e.laborCompliance,
              result.ki,
              result.completion,
            ];
      }),
    ]);
  }
  if (isKpi)
    return (
      <AssessmentSummary
        key={previewRole}
        batchCandidates={batchCandidates}
        evaluations={evaluations}
        onExport={exportData}
        onDraftChange={onDraftChange}
      />
    );
  return (
    <section className="space-y-4" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {isKpi
              ? "Điểm nhóm là phần điểm đã nhân tỷ trọng theo phiếu giao nhiệm vụ. CQTT chấm trên bảng tổng hợp."
              : "Hội đồng kế thừa điểm CQTT và chỉnh tổng điểm tại đây. Template cá nhân tự phân bổ điểm theo tỷ lệ tự đánh giá, giới hạn 1–5 và khớp tổng theo tỷ trọng."}
          </p>
        </div>
        <Button variant="outline" onClick={exportData}>
          Xuất CSV
        </Button>
      </div>
      {!isKpi && (
        <div className="flex flex-wrap gap-3">
          {counts.map((c) => (
            <div key={c.ki} className="rounded-md border px-4 py-2 text-sm">
              Ki {c.ki}: <b>{c.n}</b>{" "}
              <span className="text-muted-foreground">
                {c.ki !== "K" && `(${denominator ? Math.round((c.n / denominator) * 100) : 0}%)`}
              </span>
            </div>
          ))}
          <p className="w-full text-xs text-muted-foreground">
            Tỷ lệ tính trên số người đã xếp Ki, loại trừ Ki K.
          </p>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-muted">
            <tr>
              {(isKpi
                ? [
                    "CQĐV/CQ · Cá nhân",
                    "Tự ĐG trọng tâm",
                    "Tự ĐG chức năng",
                    "Tổng tự ĐG",
                    "CQTT trọng tâm",
                    "CQTT chức năng",
                    "Tổng CQTT",
                    "Góp ý / Phản hồi",
                    "Thao tác",
                  ]
                : [
                    "CQĐV/CQ · Cá nhân",
                    "Điểm CQTT",
                    "Điểm đánh giá",
                    "Xếp loại",
                    "Tuân thủ địa điểm",
                    "Tuân thủ nội quy",
                    "Ki",
                    "Mức độ hoàn thành / Kiểm tra",
                    "Thao tác",
                  ]
              ).map((h) => (
                <th className="px-3 py-3 font-medium" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {evaluations.map((e) => (
              <AggregateRow
                key={`${mode}-${e.id}-${e.updated}-${e.step}`}
                evaluation={e}
                mode={mode}
                onDraftChange={onDraftChange}
              />
            ))}
            {!evaluations.length && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted-foreground">
                  Không có hồ sơ phù hợp
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function AggregateRow({
  evaluation: e,
  mode,
  onDraftChange,
}: {
  onDraftChange?: ((draft: Draft) => void) | undefined;
  evaluation: Evaluation;
  mode: "kpi" | "ki" | "appendix";
}) {
  const { previewRole, updateEvaluation } = useEvaluations();
  const isKpi = mode === "kpi";
  const editable = isKpi
    ? previewRole === "cqtt" && e.step === "cqtt"
    : mode === "ki" && previewRole === "council" && ["council", "council_adjust"].includes(e.step);
  const [draft, setDraft] = useState<Draft>({});
  const [error, setError] = useState("");
  const change = (patch: Draft) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onDraftChange?.(next);
  };
  const current = { ...e, ...draft };
  const result = templateResult(current);
  const numeric = (key: "cqttKey" | "cqttFunction" | "councilScore", label: string) => (
    <input
      aria-label={`${label} ${e.id}`}
      className={fieldClass + " w-24"}
      type="number"
      step="0.01"
      min={key === "councilScore" ? 1 : 0}
      max={5}
      disabled={!editable}
      value={current[key] ?? ""}
      onChange={(event) =>
        change({ [key]: event.target.value === "" ? undefined : Number(event.target.value) })
      }
    />
  );
  const choose = (
    key: "ki" | "locationCompliance" | "laborCompliance",
    choices: string[],
    label: string,
  ) => (
    <select
      aria-label={`${label} ${e.id}`}
      disabled={!editable}
      className={fieldClass + (key === "laborCompliance" ? " w-52" : " w-36")}
      value={current[key] ?? ""}
      onChange={(event) =>
        change({
          [key]: event.target.value,
          ...(key === "ki" && event.target.value === "K" ? { councilScore: undefined } : {}),
        })
      }
    >
      <option value="">Chọn</option>
      {choices.map((choice) => (
        <option key={choice}>{choice}</option>
      ))}
    </select>
  );
  const cell = "px-3 py-3 align-top";
  return (
    <tr className="border-t">
      <td className={cell}>
        <Link
          to="/danh-gia/$id"
          params={{ id: e.id }}
          className="font-medium text-primary hover:underline"
        >
          {e.owner}
        </Link>
        <div className="mt-1 text-xs">{e.unit}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {e.employeeId ?? "—"} · {e.jobTitle ?? "—"}
        </div>
        {mode === "appendix" && (
          <div className="mt-1 text-xs text-muted-foreground">{appendixFor(e)}</div>
        )}
      </td>
      {isKpi ? (
        <>
          <td className={cell}>{number(groupScore(e, true))}</td>
          <td className={cell}>{number(groupScore(e, false))}</td>
          <td className={cell}>{number(groupScore(e, true) + groupScore(e, false))}</td>
          <td className={cell}>{numeric("cqttKey", "Điểm CQTT trọng tâm")}</td>
          <td className={cell}>{numeric("cqttFunction", "Điểm CQTT chức năng")}</td>
          <td className={cell}>{number(cqttTotal(current))}</td>
          <td className={cell}>
            <textarea
              aria-label={`Góp ý CQTT ${e.id}`}
              disabled={!editable}
              className={fieldClass + " h-20 w-60"}
              value={current.note ?? ""}
              onChange={(event) => change({ note: event.target.value })}
            />
            <div className="mt-2 text-xs">
              {e.response ? `${e.response}: ${e.responseNote}` : "Chưa có phản hồi"}
            </div>
          </td>
        </>
      ) : (
        <>
          <td className={cell}>{number(cqttTotal(e))}</td>
          <td className={cell}>{numeric("councilScore", "Điểm đánh giá")}</td>
          <td className={cell}>{result.rating}</td>
          <td className={cell}>
            {choose("locationCompliance", ["Tuân thủ", "Không tuân thủ"], "Tuân thủ địa điểm")}
          </td>
          <td className={cell}>{choose("laborCompliance", LABOR, "Tuân thủ nội quy")}</td>
          <td className={cell}>{choose("ki", KI, "Xếp Ki")}</td>
          <td className={cell}>
            <div>{result.completion}</div>
            {["council", "council_adjust", "ceo"].includes(e.step) && (
              <p className="mt-1 text-xs text-primary">{kiError(current)}</p>
            )}
          </td>
        </>
      )}
      <td className={cell}>
        {editable && (
          <Button
            variant="outline"
            onClick={() => {
              const issue = updateEvaluation(e.id, draft);
              setError(issue ?? "Đã lưu");
            }}
          >
            Lưu dòng
          </Button>
        )}
        <Link to="/danh-gia/$id" params={{ id: e.id }} className="mt-2 block text-xs text-primary">
          Mở hồ sơ
        </Link>
        {error && (
          <p role="status" className="mt-2 text-xs">
            {error}
          </p>
        )}
      </td>
    </tr>
  );
}
