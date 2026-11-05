import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { EvaluationDateInput } from "@/components/EvaluationDateInput";

it("opens a large Vietnamese calendar and returns a local ISO date", () => {
  const onChange = vi.fn();
  render(<EvaluationDateInput label="Ngày đánh giá" value="2026-11-04" onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Chọn ngày đánh giá" }));
  const grid = screen.getByRole("grid");
  expect(grid.closest('[data-slot="calendar"]')).toHaveClass("[--cell-size:2.25rem]");
  expect(screen.getByText("CN")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Thứ Năm, ngày 5 tháng 11 năm 2026/ }));
  expect(onChange).toHaveBeenCalledWith("2026-11-05");
  expect(screen.queryByRole("grid")).not.toBeInTheDocument();
});
