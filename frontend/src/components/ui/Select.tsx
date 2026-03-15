"use client";

import { ChevronDown } from "lucide-react";
import { type SelectHTMLAttributes, forwardRef } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  hasError?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ hasError = false, className = "", children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={`h-11 w-full appearance-none rounded-lg border bg-white px-3 pr-10 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:text-gray-500 ${
            hasError
              ? "border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500"
              : "border-gray-300 focus-visible:border-emerald-500 focus-visible:ring-emerald-500"
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
    );
  },
);

Select.displayName = "Select";
