import { cqttTotal, groupScore, totalScore, type Evaluation } from "./evaluation";

export function assessmentCsvRows(evaluations: Evaluation[]): (string | number | null | undefined)[][] {
  return [
    ["TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ VÀ XẾP HẠNG KI CỦA CHỈ HUY CƠ QUAN TẬP ĐOÀN"],
    [`Kỳ đánh giá: ${[...new Set(evaluations.map(e => e.period))].join(", ")}`],
    [],
    ["TT", "Mã số", "Họ và Tên", "Cơ quan", "Điểm CQ tự đánh giá", "", "", "Thường trực đánh giá", "", "", "Lý do", "Đề xuất xếp hạng Ki", "Trợ lý", "Ghi chú"],
    ["", "", "", "Đơn vị", "NV trọng yếu (20%)", "NV chức năng (80%)", "Tổng", "NV trọng yếu (20%)", "NV chức năng (80%)", "Tổng", "", "", "", ""],
    ...evaluations.map((e, i) => [i + 1, e.employeeId, e.owner, e.unit, groupScore(e, true), groupScore(e, false), totalScore(e.criteria), e.cqttKey, e.cqttFunction, cqttTotal(e), e.note, e.proposedKi, e.reviewAssistant, e.reviewRemark]),
  ];
}