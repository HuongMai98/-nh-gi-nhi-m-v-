import { describe, expect, it } from "vitest";
import { EVALUATIONS, addComment, forwardOfficeBatch, supportComment, supportConfirm, supportOpinionOf, transition, statusLabelOf } from "@/lib/evaluation";
import { officeAggregationStatus, supportStatus } from "@/lib/office-filter";

const officeRecord = () => structuredClone(EVALUATIONS.find((e) => e.step === "office")!);
const atSupport = () => transition(officeRecord(), "office", "send", {}, "now");

describe("Tổ giúp việc", () => {
  it("Văn phòng thẩm định xong → Tổ giúp việc; Văn phòng (đại diện) gửi CQTT (chấm điểm, tính Ki)", () => {
    const e = atSupport();
    expect(e.step).toBe("support");
    expect(statusLabelOf(e)).toBe("Tổ giúp việc đang đánh giá");
    // Văn phòng thẩm định đã gửi xong; Văn phòng (Tổ giúp việc) mới xử lý.
    expect(officeAggregationStatus(e)).toBe("completed");
    expect(e.history?.at(-1)?.action).toBe("Gửi tổ giúp việc");
    expect(transition(e, "support_office", "send", {}, "now").step).toBe("council");
    expect(() => transition(e, "office", "send", {}, "now")).toThrow();
    expect(() => transition(e, "politics", "send", {}, "now")).toThrow();
  });

  it("Cơ quan Chính trị / Tổ chức Nhân lực / Ban Chiến lược cho ý kiến, không bắt buộc", () => {
    let e = atSupport();
    expect(supportStatus(e, "hr")).toBe("pending");
    e = supportComment(e, "hr", "Bổ sung minh chứng đào tạo", "t1");
    e = supportComment(e, "hr", "Bổ sung minh chứng đào tạo nội bộ", "t2");
    expect(e.supportOpinions).toHaveLength(1);
    expect(supportOpinionOf(e, "hr")?.note).toBe("Bổ sung minh chứng đào tạo nội bộ");
    expect(supportStatus(e, "hr")).toBe("commented");
    expect(e.history?.at(-1)?.action).toBe("Cho ý kiến — Tổ chức Nhân lực");
    expect(() => supportComment(e, "support_office", "x", "t")).toThrow();
    expect(() => supportComment(e, "strategy", "  ", "t")).toThrow(/nội dung/);
    // Không cần ý kiến vẫn gửi CQTT được; người đã cho ý kiến thấy ở "Đã gửi CQTT".
    const sent = transition(e, "support_office", "send", {}, "now");
    expect(sent.step).toBe("council");
    expect(supportStatus(sent, "hr")).toBe("sent");
  });

  it("mọi bộ phận Tổ giúp việc gửi điều chỉnh CQ/CQĐV (bắt buộc lý do)", () => {
    for (const role of ["support_office", "politics", "hr", "strategy"] as const) {
      const e = atSupport();
      expect(() => transition(e, role, "return", {}, "now")).toThrow(/lý do/);
      const back = transition(e, role, "return", { note: "Bổ sung kết quả" }, "now");
      expect(back.step).toBe("self");
      expect(statusLabelOf(back)).toBe("Chờ CQ/CQĐV phản hồi");
    }
    expect(() => transition(atSupport(), "cqtt", "return", { note: "x" }, "now")).toThrow();
    expect(() => transition(atSupport(), "office", "return", { note: "x" }, "now")).toThrow();
  });

  it("Tổng hợp đánh giá của Văn phòng gửi CQTT các phiếu ở bước Tổ giúp việc", () => {
    const e = atSupport();
    const [next] = forwardOfficeBatch([e], "support_office", [e.id], {}, "now");
    expect(next!.step).toBe("council");
    expect(() => forwardOfficeBatch([officeRecord()], "support_office", [officeRecord().id], {}, "now")).toThrow(/Tổ giúp việc/);
    expect(() => forwardOfficeBatch([e], "office", [e.id], {}, "now")).toThrow();
  });

  it("Cơ quan Chính trị / TCNL / Ban CL xác nhận đánh giá (giữ ý kiến nếu có)", () => {
    let e = supportComment(atSupport(), "strategy", "Thống nhất", "t1");
    e = supportConfirm(e, "strategy", "", "t2");
    expect(supportOpinionOf(e, "strategy")).toMatchObject({ confirmed: true, note: "Thống nhất" });
    e = supportConfirm(e, "politics", "", "t3");
    expect(supportOpinionOf(e, "politics")).toMatchObject({ confirmed: true, note: "" });
    expect(supportStatus(e, "politics")).toBe("commented");
    expect(e.history?.at(-1)?.action).toBe("Xác nhận đánh giá — Cơ quan Chính trị");
    expect(() => supportConfirm(e, "support_office", "", "t")).toThrow();
  });

  it("Ý kiến xử lý là tính năng chung: mọi vai trò, mọi bước", () => {
    const cqtt = addComment(structuredClone(EVALUATIONS.find((x) => x.step === "council")!), "council", "Lưu ý tiêu chí B.II", "t");
    expect(cqtt.history?.at(-1)).toMatchObject({ action: "Ý kiến", note: "Lưu ý tiêu chí B.II", role: "council" });
    expect(cqtt.step).toBe("council");
    const sup = addComment(atSupport(), "politics", "Thống nhất", "t");
    expect(supportOpinionOf(sup, "politics")?.note).toBe("Thống nhất");
    expect(() => addComment(atSupport(), "support_office", " ", "t")).toThrow(/nội dung/);
  });

  it("bỏ luồng CQTT gửi Hội đồng: Tổ giúp việc gửi CQTT → CQTT chấm điểm, tính Ki", () => {
    const e = transition(atSupport(), "support_office", "send", {}, "now");
    expect(e.step).toBe("council");
    expect(statusLabelOf(e)).toBe("CQTT đang đánh giá");
  });
});
