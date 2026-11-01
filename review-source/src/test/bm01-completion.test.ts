import { expect, it } from "vitest";
import { EVALUATIONS, templateResult, kiError } from "@/lib/evaluation";
it("matches BM01 completion and validation formulas", () => {
  const e = { ...EVALUATIONS[1]!, councilReviewed: true };
  expect(templateResult({ ...e, ki: "K", councilScore: undefined }).completion).toBe("Không đánh giá");
  expect(templateResult({ ...e, ki: "A", councilScore: 4 }).completion).toBe("Hoàn thành NV/CV");
  expect(templateResult({ ...e, ki: "D", councilScore: 2.4 }).completion).toBe("Không hoàn thành NV/CV");
  expect(templateResult({ ...e, ki: "D", councilScore: 4, locationCompliance: "Không tuân thủ" }).completion).toBe("Không hoàn thành NV/CV");
  expect(templateResult({ ...e, ki: "D", councilScore: 4, laborCompliance: "Vi phạm nhưng chưa đến mức bị xử lý kỷ luật" }).completion).toBe("Không hoàn thành NV/CV");
  expect(templateResult({ ...e, ki: "D", councilScore: 4 }).completion).toBe("Hoàn thành NV/CV");
  expect(kiError({ ...e, ki: "A+", councilScore: 3 })).not.toBe("");
});
