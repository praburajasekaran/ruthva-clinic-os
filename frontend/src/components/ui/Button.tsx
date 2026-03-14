"use client";

import { Loader2 } from "lucide-react";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-700 text-white shadow-[0_10px_30px_rgba(16,36,24,0.14)] hover:bg-brand-900 active:bg-brand-900 focus-visible:ring-brand-500",
  secondary:
    "border border-border bg-surface text-text-primary shadow-sm hover:border-brand-200 hover:bg-brand-50 focus-visible:ring-brand-500",
  ghost:
    "text-text-secondary hover:bg-brand-50 hover:text-brand-900 focus-visible:ring-brand-500",
  danger:
    "bg-danger text-white shadow-sm hover:opacity-95 focus-visible:ring-danger",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-base",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      className = "",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        aria-busy={isLoading}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
