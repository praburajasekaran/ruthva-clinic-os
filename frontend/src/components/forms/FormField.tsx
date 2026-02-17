"use client";

import { type ReactNode, useId } from "react";

type RenderProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid": boolean;
  "aria-required"?: boolean;
};

type FormFieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: (props: RenderProps) => ReactNode;
};

export function FormField({
  label,
  required,
  error,
  hint,
  children,
}: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span className="ml-1 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": !!error,
        "aria-required": required,
      })}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-sm text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
