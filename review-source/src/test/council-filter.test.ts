import { expect, it } from "vitest";
import { councilStatus } from "@/lib/council-filter";
it("separates council intake, CEO returns, submitted and approved records", () => {
  expect(councilStatus("council")).toBe("pending");
  expect(councilStatus("council", true)).toBe("completed");
  expect(councilStatus("council_adjust", true)).toBe("completed");
  expect(councilStatus("council_adjust")).toBe("adjustment");
  expect(councilStatus("ceo")).toBe("submitted");
  for (const step of ["approved", "dispatch", "sign", "done"] as const) expect(councilStatus(step)).toBe("approved");
  for (const step of ["self", "office", "cqtt", "response", "cqtt_report"] as const) expect(councilStatus(step)).toBeNull();
});
