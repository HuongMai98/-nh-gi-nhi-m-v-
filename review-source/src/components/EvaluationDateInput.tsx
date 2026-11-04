import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function EvaluationDateInput({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;
  return <Popover open={open} onOpenChange={setOpen}>
    <div className="relative">
      <Input aria-label={label} required type="date" value={value} onChange={event => onChange(event.target.value)} className="min-w-0 bg-card pr-10 shadow-none [&::-webkit-calendar-picker-indicator]:hidden" />
      <PopoverTrigger asChild><button type="button" aria-label={`Chọn ${label.toLowerCase()}`} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CalendarDays className="size-4" /></button></PopoverTrigger>
    </div>
    <PopoverContent align="start" className="w-auto p-0">
      <Calendar mode="single" locale={vi} weekStartsOn={1} selected={selected} {...(selected ? { defaultMonth: selected } : {})} className="[--cell-size:2.5rem]" formatters={{ formatWeekdayName: date => date.getDay() === 0 ? "CN" : `T${date.getDay() + 1}` }} onSelect={date => { if (date) { onChange(format(date, "yyyy-MM-dd")); setOpen(false); } }} />
    </PopoverContent>
  </Popover>;
}
