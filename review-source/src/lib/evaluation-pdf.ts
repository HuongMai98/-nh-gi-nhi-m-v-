import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import { cqttTaskScores, cqttTotal, groupScore, rating, templateResult, totalScore, type Evaluation } from "./evaluation";

export type EvaluationPdfMode = "personal" | "kpi" | "ki";
const RED = "#c00000";
const number = (value: number | null | undefined) => value == null ? "—" : value.toFixed(2);
const text = (value: unknown) => value == null || value === "" ? "—" : String(value);
const date = (value?: string) => value ? value.split("-").reverse().join("/") : "—";
const header = (value: string, span = 1, rowSpan = 1): TableCell => ({ text: value, bold: true, color: "#ffffff", fillColor: RED, alignment: "center", colSpan: span, rowSpan });
const merged = (value: string, columns: number, fillColor = "#e7e6e6"): TableCell[] => [{ text: value, colSpan: columns, bold: true, fillColor }, ...Array.from({ length: columns - 1 }, () => ({}))];
function table(body: TableCell[][], weights: number[], headerRows = 1, fontSize = 8): Content {
  const usable = 793.89 - weights.length * 5 - 1;
  const sum = weights.reduce((a, b) => a + b, 0);
  return { fontSize, margin: [0, 6, 0, 10], table: { headerRows, dontBreakRows: true, widths: weights.map(w => usable * w / sum), body }, layout: {
    hLineWidth: () => 0.5, vLineWidth: () => 0.5,
    hLineColor: () => "#555555", vLineColor: () => "#555555",
    paddingLeft: () => 2.5, paddingRight: () => 2.5, paddingTop: () => 2.5, paddingBottom: () => 2.5,
  } };
}
function letterhead(unit: string): Content {
  return { columns: [
    { width: "50%", alignment: "center", bold: true, stack: ["TẬP ĐOÀN CÔNG NGHIỆP - VIỄN THÔNG QUÂN ĐỘI", unit.toLocaleUpperCase("vi")] },
    { width: "50%", alignment: "center", stack: [{ text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold: true }, { text: "Độc lập - Tự do - Hạnh phúc", bold: true }] },
  ], margin: [0, 0, 0, 8] };
}
function title(value: string, evaluations: Evaluation[]): Content[] {
  return [{ text: value, bold: true, fontSize: 13, alignment: "center", margin: [0, 4, 0, 6] },
    { text: `Kỳ đánh giá: ${[...new Set(evaluations.map(e => e.period))].join(", ")}`, alignment: "center", margin: [0, 0, 0, 6] }];
}
const section = (value: string): Content => ({ text: value, bold: true, margin: [0, 4, 0, 3] });
function personal(e: Evaluation): Content[] {
  const qltt = ["council", "council_adjust", "ceo", "approved", "dispatch", "sign", "done"].includes(e.step)
    ? e.criteria.map(c => c.council ?? null) : cqttTaskScores(e.criteria, cqttTotal(e));
  const qlttComplete = !!qltt?.length && qltt.every(v => v !== null);
  const qlttTotal = qlttComplete ? Math.round(e.criteria.reduce((sum, c, i) => sum + c.weight * qltt![i]!, 0) * 100) / 100 : null;
  const body: TableCell[][] = [
    [header("STT", 1, 2), header("TT", 1, 2), header("Mục tiêu nhiệm vụ/công việc\n(Kết quả mong đợi đối với nhiệm vụ/công việc)", 1, 2), header("Chỉ số đo lường KPI", 1, 2), header("Phương pháp đo\n(công thức hoặc mô tả cách tính)", 1, 2), header("Đơn vị đo\n($, số lượng, %, điểm, …)", 1, 2), header("Tỷ trọng\n(%)", 1, 2), header("Các mức chỉ tiêu", 3), {}, {}, header("Ngày bắt đầu", 1, 2), header("Ngày hoàn thành", 1, 2), header("Đánh giá kết quả thực hiện mục tiêu nhiệm vụ/công việc", 3), {}, {}],
    [{}, {}, {}, {}, {}, {}, {}, header("Tối thiểu\n(T - Threshold)"), header("Mong đợi\n(B - Base)"), header("Thách thức\n(S - Stretch)"), {}, {}, header("Kết quả thực hiện"), header("CBNV tự đánh giá\n(Điểm 1-5)"), header("QLTT đánh giá\n(Điểm 1-5)")],
  ];
  let ordinal = 0;
  for (const [group, label] of [["A", "A. Nhóm mục tiêu theo nhiệm vụ trọng tâm, trọng điểm"], ["B-I", "I. Mục tiêu theo chức năng"], ["B-II", "II. Chỉ số kiểm soát ngành dọc"]] as const) {
    if (group === "B-I") body.push(merged("B. Nhóm mục tiêu theo chức năng", 15));
    body.push(merged(label, 15));
    e.criteria.map((c, i) => ({ c, i })).filter(({ c }) => c.group === group).forEach(({ c, i }, local) => {
      body.push([++ordinal, local + 1, c.goal, c.kpi, text(c.method), c.unit, `${Math.round(c.weight * 100)}%`, c.target.t, c.target.b, c.target.s, date(c.startDate), date(c.endDate), text(c.result), c.self || "—", number(qltt?.[i])].map((value, column) => ({ text: String(value), alignment: column === 2 || column === 3 || column === 4 || column === 12 ? "left" : "center" })));
    });
  }
  body.push([...merged("Tổng điểm (Ʃ Tỷ trọng * Điểm)", 13), { text: number(totalScore(e.criteria)), bold: true, alignment: "center" }, { text: number(qlttTotal), bold: true, alignment: "center" }]);
  body.push([...merged("Xếp loại kết quả thực hiện mục tiêu nhiệm vụ", 14, "#ffffff"), { text: qlttTotal === null ? "—" : rating(qlttTotal).label, alignment: "center", bold: true }]);
  return [letterhead(e.unit), ...title("PHIẾU ĐÁNH GIÁ KẾT QUẢ THỰC HIỆN NHIỆM VỤ/CÔNG VIỆC", [e]),
    section("1. THÔNG TIN CHUNG"),
    { columns: [{ stack: [`Họ và tên: ${e.owner}`, `Mã nhân viên: ${text(e.employeeId)}`, `Địa điểm làm việc: ${text(e.location)}`] }, { stack: [`Chức danh: ${text(e.jobTitle)}`, `Đơn vị: ${e.unit}`, `Mã phiếu: ${e.id}`] }], margin: [0, 2, 0, 8] },
    section("2. ĐÁNH GIÁ VỀ KẾT QUẢ THỰC HIỆN NHIỆM VỤ, CÔNG VIỆC"),
    table(body, [3, 3, 21, 13, 12, 7, 5, 7, 7, 7, 8, 8, 16, 7, 7], 2, 7),
    section("3. ĐÁNH GIÁ TUÂN THỦ"),
    table([[header("Nội dung đánh giá"), header("Đánh giá của QLTT")], ["- Tuân thủ địa điểm làm việc:", text(e.locationCompliance)], ["- Tuân thủ nội quy lao động:", text(e.laborCompliance)], ["- Tuân thủ văn hóa Viettel:", text(e.cultureCompliance)]], [1, 1]),
    { unbreakable: true, columns: [{ text: "NGƯỜI NHẬN NHIỆM VỤ\n\n" + e.owner, bold: true, alignment: "center" }, { text: "THỦ TRƯỞNG GIAO NHIỆM VỤ\n\n", bold: true, alignment: "center" }], margin: [0, 10, 0, 0] },
  ];
}
function distribution(evaluations: Evaluation[], mode: "ki" | "kpi"): Content {
  const kis = ["A+", "A", "B", "C", "D", "K"];
  const values = evaluations.map(e => mode === "kpi" ? e.proposedKi : templateResult(e).ki);
  const denominator = values.filter(ki => ki && ki !== "K" && ki !== "—").length;
  return table([[header("Xếp hạng Ki"), header("Tỷ lệ xếp hạng Ki"), header("Số người")], ...kis.map(ki => {
    const count = values.filter(value => value === ki).length;
    return [ki, ki === "K" ? "—" : `${denominator ? (count / denominator * 100).toFixed(2) : "0.00"}%`, String(count)];
  }), ["Tổng:", denominator ? "100%" : "0%", String(values.filter(value => value && value !== "—").length)]], [1, 1, 1]);
}
function summary(evaluations: Evaluation[], mode: "ki" | "kpi"): Content[] {
  const isKi = mode === "ki";
  const content: Content[] = [];
  if (isKi) content.push(letterhead([...new Set(evaluations.map(e => e.unit))].length === 1 ? evaluations[0]!.unit : "HỘI ĐỒNG ĐÁNH GIÁ"),
    { text: "PHÊ DUYỆT\n\n\nTỔNG GIÁM ĐỐC", alignment: "center", bold: true, margin: [0, 0, 0, 10] });
  if (isKi) content.push(...title("TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ VÀ XẾP HẠNG KI CỦA CHỈ HUY CƠ QUAN, ĐƠN VỊ", evaluations), section("I. TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ, XẾP HẠNG"), distribution(evaluations, mode), section("II. DANH SÁCH CHI TIẾT"));
  else content.push(...title("TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ VÀ XẾP HẠNG KI CỦA CHỈ HUY CƠ QUAN TẬP ĐOÀN", evaluations));
  if (isKi) {
    content.push(table([
      ["TT", "Mã nhân viên", "Họ và tên", "Chức danh", "Đơn vị", "Điểm đánh giá", "Xếp loại kết quả thực hiện mục tiêu nhiệm vụ/công việc", "Tuân thủ địa điểm làm việc", "Tuân thủ nội quy lao động", "Xếp hạng Ki", "Xếp loại mức độ hoàn thành nhiệm vụ/công việc", "Ghi chú"].map(h => header(h)),
      ...evaluations.map((e, i) => { const r = templateResult(e); return [i + 1, text(e.employeeId), e.owner, text(e.jobTitle), e.unit, number(r.score), r.rating, text(e.locationCompliance), text(e.laborCompliance), r.ki, r.completion, text(e.note)].map(v => ({ text: String(v) })); }),
    ], [3, 7, 13, 10, 15, 6, 12, 9, 11, 5, 12, 8], 1, 8));
    content.push({ text: "CHÁNH VĂN PHÒNG\n\n\n\n", alignment: "right", bold: true, margin: [0, 12, 30, 0] });
  } else {
    content.push(table([
      [header("TT", 1, 2), header("Mã số", 1, 2), header("Họ và tên", 1, 2), header("Cơ quan"), header("Điểm CQ tự đánh giá", 3), {}, {}, header("Thường trực đánh giá", 3), {}, {}, header("Lý do", 1, 2), header("Đề xuất xếp hạng Ki", 1, 2), header("Trợ lý", 1, 2), header("Ghi chú", 1, 2)],
      [{}, {}, {}, header("Đơn vị"), header("NV trọng yếu\n(20%)"), header("NV chức năng\n(80%)"), header("Tổng"), header("NV trọng yếu\n(20%)"), header("NV chức năng\n(80%)"), header("Tổng"), {}, {}, {}, {}],
      ...evaluations.map((e, i) => [i + 1, text(e.employeeId), e.owner, e.unit, number(groupScore(e, true)), number(groupScore(e, false)), number(totalScore(e.criteria)), number(e.cqttKey), number(e.cqttFunction), number(cqttTotal(e)), text(e.note), text(e.proposedKi), text(e.reviewAssistant), text(e.reviewRemark)].map(v => ({ text: String(v) }))),
    ], [3, 6, 14, 14, 7, 7, 7, 7, 7, 7, 54, 12, 9, 12], 2, 7));

  }
  return content;
}

