"use client";

type SpinnerSize = "sm" | "md" | "lg";

const sizeStyles: Record<SpinnerSize, string> = {
  sm: "h-5 w-5 border-2",
  md: "h-8 w-8 border-4",
  lg: "h-12 w-12 border-4",
};

type SpinnerProps = {
  size?: SpinnerSize;
  label?: string;
};

/**
 * Accessible loading spinner.
 * - `role="status"` announces completion to screen readers.
 * - `motion-safe:animate-spin` respects prefers-reduced-motion.
 * - Visible label via `sr-only` span, customisable via `label` prop.
 */
export function Spinner({ size = "md", label = "Loading…" }: SpinnerProps) {
  return (
    <div role="status" className="flex items-center justify-center">
      <div
        className={`${sizeStyles[size]} motion-safe:animate-spin rounded-full border-emerald-200 border-t-emerald-600`}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
