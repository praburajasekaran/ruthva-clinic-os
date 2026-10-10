"use client";

import { useState } from "react";
import { format, parse, isValid, startOfMonth, isAfter, startOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";
import { Button } from "./Button";
import { Calendar } from "./Calendar";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  maxDate?: Date;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export function DatePicker({ value, onChange, maxDate, id, ...ariaProps }: DatePickerProps) {
  const today = startOfDay(new Date());
  const parsedDate = value ? parse(value, "yyyy-MM-dd", today) : undefined;
  const selectedDate = parsedDate && isValid(parsedDate) ? parsedDate : undefined;
  const lastDate = maxDate ? startOfDay(maxDate) : undefined;
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(startOfMonth(selectedDate ?? today));
  const firstYear = Math.min(today.getFullYear() - 150, viewMonth.getFullYear());
  const lastYear = Math.max(today.getFullYear() + 10, viewMonth.getFullYear());

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      const date = selectedDate ?? today;
      setViewMonth(startOfMonth(lastDate && isAfter(date, lastDate) ? lastDate : date));
    }
    setOpen(nextOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button type="button" id={id} variant="outline" className="gap-2 font-normal" {...ariaProps}>
          <CalendarIcon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          <span className={selectedDate ? "text-foreground" : "text-muted-foreground"}>
            {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Pick a date"}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        aria-label="Choose a date"
        className="max-h-[var(--radix-popover-content-available-height)] w-[320px] max-w-[calc(100vw-1rem)] overflow-y-auto font-sans"
        align="start"
        collisionPadding={8}
      >
        <Calendar
          mode="single"
          required
          captionLayout="dropdown"
          reverseYears
          month={viewMonth}
          onMonthChange={setViewMonth}
          selected={selectedDate}
          onSelect={(date) => {
            onChange(format(date, "yyyy-MM-dd"));
            setOpen(false);
          }}
          startMonth={new Date(firstYear, 0, 1)}
          endMonth={lastDate ?? new Date(lastYear, 11, 31)}
          disabled={lastDate ? { after: lastDate } : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}