export function buildEvaluationPdf(evaluations: Evaluation[], mode: EvaluationPdfMode): TDocumentDefinitions {
  if (!evaluations.length) throw new Error("Không có dữ liệu để xuất PDF.");
  const content: Content[] = mode === "personal" ? evaluations.flatMap((e, i) => [ ...(i ? [{ text: "", pageBreak: "before" as const }] : []), ...personal(e) ]) : summary(evaluations, mode);
  return { pageSize: "A4", pageOrientation: "landscape", pageMargins: [24, 24, 24, 28], defaultStyle: { font: "Tinos", fontSize: 9 }, content,
    info: { title: mode === "personal" ? "Phiếu đánh giá" : mode === "ki" ? "Tổng hợp Ki" : "Tổng hợp đánh giá" },
    footer: (page, pages) => ({ text: `${page} / ${pages}`, alignment: "right", margin: [0, 5, 24, 0], fontSize: 8 }),
  };
}

function assignment(e: Evaluation): Content[] {
  const body: TableCell[][] = [
    ["STT", "TT", "Mục tiêu nhiệm vụ/công việc\n(Kết quả mong đợi đối với nhiệm vụ/công việc)", "Chỉ số đo lường KPI", "Phương pháp đo", "Đơn vị đo", "Tỷ trọng (%)", "Tối thiểu\n(T - Threshold)", "Mong đợi\n(B - Base)", "Thách thức\n(S - Stretch)", "Ngày bắt đầu", "Ngày hoàn thành", "Mức độ mới/khó\nVị trí trên ma trận", "Lý do", "Phạm vi tác động/tính chất trọng yếu\nVị trí trên ma trận", "Lý do", "Nhóm mục tiêu trọng điểm đề xuất"].map(v => header(v)),
  ];
  let ordinal = 0;
  for (const [group, label] of [["A", "A. Nhóm mục tiêu theo nhiệm vụ trọng tâm, trọng điểm"], ["B-I", "I. Mục tiêu theo chức năng"], ["B-II", "II. Chỉ số kiểm soát ngành dọc"]] as const) {
    if (group === "B-I") body.push(merged("B. Nhóm mục tiêu theo chức năng", 17));
    body.push(merged(label, 17));
    e.criteria.filter(c => c.group === group).forEach((c, i) => body.push([++ordinal, i + 1, c.goal, c.kpi, text(c.method), c.unit, `${Math.round(c.weight * 100)}%`, c.target.t, c.target.b, c.target.s, date(c.startDate), date(c.endDate), "", "", "", "", ""].map(v => ({ text: String(v) }))));
  }
  body.push(merged(`Tổng tỷ trọng: ${Math.round(e.criteria.reduce((s,c) => s+c.weight,0)*100)}%`,17));
  const parts = personal(e);
  return [parts[0]!, ...title("PHIẾU GIAO NHIỆM VỤ/CÔNG VIỆC", [e]), parts[3]!, parts[4]!, section("2. NỘI DUNG CỤ THỂ"), table(body,[3,3,18,11,9,5,5,6,6,6,7,7,8,7,9,7,8],1,6.5), parts[parts.length-1]!];
}
export function buildSigningDossierPdf(evaluations: Evaluation[]): TDocumentDefinitions {
  if (!evaluations.length) throw new Error("Không có hồ sơ để trình ký.");
  const documents: Content[][] = evaluations.flatMap(e => [assignment(e), personal(e)]);
  documents.push(summary(evaluations, "ki"));
  return { ...buildEvaluationPdf(evaluations,"ki"), info: { title: "Hồ sơ trình ký GĐ — Phiếu GNV, Phiếu đánh giá, Tổng hợp KI" }, content: documents.flatMap((parts,i) => [...(i ? [{ text:"", pageBreak:"before" as const }] : []), ...parts]) };
}