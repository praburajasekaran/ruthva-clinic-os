"use client";

import { type InputHTMLAttributes, forwardRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError = false, className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`h-11 w-full rounded-lg border px-3 text-base placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:text-gray-500 ${
          hasError
            ? "border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500"
            : "border-gray-300 focus-visible:border-emerald-500 focus-visible:ring-emerald-500"
        } ${className}`}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
