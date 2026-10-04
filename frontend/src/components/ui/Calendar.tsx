"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "./Button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  navLayout = "around",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      navLayout={navLayout}
      className={cn("group/calendar w-full bg-background p-3 [--cell-size:2.75rem]", className)}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-full", defaults.root),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaults.months),
        month: cn("relative flex w-full flex-col gap-3", defaults.month),
        nav: cn("absolute inset-x-0 top-0 flex w-full justify-between gap-1", defaults.nav),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-[--cell-size] min-h-0 w-[--cell-size] p-0 aria-disabled:opacity-40",
          navLayout === "around" && "absolute left-0 top-0",
          defaults.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-[--cell-size] min-h-0 w-[--cell-size] p-0 aria-disabled:opacity-40",
          navLayout === "around" && "absolute right-0 top-0",
          defaults.button_next,
        ),
        month_caption: cn("flex h-[--cell-size] items-center justify-center px-[--cell-size]", defaults.month_caption),
        dropdowns: cn("flex h-[--cell-size] items-center justify-center gap-2 text-sm font-medium", defaults.dropdowns),
        dropdown_root: cn("relative rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1", defaults.dropdown_root),
        dropdown: cn("absolute inset-0 h-full w-full cursor-pointer bg-popover text-sm opacity-0", defaults.dropdown),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "pointer-events-none flex h-[--cell-size] items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-muted-foreground",
          defaults.caption_label,
        ),
        month_grid: cn("w-full border-collapse", defaults.month_grid),
        weekdays: cn("flex", defaults.weekdays),
        weekday: cn("flex-1 py-1 text-center text-xs font-medium text-muted-foreground", defaults.weekday),
        week: cn("flex w-full", defaults.week),
        week_number_header: cn("w-[--cell-size]", defaults.week_number_header),
        week_number: cn("text-xs text-muted-foreground", defaults.week_number),
        day: cn("group/day relative w-full p-0 text-center", defaults.day),
        range_start: cn("rounded-l-md bg-accent", defaults.range_start),
        range_middle: cn("rounded-none bg-accent", defaults.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaults.range_end),
        today: cn("rounded-md bg-accent text-accent-foreground", defaults.today),
        outside: cn("text-muted-foreground", defaults.outside),
        disabled: cn("text-muted-foreground opacity-40", defaults.disabled),
        hidden: cn("invisible", defaults.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...rootProps }) => (
          <div data-slot="calendar" ref={rootRef} className={className} {...rootProps} />
        ),
        Chevron: ({ className, orientation, ...chevronProps }) => {
          const Icon = orientation === "left" ? ChevronLeft : orientation === "right" ? ChevronRight : ChevronDown;
          return <Icon className={cn("h-4 w-4", className)} {...chevronProps} />;
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle}
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "h-[--cell-size] min-h-0 w-full min-w-0 rounded-md p-0 text-sm font-normal text-inherit md:h-[--cell-size] md:w-full",
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[selected-single=true]:hover:bg-brand-800 data-[selected-single=true]:hover:text-primary-foreground",
        "data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-accent",
        "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10",
        getDefaultClassNames().day_button,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
