"use client";

import { useState, useRef, useEffect, type ChangeEvent } from "react";
import {
  format,
  parse,
  isValid,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export function DatePicker({ value, onChange, id, ...ariaProps }: DatePickerProps) {
  const initialDate = value ? parse(value, "yyyy-MM-dd", new Date()) : new Date();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(startOfMonth(initialDate));
  const [draft, setDraft] = useState<Date>(isValid(initialDate) ? initialDate : new Date());
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft and input when popover opens
  useEffect(() => {
    if (open) {
      const d = value ? parse(value, "yyyy-MM-dd", new Date()) : new Date();
      const valid = isValid(d) ? d : new Date();
      setDraft(valid);
      setViewMonth(startOfMonth(valid));
      setInputValue(format(valid, "M/d/yyyy"));
    }
  }, [open, value]);

  const handleApply = () => {
    onChange(format(draft, "yyyy-MM-dd"));
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const handleDayClick = (day: Date) => {
    setDraft(day);
    setInputValue(format(day, "M/d/yyyy"));
  };

  const handleToday = () => {
    const today = new Date();
    setDraft(today);
    setViewMonth(startOfMonth(today));
    setInputValue(format(today, "M/d/yyyy"));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    const parsed = parse(v, "M/d/yyyy", new Date());
    if (isValid(parsed) && parsed.getFullYear() > 1900) {
      setDraft(parsed);
      setViewMonth(startOfMonth(parsed));
    }
  };

  const displayValue = value
    ? format(parse(value, "yyyy-MM-dd", new Date()), "MMM d, yyyy")
    : "Pick a date";

  // Build calendar grid
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 h-11 text-base",
            "hover:bg-accent/50 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
          {...ariaProps}
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {displayValue}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[320px] font-sans" align="start">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={() => setViewMonth(subMonths(viewMonth, 1))}
            className="p-2.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-foreground">
            {format(viewMonth, "MMMM yyyy")}
          </span>
          <button
            type="button"
            onClick={() => setViewMonth(addMonths(viewMonth, 1))}
            className="p-2.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Date input + Today button */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="M/D/YYYY"
            className={cn(
              "flex-1 h-9 rounded-md border border-border bg-background px-3 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            )}
          />
          <button
            type="button"
            onClick={handleToday}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent transition-colors"
          >
            Today
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 px-3 pb-1">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 px-3 pb-3">
          {days.map((day) => {
            const selected = isSameDay(day, draft);
            const inMonth = isSameMonth(day, viewMonth);
            const today = isToday(day);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handleDayClick(day)}
                className={cn(
                  "relative h-10 w-full rounded-full text-sm transition-colors min-h-[44px]",
                  "hover:bg-brand-50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !inMonth && "text-muted-foreground/40",
                  inMonth && !selected && "text-foreground",
                  selected && "bg-primary text-primary-foreground font-semibold hover:bg-brand-800",
                )}
              >
                {format(day, "d")}
                {today && !selected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-brand-500" />
                )}
                {today && selected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={handleCancel}
            className="h-11 px-4 rounded-lg border border-border bg-background text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="h-11 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-brand-800 transition-colors"
          >
            Apply
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
