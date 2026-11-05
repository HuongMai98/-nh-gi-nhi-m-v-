import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ListPagination } from "@/components/ListPagination";

it("shows ranges, navigates first/last pages and changes page size", () => {
  function Probe() {
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    return <ListPagination total={25} page={page} pageSize={size} onPageChange={setPage} onPageSizeChange={size => { setSize(size); setPage(1); }} />;
  }
  render(<Probe />);
  expect(screen.getByText("Hiển thị 1–10 / 25")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Trang trước" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Trang cuối" }));
  expect(screen.getByText("Hiển thị 21–25 / 25")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Trang sau" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Số dòng mỗi trang"), { target: { value: "20" } });
  expect(screen.getByText("Hiển thị 1–20 / 25")).toBeInTheDocument();
});

it("displays an empty list without an invalid page or range", () => {
  render(<ListPagination total={0} page={1} pageSize={10} onPageChange={() => {}} onPageSizeChange={() => {}} />);
  expect(screen.getByText("Hiển thị 0–0 / 0")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Trang cuối" })).toBeDisabled();
});
